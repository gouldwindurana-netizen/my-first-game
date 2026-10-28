/** Authored PNG clips contain 30 unique poses per second, including attack recovery. */
export const TOWER_ANIMATION_FPS = 30;
export const TOWER_FRAME_COUNT = 30;
export const TOWER_ATTACK_DURATION = TOWER_FRAME_COUNT / TOWER_ANIMATION_FPS;
export type TowerAnimation = 'idle' | 'attack';
export interface TowerAnimationSample { animation: TowerAnimation; frame: number; }

/** Both clocks are supplied by the scene and stop on pause. Reduced motion holds idle zero. */
export function sampleTowerAnimation(idleSeconds: number, attackAge: number, reduced = false): TowerAnimationSample {
  if (reduced) return { animation: 'idle', frame: 0 };
  if (Number.isFinite(attackAge) && attackAge >= 0 && attackAge < TOWER_ATTACK_DURATION) {
    return { animation: 'attack', frame: Math.min(TOWER_FRAME_COUNT - 1, Math.floor(attackAge * TOWER_ANIMATION_FPS + 1e-7)) };
  }
  const tick = Number.isFinite(idleSeconds) && idleSeconds > 0 ? Math.floor(idleSeconds * TOWER_ANIMATION_FPS + 1e-7) : 0;
  return { animation: 'idle', frame: tick % TOWER_FRAME_COUNT };
}
