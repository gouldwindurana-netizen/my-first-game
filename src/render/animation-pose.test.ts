import { describe, expect, it } from 'vitest';
import { towerRecoil } from './animation-pose';

const neutral = { offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0 };
const towers = ['archer', 'cannon', 'frost', 'arcane', 'mortar', 'tesla', 'venom'] as const;

describe('tower firing recoil', () => {
  it('starts distinctly for each weapon and settles back to its anchored pose', () => {
    for (const kind of towers) {
      expect(towerRecoil(kind, 0, false).flash).toBe(1);
      expect(towerRecoil(kind, 0, false)).not.toEqual({ ...neutral, flash: 0 });
      expect(towerRecoil(kind, .45, false)).toEqual({ ...neutral, flash: 0 });
      expect(towerRecoil(kind, -1, false)).toEqual({ ...neutral, flash: 0 });
      expect(towerRecoil(kind, Number.NaN, false)).toEqual({ ...neutral, flash: 0 });
    }
    expect(Math.abs(towerRecoil('cannon', .02, false).offsetY)).toBeGreaterThan(Math.abs(towerRecoil('archer', .02, false).offsetY));
  });
  it('retains brief firing feedback without physical motion when motion is reduced', () => {
    for (const kind of towers) {
      expect(towerRecoil(kind, .02, true)).toEqual({ ...neutral, flash: expect.any(Number) });
      expect(towerRecoil(kind, .02, true).flash).toBeGreaterThan(0);
      expect(towerRecoil(kind, .2, true)).toEqual({ ...neutral, flash: 0 });
    }
  });
});
