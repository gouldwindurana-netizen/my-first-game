import towerAtlasUrl from './assets/pack/core-tower-upgrades.webp?url';
import enemyAtlasUrl from './assets/pack/enemy-roster.webp?url';
import specialistAtlasUrl from './assets/pack/specialist-towers.webp?url';
import frameSource from './assets/pack/frames.json?raw';

export interface SuppliedFrame {
  sheet: 'core-tower-upgrades' | 'enemy-roster' | 'specialist-towers';
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
export const SPECIALIST_TEXTURE = 'supplied-specialists';
export const SPECIALIST_ATLAS_URL = specialistAtlasUrl;
export type SuppliedTowerKind = 'archer' | 'cannon' | 'frost' | 'arcane' | 'mortar' | 'tesla' | 'venom';
/** New disciplines reuse supplied silhouettes until their dedicated artwork pass. */
const towerVisuals: Record<string, SuppliedTowerKind> = {
  archer:'archer',cannon:'cannon',frost:'frost',arcane:'arcane',mortar:'mortar',tesla:'tesla',venom:'venom',
  earth:'mortar',prism:'frost',trap:'cannon',sonic:'tesla',barracks:'archer',void:'arcane',solar:'cannon',chrono:'frost',truesight:'archer',nexus:'arcane',
};
export const getTowerVisualKind = (kind:string):SuppliedTowerKind => towerVisuals[kind] ?? 'archer';
export const getTowerFrameKey = (kind:string,level=1):string => `${getTowerVisualKind(kind)}-${Math.max(1,Math.min(3,Math.round(level)))}`;
export const getTowerTexture = (kind: string): string => ['mortar', 'tesla', 'venom'].includes(getTowerVisualKind(kind)) ? SPECIALIST_TEXTURE : TOWER_TEXTURE;

/** Use the exact same measured source frames in DOM portraits and world sprites. */
export function towerArt(kind: string, level = 1): string {
  const key = getTowerFrameKey(kind,level);
  const frame = suppliedAtlas.frames[key];
  const sheet = suppliedAtlas.sheets[frame.sheet];
  const atlasUrl = frame.sheet === 'specialist-towers' ? specialistAtlasUrl : towerAtlasUrl;
  return `<svg viewBox="${frame.x} ${frame.y} ${frame.width} ${frame.height}" preserveAspectRatio="xMidYMax meet" style="overflow:hidden" aria-hidden="true" data-asset="${key}" data-discipline="${kind in towerVisuals?kind:'archer'}"><defs><clipPath id="pack-crop-${key}"><rect x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}"/></clipPath></defs><image href="${atlasUrl}" x="0" y="0" width="${sheet.width}" height="${sheet.height}" clip-path="url(#pack-crop-${key})"/></svg>`;
}
