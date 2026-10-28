import { describe, expect, it } from 'vitest';
import { TOWER_KINDS } from '../game/catalog';
import { getTowerAsset, getTowerFrameKey, getTowerTexture, getTowerVisualKind, suppliedAtlas, towerArt } from '../asset-art';
import normalization from '../assets/towers/animated/normalization.json';
import manifest from '../assets/towers/animated/manifest.json';
import { sampleTowerAnimation } from './tower-animation';

describe('user-supplied 30 FPS tower pack', () => {
  it('maps every catalog family to its matching two matching normalized sheets', () => {
    expect(manifest.towers.map(tower => tower.id)).toEqual([...TOWER_KINDS]);
    expect(manifest).toMatchObject({ fps: 30, columns: 10, rows: 3, frameWidth: 256, frameHeight: 256, frameCount: 30, anchor: { x: .5, y: .82 } });
    expect(normalization).toMatchObject({ frameWidth: 192, frameHeight: 192, fps: 30, columns: 10, rows: 3, frameCount: 30, anchor: { x: .5, y: .82 } });
    const textures = new Set<string>();
    for (const kind of TOWER_KINDS) {
      expect(getTowerVisualKind(kind)).toBe(kind);
      for (const animation of ['idle', 'attack'] as const) {
        const asset = getTowerAsset(kind, animation);
        textures.add(asset.texture);
        expect(asset.texture).toBe(getTowerTexture(kind, animation));
        expect(asset.url).toContain(`${kind}_${animation}.webp`);
      }
      // No tier variants are supplied: upgrades must not substitute unrelated artwork.
      expect(getTowerFrameKey(kind, 1)).toBe(getTowerFrameKey(kind, 3));
    }
    expect(textures.size).toBe(34);
  });

  it('crops all 1020 poses row-major without neighboring cells and preserves the shared anchor', () => {
    for (const kind of TOWER_KINDS) for (const animation of ['idle', 'attack'] as const) for (let index = 0; index < 30; index++) {
      const frame = suppliedAtlas.frames[getTowerFrameKey(kind, 1, animation, index)];
      expect(frame).toMatchObject({ sheet: getTowerTexture(kind, animation), x: index % 10 * 192, y: Math.floor(index / 10) * 192, width: 192, height: 192, originX: .5, originY: .82 });
      expect(frame.x + frame.width).toBeLessThanOrEqual(1920); expect(frame.y + frame.height).toBeLessThanOrEqual(576);
      for (const coordinate of [frame.muzzleX, frame.muzzleY]) { expect(coordinate).toBeGreaterThanOrEqual(0); expect(coordinate).toBeLessThanOrEqual(1); }
    }
    expect(Object.values(suppliedAtlas.frames).filter(frame => frame.sheet.startsWith('supplied-towers-30fps-'))).toHaveLength(1020);
  });

  it('clips repeated static portraits independently to the first matching idle cell', () => {
    const markup = towerArt('frost', 1), repeat = towerArt('frost', 3);
    expect(markup.match(/<svg\b/g)).toHaveLength(1);
    const clip = markup.match(/<clipPath id="([^"]+)" clipPathUnits="userSpaceOnUse"/);
    expect(clip).not.toBeNull(); expect(repeat.match(/<clipPath id="([^"]+)"/)?.[1]).not.toBe(clip![1]);
    expect(markup).toContain('<rect x="0" y="0" width="192" height="192"/>');
    expect(markup).toContain(`clip-path="url(#${clip![1]})"`);
    expect(markup).toContain('data-asset="frost-idle-0"'); expect(repeat).toContain('data-tier="3"');
  });
});

describe('authored tower animation timing', () => {
  it('advances at 30 FPS, wraps idle, and plays attacks once through the recovery pose', () => {
    expect(sampleTowerAnimation(0, -1)).toEqual({ animation: 'idle', frame: 0 });
    expect(sampleTowerAnimation(1 / 30, -1)).toEqual({ animation: 'idle', frame: 1 });
    expect(sampleTowerAnimation(1, -1)).toEqual({ animation: 'idle', frame: 0 });
    expect(sampleTowerAnimation(0, 9 / 30)).toEqual({ animation: 'attack', frame: 9 });
    expect(sampleTowerAnimation(0, 10 / 30)).toEqual({ animation: 'attack', frame: 10 });
    expect(sampleTowerAnimation(0, 29 / 30)).toEqual({ animation: 'attack', frame: 29 });
    expect(sampleTowerAnimation(2.2, 1)).toEqual({ animation: 'idle', frame: 6 });
  });

  it('uses caller clocks exactly, supports an attack restart, and holds reduced motion at idle zero', () => {
    const frozen = sampleTowerAnimation(4.4, .2);
    expect(sampleTowerAnimation(4.4, .2)).toEqual(frozen);
    expect(sampleTowerAnimation(4.4, 0)).toEqual({ animation: 'attack', frame: 0 });
    expect(sampleTowerAnimation(12.8, .2, true)).toEqual({ animation: 'idle', frame: 0 });
    expect(sampleTowerAnimation(Number.NaN, Number.POSITIVE_INFINITY)).toEqual({ animation: 'idle', frame: 0 });
  });
});
