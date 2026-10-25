import { describe, expect, it } from 'vitest';
import { towerRecoil, walkPose } from './animation-pose';

const neutral = { offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0 };
const enemies = ['grunt', 'runner', 'brute', 'boss'] as const;
const towers = ['archer', 'cannon', 'frost', 'arcane'] as const;

describe('walk poses', () => {
  it('keeps all roles bounded throughout full normal and slowed strides', () => {
    for (const kind of enemies) for (const slow of [false, true]) for (let step = 0; step <= 400; step++) {
      const pose = walkPose(kind, step / 23, 7, true, slow, false);
      expect(Math.abs(pose.offsetX)).toBeLessThanOrEqual(3);
      expect(Math.abs(pose.offsetY)).toBeLessThanOrEqual(3);
      expect(Math.abs(pose.rotation)).toBeLessThanOrEqual(.1);
      expect(pose.scaleX).toBeGreaterThanOrEqual(.92);
      expect(pose.scaleX).toBeLessThanOrEqual(1.08);
      expect(pose.scaleY).toBeGreaterThanOrEqual(.92);
      expect(pose.scaleY).toBeLessThanOrEqual(1.08);
    }
  });
  it('repeats each role stride and slows its clock without losing periodicity', () => {
    const periods = { grunt: 1, runner: .6, brute: 1.4, boss: 1.8 };
    for (const kind of enemies) for (const slow of [false, true]) {
      const first = walkPose(kind, .173, 9, true, slow, false);
      const next = walkPose(kind, .173 + periods[kind] / (slow ? .55 : 1), 9, true, slow, false);
      for (const key of Object.keys(first) as (keyof typeof first)[]) expect(next[key]).toBeCloseTo(first[key], 10);
    }
  });
  it('gives runners stronger, quicker movement than armored brutes', () => {
    const runner = walkPose('runner', .15, 0, true, false, false);
    const heavy = walkPose('brute', .15, 0, true, false, false);
    expect(Math.abs(runner.offsetY)).toBeGreaterThan(Math.abs(heavy.offsetY));
    expect(Math.abs(runner.rotation)).toBeGreaterThan(Math.abs(heavy.rotation));
    expect(walkPose('runner', .3, 0, true, false, false).offsetX).toBeCloseTo(0);
    expect(Math.abs(walkPose('brute', .3, 0, true, false, false).offsetX)).toBeGreaterThan(.3);
  });
  it('keeps reduced motion neutral and idle breathing grounded', () => {
    for (const kind of enemies) {
      expect(walkPose(kind, 72, 8, true, true, true)).toEqual(neutral);
      const idle = walkPose(kind, .3, 5, false, false, false);
      expect(idle.offsetX).toBe(0);
      expect(idle.offsetY).toBe(0);
      expect(idle.rotation).toBe(0);
      expect(Math.abs(idle.scaleY - 1)).toBeLessThanOrEqual(.006);
    }
  });
});

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
