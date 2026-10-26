import { describe, expect, it } from 'vitest';
import { sampleWalkCycle, WALK_DISTANCE_PER_CYCLE, WALK_FRAME_COUNT, animationTick } from './walk-cycle';

const kinds = ['grunt', 'runner', 'brute', 'boss'] as const;
const neutral = { frame: 0, phase: 0, foot: 'left', cycle: 0 };

describe('distance-driven walking frames', () => {
  it('samples presentation on a 24 Hz clock independently of display refresh', () => {
    const ticks=Array.from({length:120},(_,i)=>animationTick(i/120));
    expect(new Set(ticks).size).toBe(24);
    expect(animationTick(1)).toBe(24);
    expect(animationTick(Number.NaN)).toBe(0);
  });
  it('starts every unit at contact and reaches every authored pose in order', () => {
    for (const kind of kinds) {
      const stride = WALK_DISTANCE_PER_CYCLE[kind];
      expect(sampleWalkCycle(kind, 0, 23)).toEqual(neutral);
      const frames = Array.from({ length: WALK_FRAME_COUNT }, (_, frame) =>
        sampleWalkCycle(kind, stride * (frame + .25) / WALK_FRAME_COUNT, 23).frame);
      expect(frames).toEqual(Array.from({length:24},(_,index)=>index));
      expect(sampleWalkCycle(kind, stride / 2, 23).foot).toBe('right');
      expect(sampleWalkCycle(kind, stride, 23)).toEqual({ ...neutral, cycle: 1 });
    }
  });

  it('keeps the same contact pose through repeated loops without a per-unit phase jump', () => {
    for (const kind of kinds) {
      const stride = WALK_DISTANCE_PER_CYCLE[kind];
      const first = sampleWalkCycle(kind, stride * .31, 1);
      const later = sampleWalkCycle(kind, stride * 1000.31, 999);
      expect(later.frame).toBe(first.frame);
      expect(later.phase).toBeCloseTo(first.phase, 10);
      expect(later.foot).toBe(first.foot);
      expect(later.cycle).toBe(1000);
      expect(sampleWalkCycle(kind, Number.EPSILON, 999).frame).toBe(0);
    }
  });

  it('freezes at a fixed position and follows normal, slowed, and doubled movement', () => {
    for (const kind of kinds) {
      const stride = WALK_DISTANCE_PER_CYCLE[kind];
      const frozen = sampleWalkCycle(kind, stride * 3.1875, 5);
      for (let frame = 0; frame < 120; frame++) expect(sampleWalkCycle(kind, stride * 3.1875, 5)).toEqual(frozen);
      const normal = sampleWalkCycle(kind, stride * 1.25, 5);
      const slow = sampleWalkCycle(kind, stride * 1.25 * .55, 5);
      const double = sampleWalkCycle(kind, stride * 1.25 * 2, 5);
      expect(normal.cycle + normal.phase).toBeCloseTo(1.25);
      expect(slow.cycle + slow.phase).toBeCloseTo(1.25 * .55);
      expect(double.cycle + double.phase).toBeCloseTo(2.5);
    }
  });

  it('uses a still contact frame for reduced motion and invalid movement distances', () => {
    for (const kind of kinds) {
      for (const distance of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
        expect(sampleWalkCycle(kind, distance, 7)).toEqual(neutral);
      }
      for (const distance of [0, .01, 8, 1234]) expect(sampleWalkCycle(kind, distance, 7, true)).toEqual(neutral);
    }
  });

  it('keeps frame indices valid at long route distances and fractional boundaries', () => {
    for (const kind of kinds) for (const distance of [.000001, .999999, 47.999999, 10000.123, Number.MAX_SAFE_INTEGER, Number.MAX_VALUE]) {
      const sample = sampleWalkCycle(kind, distance, 7);
      expect(Number.isInteger(sample.frame)).toBe(true);
      expect(sample.frame).toBeGreaterThanOrEqual(0);
      expect(sample.frame).toBeLessThan(WALK_FRAME_COUNT);
      expect(sample.phase).toBeGreaterThanOrEqual(0);
      expect(sample.phase).toBeLessThan(1);
      expect(Number.isFinite(sample.cycle)).toBe(true);
    }
  });
});
