import type { EnemyKind } from '../game/model';

/** One left-contact to left-contact cycle, including both feet's support phases. */
export const WALK_FRAME_COUNT = 24;
export const ANIMATION_FPS = 24;
export const animationTick = (seconds: number): number => Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds * ANIMATION_FPS + 1e-7) : 0;
export const WALK_DISTANCE_PER_CYCLE: Readonly<Record<EnemyKind, number>> = {
  grunt: 48,
  runner: 62,
  brute: 38,
  boss: 32,
};

export interface WalkCycleSample {
  frame: number;
  /** Fractional progress through the 24 interpolated limb poses, in [0, 1). */
  phase: number;
  foot: 'left' | 'right';
  cycle: number;
}

/**
 * Select an authored walking frame from distance actually traveled.
 * Pausing preserves the frame, slow effects reduce cadence, and double speed
 * advances cadence through the same movement distance used by combat.
 * All spawns begin at contact frame 0; staggered spawn times spread their poses
 * naturally. The ID is reserved for callers, without a discontinuous phase offset.
 */
export function sampleWalkCycle(kind: EnemyKind, distance: number, _id: number, reduced = false): WalkCycleSample {
  if (reduced || !Number.isFinite(distance) || distance <= 0) {
    return { frame: 0, phase: 0, foot: 'left', cycle: 0 };
  }
  const progress = distance / WALK_DISTANCE_PER_CYCLE[kind];
  const cycle = Math.floor(progress);
  const phase = progress - cycle;
  const frame = Math.min(WALK_FRAME_COUNT - 1, Math.floor(phase * WALK_FRAME_COUNT));
  return { frame, phase, foot: frame < WALK_FRAME_COUNT / 2 ? 'left' : 'right', cycle };
}
