import towerAtlasUrl from './assets/towers/role-towers.svg?url';
import towerFrameSource from './assets/towers/role-towers.json?raw';
import enemyAtlasUrl from './assets/pack/enemy-roster.webp?url';
import frameSource from './assets/pack/frames.json?raw';
import type { TowerKind } from './game/catalog';

export interface SuppliedFrame {
  sheet: 'core-tower-upgrades' | 'enemy-roster' | 'specialist-towers' | 'role-towers';
  x: number; y: number; width: number; height: number;
  originX: number; originY: number;
  /** Normalized weapon outlet. Portraits and battle effects share this measured frame. */
  muzzleX?: number; muzzleY?: number;
}
interface SuppliedAtlas {
  sheets: Record<SuppliedFrame['sheet'], { file: string; width: number; height: number }>;
  frames: Record<string, SuppliedFrame>;
}
const legacyAtlas=JSON.parse(frameSource) as SuppliedAtlas;
const roleAtlas=JSON.parse(towerFrameSource) as SuppliedAtlas;
/** Enemy source frames remain untouched; every defense now owns its own three frames. */
export const suppliedAtlas:SuppliedAtlas={
 sheets:{...legacyAtlas.sheets,...roleAtlas.sheets},
 frames:{...Object.fromEntries(Object.entries(legacyAtlas.frames).filter(([,frame])=>frame.sheet==='enemy-roster')),...roleAtlas.frames},
};
export const TOWER_ATLAS_URL = towerAtlasUrl;
export const ENEMY_ATLAS_URL = enemyAtlasUrl;
export const TOWER_TEXTURE = 'role-led-towers';
export const ENEMY_TEXTURE = 'supplied-enemies';
// Retained exports keep integrations source-compatible; specialists use the same new atlas.
export const SPECIALIST_TEXTURE = TOWER_TEXTURE;
export const SPECIALIST_ATLAS_URL = towerAtlasUrl;
export type SuppliedTowerKind = TowerKind;
const towerKinds=new Set(['archer','cannon','mortar','frost','earth','arcane','tesla','venom','prism','trap','sonic','barracks','void','solar','chrono','truesight','nexus']);
export const getTowerVisualKind=(kind:string):TowerKind=>towerKinds.has(kind)?kind as TowerKind:'archer';
export const getTowerFrameKey=(kind:string,level=1):string=>`${getTowerVisualKind(kind)}-${Math.max(1,Math.min(3,Math.round(level)))}`;
export const getTowerTexture=(_kind:string):string=>TOWER_TEXTURE;
/** Shared movement profiles never choose artwork: all17 families have dedicated silhouettes. */
export const getTowerRecoilKind=(kind:string):'archer'|'cannon'|'frost'|'arcane'|'mortar'|'tesla'|'venom'=>({archer:'archer',cannon:'cannon',mortar:'mortar',frost:'frost',earth:'mortar',arcane:'arcane',tesla:'tesla',venom:'venom',prism:'frost',trap:'frost',sonic:'tesla',barracks:'archer',void:'arcane',solar:'arcane',chrono:'frost',truesight:'arcane',nexus:'tesla'} as const)[getTowerVisualKind(kind)];

/** Icons use the exact artwork and tier as the placed defense, with no recolored substitutes. */
let portraitSequence=0;
export function towerArt(kind:string,level=1):string {
 const discipline=getTowerVisualKind(kind),key=getTowerFrameKey(discipline,level),frame=suppliedAtlas.frames[key];
 const sheet=suppliedAtlas.sheets['role-towers'];
 const clip=`tower-crop-${++portraitSequence}`;
 return `<svg viewBox="${frame.x} ${frame.y} ${frame.width} ${frame.height}" preserveAspectRatio="xMidYMax meet" style="overflow:hidden" aria-hidden="true" data-asset="${key}" data-discipline="${discipline}"><defs><clipPath id="${clip}" clipPathUnits="userSpaceOnUse"><rect x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}"/></clipPath></defs><image href="${towerAtlasUrl}" x="0" y="0" width="${sheet.width}" height="${sheet.height}" clip-path="url(#${clip})"/></svg>`;
}
