import towerAtlasUrl from './assets/pack/core-tower-upgrades.webp?url';
import enemyAtlasUrl from './assets/pack/enemy-roster.webp?url';
import frameSource from './assets/pack/frames.json?raw';

export interface SuppliedFrame {
  sheet: 'core-tower-upgrades' | 'enemy-roster';
  x: number;
  y: number;
  width: number;
  height: number;
  originX: number;
  originY: number;
}
interface SuppliedAtlas {
  sheets: Record<SuppliedFrame['sheet'], { file: string; width: number; height: number }>;
  frames: Record<string, SuppliedFrame>;
}

export const suppliedAtlas = JSON.parse(frameSource) as SuppliedAtlas;
export const TOWER_ATLAS_URL = towerAtlasUrl;
export const ENEMY_ATLAS_URL = enemyAtlasUrl;
export const TOWER_TEXTURE = 'supplied-towers';
export const ENEMY_TEXTURE = 'supplied-enemies';

/** Use the exact same measured source frames in DOM portraits and world sprites. */
export function towerArt(kind: string, level = 1): string {
  const safeKind = ['archer', 'cannon', 'frost', 'arcane'].includes(kind) ? kind : 'archer';
  const safeLevel = Math.max(1, Math.min(3, Math.round(level)));
  const key = `${safeKind}-${safeLevel}`;
  const frame = suppliedAtlas.frames[key];
  const sheet = suppliedAtlas.sheets[frame.sheet];
  return `<svg viewBox="${frame.x} ${frame.y} ${frame.width} ${frame.height}" preserveAspectRatio="xMidYMax meet" style="overflow:hidden" aria-hidden="true" data-asset="${key}"><defs><clipPath id="pack-crop-${key}"><rect x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}"/></clipPath></defs><image href="${towerAtlasUrl}" x="0" y="0" width="${sheet.width}" height="${sheet.height}" clip-path="url(#pack-crop-${key})"/></svg>`;
}
