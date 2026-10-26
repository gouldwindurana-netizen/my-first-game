import gruntUrl from './assets/pack/walk24-grunt.webp?url';
import runnerUrl from './assets/pack/walk24-runner.webp?url';
import bruteUrl from './assets/pack/walk24-brute.webp?url';
import bossUrl from './assets/pack/walk24-boss.webp?url';
import metadata from './assets/pack/walk24-cycles.json';
import type { EnemyKind } from './game/model';

export const UNIT_KINDS: EnemyKind[] = ['grunt', 'runner', 'brute', 'boss'];
export const UNIT_NAMES: Record<EnemyKind, string> = { grunt: 'Rift goblin', runner: 'Hollow runner', brute: 'Ironhide brute', boss: 'Hollow warlord' };
const urls: Record<EnemyKind, string> = { grunt: gruntUrl, runner: runnerUrl, brute: bruteUrl, boss: bossUrl };
interface WalkMetadata {
  frameWidth: number; frameHeight: number; frameCount: number; targetFps: number;
  origin: { x: number; y: number };
  units: Record<EnemyKind, { texture: string; bodyHeight: number; origin?: { x: number; y: number } }>;
}
const source = metadata as WalkMetadata;
/** One atlas definition is shared by combat sprites and the close-up unit viewer. */
export function getWalkingAsset(kind: EnemyKind) {
  const unit = source.units[kind];
  return { url: urls[kind], texture: unit.texture, frameWidth: source.frameWidth, frameHeight: source.frameHeight,
    frameCount: source.frameCount, fps: source.targetFps, origin: unit.origin ?? source.origin, bodyHeight: unit.bodyHeight };
}
export const walkFrameName = (kind: EnemyKind, frame: number): string => `${kind}-walk-${frame}`;
