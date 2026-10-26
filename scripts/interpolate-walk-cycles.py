#!/usr/bin/env python3
"""Create 24-pose walking strips from eight articulated key poses.

Optional authoring tool; requires Pillow, NumPy and opencv-python-headless.
The shipped game uses the resulting WebP files and does not need Python/OpenCV.
Run with PYTHONPATH pointing to a local optional OpenCV installation if needed.
Two in-between poses per cyclic key-pose pair are generated with bidirectional
optical flow. The original images are never replaced or rigidly swayed.
"""
from __future__ import annotations

import argparse
from io import BytesIO
from pathlib import Path
from tempfile import NamedTemporaryFile
import hashlib
import json

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source-dir', type=Path, default=ROOT / 'src/assets/pack')
parser.add_argument('--output-dir', type=Path, default=ROOT / 'src/assets/pack')
parser.add_argument('--preview-dir', type=Path, default=ROOT / 'artifacts/walk24')
args = parser.parse_args()
args.output_dir.mkdir(parents=True, exist_ok=True)
args.preview_dir.mkdir(parents=True, exist_ok=True)
KINDS = ('grunt', 'runner', 'brute', 'boss')
source_metadata = json.loads((args.source_dir / 'walk-cycles.json').read_text())
WIDTH, HEIGHT = source_metadata['frameWidth'], source_metadata['frameHeight']
SOURCE_COUNT = source_metadata['frameCount']
assert SOURCE_COUNT == 8, 'Expected the reviewed eight-key-pose strips'
COUNT = 24
x_grid, y_grid = np.meshgrid(np.arange(WIDTH, dtype=np.float32), np.arange(HEIGHT, dtype=np.float32))


def atomic_write(destination: Path, contents: bytes) -> None:
    with NamedTemporaryFile(dir=destination.parent, prefix=destination.name + '.', suffix='.tmp', delete=False) as stream:
        temporary = Path(stream.name)
        stream.write(contents)
    try:
        temporary.replace(destination)
    finally:
        temporary.unlink(missing_ok=True)


def sample(image: np.ndarray, x: np.ndarray, y: np.ndarray) -> np.ndarray:
    return cv2.remap(image, x.astype(np.float32), y.astype(np.float32), cv2.INTER_LINEAR,
                     borderMode=cv2.BORDER_CONSTANT, borderValue=0)


def premultiplied(rgba: np.ndarray) -> np.ndarray:
    data = rgba.astype(np.float32) / 255
    data[:, :, :3] *= data[:, :, 3:4]
    return data


def flow_image(rgba: np.ndarray) -> np.ndarray:
    # A flat dark reference preserves alpha-contour motion while avoiding hidden RGB.
    data = premultiplied(rgba)
    composite = data[:, :, :3] + .075 * (1 - data[:, :, 3:4])
    gray = cv2.cvtColor(np.uint8(np.clip(composite, 0, 1) * 255), cv2.COLOR_RGB2GRAY)
    return np.ascontiguousarray(gray)


def dense_flow(first: np.ndarray, second: np.ndarray) -> np.ndarray:
    solver = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    solver.setFinestScale(0)
    solver.setPatchSize(8)
    solver.setPatchStride(3)
    solver.setGradientDescentIterations(32)
    solver.setVariationalRefinementIterations(8)
    field = solver.calc(flow_image(first), flow_image(second), None)
    # Prevent an uncertain background estimate from dragging a silhouette far away.
    magnitude = np.linalg.norm(field, axis=2)
    field *= np.minimum(1, 32 / np.maximum(magnitude, 1e-6))[:, :, None]
    return field.astype(np.float32)


def forward_warp(rgba: np.ndarray, field: np.ndarray, weight: float,
                 reliability: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    # Bilinear forward splatting keeps foreground contours intact when a limb
    # reveals or covers background. Inverse maps can tear at those occlusions.
    source = premultiplied(rgba)
    valid = source[:, :, 3] > .001
    target_x = x_grid + weight * field[:, :, 0]
    target_y = y_grid + weight * field[:, :, 1]
    left, top = np.floor(target_x).astype(np.int32), np.floor(target_y).astype(np.int32)
    fraction_x, fraction_y = target_x - left, target_y - top
    accumulation = np.zeros((HEIGHT * WIDTH, 4), np.float32)
    coverage = np.zeros(HEIGHT * WIDTH, np.float32)
    confidence_sum = np.zeros(HEIGHT * WIDTH, np.float32)
    for dx, dy, factor in ((0, 0, (1-fraction_x)*(1-fraction_y)),
                           (1, 0, fraction_x*(1-fraction_y)),
                           (0, 1, (1-fraction_x)*fraction_y),
                           (1, 1, fraction_x*fraction_y)):
        xx, yy = left + dx, top + dy
        inside = valid & (xx >= 0) & (xx < WIDTH) & (yy >= 0) & (yy < HEIGHT)
        index = yy[inside] * WIDTH + xx[inside]
        contribution = factor[inside].astype(np.float32)
        np.add.at(accumulation, index, source[inside] * contribution[:, None])
        np.add.at(coverage, index, contribution)
        np.add.at(confidence_sum, index, reliability[inside] * contribution)
    accumulation = accumulation.reshape(HEIGHT, WIDTH, 4)
    coverage = coverage.reshape(HEIGHT, WIDTH)
    confidence_sum = confidence_sum.reshape(HEIGHT, WIDTH)
    # Normalize compressed regions; fill tiny stretch holes from immediate
    # foreground neighbors without moving the boundary or inventing a new pose.
    normalized = accumulation / np.maximum(coverage[:, :, None], 1e-6)
    occupied = coverage > .02
    closed = cv2.morphologyEx(occupied.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8)) > 0
    holes = closed & ~occupied
    for _ in range(2):
        if not holes.any(): break
        local_weight = cv2.GaussianBlur(occupied.astype(np.float32), (3, 3), .65)
        local = cv2.GaussianBlur(normalized * occupied[:, :, None], (3, 3), .65)
        filled = local / np.maximum(local_weight[:, :, None], 1e-6)
        normalized[holes] = filled[holes]
        occupied[holes] = True
        holes = closed & ~occupied
    reliability = confidence_sum / np.maximum(coverage, 1e-6)
    return normalized, reliability


def confidence(field: np.ndarray, reverse: np.ndarray) -> np.ndarray:
    reverse_at_target = sample(reverse, x_grid + field[:, :, 0], y_grid + field[:, :, 1])
    error = np.linalg.norm(field + reverse_at_target, axis=2)
    return np.exp(-np.square(error / 3.5)).astype(np.float32)


def interpolate(first: np.ndarray, second: np.ndarray, forward: np.ndarray,
                backward: np.ndarray, conf_first: np.ndarray, conf_second: np.ndarray,
                time: float) -> np.ndarray:
    a, ca = forward_warp(first, forward, time, conf_first)
    b, cb = forward_warp(second, backward, 1 - time, conf_second)
    wa, wb = (1 - time) * np.maximum(.08, ca), time * np.maximum(.08, cb)
    # Foreground visibility wins over a background sample, preventing partially
    # transparent duplicate legs at a newly covered or revealed edge.
    wa *= a[:, :, 3]
    wb *= b[:, :, 3]
    denominator = np.maximum(wa + wb, 1e-6)
    a_color = a[:, :, :3] / np.maximum(a[:, :, 3:4], 1e-6)
    b_color = b[:, :, :3] / np.maximum(b[:, :, 3:4], 1e-6)
    color = (a_color * wa[:, :, None] + b_color * wb[:, :, None]) / denominator[:, :, None]
    alpha = np.maximum(a[:, :, 3:4], b[:, :, 3:4])
    result = np.concatenate((color, alpha), axis=2)
    result = np.uint8(np.clip(np.rint(result * 255), 0, 255))
    result[result[:, :, 3] == 0, :3] = 0
    return result


metadata = {key: value for key, value in source_metadata.items() if key != 'units'}
metadata.update({'frameCount': COUNT, 'sourceKeyframeCount': SOURCE_COUNT, 'targetFps': 24,
                 'interpolation': 'bidirectional dense optical flow, premultiplied alpha, two in-betweens per key-pose pair',
                 'units': {}})
provenance = {'version': 1, 'method': metadata['interpolation'], 'targetFps': 24,
              'sourceKeyframeCount': SOURCE_COUNT, 'outputFrameCount': COUNT,
              'authoringScript': 'scripts/interpolate-walk-cycles.py',
              'opencvVersion': cv2.__version__, 'runtimeDependency': False,
              'occlusionHandling': 'Foreground-only bilinear forward splatting, local stretch-hole repair, visibility-weighted color and foreground alpha coverage.',
              'limitations': 'Classical optical flow softens fine texture details between key poses; all original key poses remain sharp and unchanged. Review at runtime display scale.', 'units': {}}
all_frames: dict[str, list[Image.Image]] = {}
metrics = {}
for kind in KINDS:
    source_file = args.source_dir / source_metadata['units'][kind]['file']
    strip = Image.open(source_file).convert('RGBA')
    assert strip.size == (WIDTH * SOURCE_COUNT, HEIGHT)
    source_frames = [np.asarray(strip.crop((i * WIDTH, 0, (i + 1) * WIDTH, HEIGHT))) for i in range(SOURCE_COUNT)]
    output_frames = []
    flow_metrics = []
    for index, first in enumerate(source_frames):
        second = source_frames[(index + 1) % SOURCE_COUNT]
        forward, backward = dense_flow(first, second), dense_flow(second, first)
        conf_first, conf_second = confidence(forward, backward), confidence(backward, forward)
        output_frames.append(Image.fromarray(first))
        for fraction in (1 / 3, 2 / 3):
            output_frames.append(Image.fromarray(interpolate(first, second, forward, backward, conf_first, conf_second, fraction)))
        visible = first[:, :, 3] > 80
        lower = visible.copy(); lower[:int(HEIGHT * .55)] = False
        magnitude = np.linalg.norm(forward, axis=2)
        flow_metrics.append({'pair': [index, (index + 1) % SOURCE_COUNT],
                             'visibleMeanDisplacement': round(float(magnitude[visible].mean()), 4),
                             'lowerBodyMeanDisplacement': round(float(magnitude[lower].mean()), 4),
                             'meanForwardBackwardConfidence': round(float(conf_first[visible].mean()), 4)})
    destination = args.output_dir / f'walk24-{kind}.webp'
    result = Image.new('RGBA', (WIDTH * COUNT, HEIGHT))
    for index, frame in enumerate(output_frames):
        result.alpha_composite(frame, (index * WIDTH, 0))
    encoded = BytesIO(); result.save(encoded, format='WEBP', lossless=True, quality=100, method=6)
    atomic_write(destination, encoded.getvalue())
    decoded = Image.open(destination).convert('RGBA')
    for index, keyframe in enumerate(source_frames):
        preserved = np.asarray(decoded.crop((index * 3 * WIDTH, 0, (index * 3 + 1) * WIDTH, HEIGHT)))
        assert np.array_equal(preserved[:, :, 3], keyframe[:, :, 3]), f'{kind}: keyframe alpha changed'
        visible = keyframe[:, :, 3] > 0
        assert np.array_equal(preserved[visible], keyframe[visible]), f'{kind}: original keyframe pixels changed'
    hashes = {hashlib.sha256(np.asarray(frame).tobytes()).hexdigest() for frame in output_frames}
    assert len(hashes) == COUNT, f'{kind}: duplicate output frames'
    metadata['units'][kind] = {**source_metadata['units'][kind], 'file': destination.name, 'texture': f'walk24-{kind}'}
    provenance['units'][kind] = {'sourceFile': source_file.name,
                                  'sourceSha256': hashlib.sha256(source_file.read_bytes()).hexdigest(),
                                  'outputSha256': hashlib.sha256(destination.read_bytes()).hexdigest(),
                                  'keyframesPreservedAtIndices': list(range(0, COUNT, 3)), 'frameCount': COUNT,
                                  'width': result.width, 'height': result.height, 'flowMetrics': flow_metrics}
    all_frames[kind] = output_frames
    metrics[kind] = {'bytes': destination.stat().st_size, 'uniqueFrames': len(hashes), 'pairs': flow_metrics}
    print(kind, destination.stat().st_size, 'bytes,', len(hashes), 'distinct frames; original key poses preserved', flush=True)

atomic_write(args.output_dir / 'walk24-cycles.json', (json.dumps(metadata, indent=2) + '\n').encode())
atomic_write(args.output_dir / 'walk24-provenance.json', (json.dumps(provenance, indent=2) + '\n').encode())
atomic_write(args.preview_dir / 'metrics.json', (json.dumps(metrics, indent=2) + '\n').encode())
# Show source poses and all generated in-betweens in one contact sheet.
contact = Image.new('RGBA', (WIDTH * COUNT, HEIGHT * len(KINDS)), '#102332')
for row, kind in enumerate(KINDS):
    for index, frame in enumerate(all_frames[kind]): contact.alpha_composite(frame, (index * WIDTH, row * HEIGHT))
contact.save(args.preview_dir / 'all-frames.png')
# An enlarged set around the largest leg movement exposes occlusion artifacts.
detail = Image.new('RGBA', (WIDTH * 6, HEIGHT * len(KINDS)), '#102332')
for row, kind in enumerate(KINDS):
    for col, index in enumerate((9, 10, 11, 12, 13, 14)):
        detail.alpha_composite(all_frames[kind][index], (col * WIDTH, row * HEIGHT))
detail.save(args.preview_dir / 'limb-transitions.png')
combined = []
for index in range(COUNT):
    image = Image.new('RGBA', (WIDTH * len(KINDS), HEIGHT), '#102332')
    for col, kind in enumerate(KINDS): image.alpha_composite(all_frames[kind][index], (col * WIDTH, 0))
    combined.append(image.convert('RGB'))
# GIF uses centisecond timing. Alternate40/50ms durations average41.67ms (24fps).
durations = [50 if index % 6 == 5 else 40 for index in range(COUNT)]
combined[0].save(args.preview_dir / 'all-units-24fps.gif', save_all=True, append_images=combined[1:], duration=durations, loop=0)
print('Preview:', args.preview_dir / 'limb-transitions.png', flush=True)
