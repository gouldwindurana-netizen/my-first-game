#!/usr/bin/env python3
"""Normalize whole-cycle imagegen sheets, preserving one shared scale per character.

Usage: python3 scripts/normalize-walk-cycles.py [--raw-dir artifacts/walk-generated]
Requires Pillow, NumPy and SciPy. This optional authoring script is not a build step.
Eight distinct connected character silhouettes are extracted from a 4x2 source grid.
It removes only the generated transparent-background haze and normalizes the assets;
it does not invent walking poses by transforming the original static illustrations.
"""
from pathlib import Path
import argparse
import hashlib
import json
import math
from io import BytesIO
from tempfile import NamedTemporaryFile
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import label, find_objects, binary_dilation

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--raw-dir', type=Path, default=ROOT / 'artifacts/walk-generated')
args = parser.parse_args()
OUT = ROOT / 'src/assets/pack'
PREVIEW = ROOT / 'artifacts/walk-previews'
PREVIEW.mkdir(parents=True, exist_ok=True)
KINDS = ('grunt', 'runner', 'brute', 'boss')
# Shared anatomical horizontal offsets from the source slot center. The runner's
# trailing cape extends behind its torso; the other characters stay near center.
OFFSETS = {'grunt': 0, 'runner': 42, 'brute': 0, 'boss': 20}
CELL = 192
FOOT = 184
metadata = {'frameWidth': CELL, 'frameHeight': CELL, 'frameCount': 8,
            'origin': {'x': .5, 'y': FOOT / CELL}, 'units': {}}
provenance = {'version': 1, 'method': 'Eight distinct whole-cycle imagegen poses per supplied enemy seed; fixed-scale anchor normalization.',
              'layout': '8 horizontal frames, 192 x 192 pixels, ground anchor (96,184)',
              'sourceAtlas': 'enemy-roster.webp', 'generationTool': 'image_gen.imagegen',
              'generationRequest': 'One eight-frame 4x2 sheet per approved seed; fixed right-facing three-quarter camera, consistent palette/costume/equipment; articulated contact/down/passing/up leg and arm poses; transparent canvas without labels.',
              'normalizationScript': 'scripts/normalize-walk-cycles.py', 'units': {}}
contact = Image.new('RGBA', (CELL * 8, CELL * 4), '#102332')
frames_by_kind = {}

def atomic_write(path, contents):
    # Readers of the dev server must never see a partially written atlas/manifest.
    with NamedTemporaryFile(dir=path.parent, prefix=path.name + '.', suffix='.tmp', delete=False) as stream:
        temporary = Path(stream.name)
        stream.write(contents)
    try:
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


for row_out, kind in enumerate(KINDS):
    path = args.raw_dir / f'{kind}.png'
    source = Image.open(path).convert('RGBA')
    rgba = np.asarray(source)
    labels, _ = label(rgba[:, :, 3] > 20)
    subjects = []
    for ident, slices in enumerate(find_objects(labels), 1):
        if slices is None or np.count_nonzero(labels[slices] == ident) < 5000:
            continue
        y_slice, x_slice = slices
        box = (x_slice.start, y_slice.start, x_slice.stop, y_slice.stop)
        center_x = (box[0] + box[2]) / 2
        center_y = (box[1] + box[3]) / 2
        col = min(3, max(0, int(center_x * 4 / source.width)))
        row = min(1, max(0, int(center_y * 2 / source.height)))
        subjects.append({'id': ident, 'box': box, 'col': col, 'row': row})
    subjects.sort(key=lambda item: (item['row'], item['col']))
    if len(subjects) != 8 or len({(s['row'], s['col']) for s in subjects}) != 8:
        raise ValueError(f'{kind}: expected exactly eight complete source-grid subjects')
    baselines = [max(s['box'][3] for s in subjects if s['row'] == row) for row in range(2)]
    normalized = []
    prepared = []
    max_side = 0
    max_height = 0
    for s in subjects:
        left, top, right, bottom = s['box']
        box = (max(0, left-2), max(0, top-2), min(source.width, right+2), min(source.height, bottom+2))
        l, t, r, b = box
        part = rgba[t:b, l:r].copy()
        silhouette = labels[t:b, l:r] == s['id']
        # Preserve anti-aliased contour pixels while removing distant alpha haze.
        nearby = binary_dilation(silhouette, iterations=2)
        part[:, :, 3] = np.where(nearby, part[:, :, 3], 0)
        image = Image.fromarray(part)
        slot_center = (s['col'] + .5) * source.width / 4
        anchor_x = slot_center + OFFSETS[kind]
        # The generated boss's second row faced left. Mirror that entire pose back
        # to the approved right-facing direction, retaining equipment handedness.
        flip = kind == 'boss' and s['row'] == 1
        if flip:
            image = image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            reflected_left = 2 * slot_center - r
            reflected_right = 2 * slot_center - l
            l, r = reflected_left, reflected_right
        local_anchor = anchor_x - l
        max_side = max(max_side, local_anchor, image.width - local_anchor)
        max_height = max(max_height, baselines[s['row']] - t)
        prepared.append((image, local_anchor, baselines[s['row']] - t, flip, box))
    scale = min(168 / max_height, 88 / max_side)
    body_height = round(max_height * scale, 4)
    for index, (image, anchor_x, baseline, _, _) in enumerate(prepared):
        size = (round(image.width * scale), round(image.height * scale))
        resized = image.resize(size, Image.Resampling.LANCZOS)
        frame = Image.new('RGBA', (CELL, CELL))
        x = round(CELL / 2 - anchor_x * scale)
        y = round(FOOT - baseline * scale)
        frame.alpha_composite(resized, (x, y))
        normalized.append(frame)
        contact.alpha_composite(frame, (index * CELL, row_out * CELL))
    strip = Image.new('RGBA', (CELL * 8, CELL))
    for index, frame in enumerate(normalized):
        strip.alpha_composite(frame, (index * CELL, 0))
    destination = OUT / f'walk-{kind}.webp'
    encoded = BytesIO()
    strip.save(encoded, format='WEBP', lossless=True, quality=100, method=6)
    atomic_write(destination, encoded.getvalue())
    # Decode the shipped file to prove transparent pixels and visible art survive.
    if not np.array_equal(np.asarray(strip), np.asarray(Image.open(destination).convert('RGBA'))):
        # WebP may canonicalize hidden RGB under alpha0; only visible RGB matters.
        decoded = np.asarray(Image.open(destination).convert('RGBA'))
        original = np.asarray(strip)
        if not np.array_equal(decoded[:, :, 3], original[:, :, 3]) or not np.array_equal(decoded[original[:, :, 3] > 0], original[original[:, :, 3] > 0]):
            raise ValueError(f'{kind}: lossless visible-pixel conversion changed')
    metadata['units'][kind] = {'file': destination.name, 'texture': f'walk-{kind}', 'bodyHeight': body_height}
    provenance['units'][kind] = {'sourceSeed': f'enemy-{kind}', 'sourceSeedSha256': hashlib.sha256((ROOT / f'artifacts/walk-seeds/{kind}.png').read_bytes()).hexdigest(), 'generatedSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                                'outputSha256': hashlib.sha256(destination.read_bytes()).hexdigest(),
                                'sourceSize': list(source.size), 'sourceBoxes': [list(p[4]) for p in prepared],
                                'sharedScale': scale, 'bodyHeight': body_height,
                                'mirroredFramesToMatchFacing': [i for i, p in enumerate(prepared) if p[3]],
                                'footBaselineSourceRows': baselines}
    frames_by_kind[kind] = normalized
    # At 125ms/frame this is a readable authoring preview, not runtime timing.
    preview_frames = []
    for frame in normalized:
        preview = Image.new('RGBA', (CELL, CELL), '#102332')
        preview.alpha_composite(frame)
        preview_frames.append(preview.convert('RGB'))
    preview_frames[0].save(PREVIEW / f'{kind}.gif', save_all=True, append_images=preview_frames[1:], duration=125, loop=0)
    print(kind, 'bodyHeight', body_height, 'scale', round(scale, 4), 'bytes', destination.stat().st_size)

atomic_write(OUT / 'walk-cycles.json', (json.dumps(metadata, indent=2) + '\n').encode('utf-8'))
atomic_write(OUT / 'walk-provenance.json', (json.dumps(provenance, indent=2) + '\n').encode('utf-8'))
contact.save(PREVIEW / 'contact-sheet.png')
combined = []
for index in range(8):
    frame = Image.new('RGBA', (CELL * 4, CELL), '#102332')
    for col, kind in enumerate(KINDS):
        frame.alpha_composite(frames_by_kind[kind][index], (col * CELL, 0))
    combined.append(frame.convert('RGB'))
combined[0].save(PREVIEW / 'all-units.gif', save_all=True, append_images=combined[1:], duration=125, loop=0)
print('Contact sheet:', PREVIEW / 'contact-sheet.png')
