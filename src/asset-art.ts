import archeridleUrl from './assets/towers/animated/runtime/archer_idle.webp?url';
import archerattackUrl from './assets/towers/animated/runtime/archer_attack.webp?url';
import cannonidleUrl from './assets/towers/animated/runtime/cannon_idle.webp?url';
import cannonattackUrl from './assets/towers/animated/runtime/cannon_attack.webp?url';
import mortaridleUrl from './assets/towers/animated/runtime/mortar_idle.webp?url';
import mortarattackUrl from './assets/towers/animated/runtime/mortar_attack.webp?url';
import frostidleUrl from './assets/towers/animated/runtime/frost_idle.webp?url';
import frostattackUrl from './assets/towers/animated/runtime/frost_attack.webp?url';
import earthidleUrl from './assets/towers/animated/runtime/earth_idle.webp?url';
import earthattackUrl from './assets/towers/animated/runtime/earth_attack.webp?url';
import arcaneidleUrl from './assets/towers/animated/runtime/arcane_idle.webp?url';
import arcaneattackUrl from './assets/towers/animated/runtime/arcane_attack.webp?url';
import teslaidleUrl from './assets/towers/animated/runtime/tesla_idle.webp?url';
import teslaattackUrl from './assets/towers/animated/runtime/tesla_attack.webp?url';
import venomidleUrl from './assets/towers/animated/runtime/venom_idle.webp?url';
import venomattackUrl from './assets/towers/animated/runtime/venom_attack.webp?url';
import prismidleUrl from './assets/towers/animated/runtime/prism_idle.webp?url';
import prismattackUrl from './assets/towers/animated/runtime/prism_attack.webp?url';
import trapidleUrl from './assets/towers/animated/runtime/trap_idle.webp?url';
import trapattackUrl from './assets/towers/animated/runtime/trap_attack.webp?url';
import sonicidleUrl from './assets/towers/animated/runtime/sonic_idle.webp?url';
import sonicattackUrl from './assets/towers/animated/runtime/sonic_attack.webp?url';
import barracksidleUrl from './assets/towers/animated/runtime/barracks_idle.webp?url';
import barracksattackUrl from './assets/towers/animated/runtime/barracks_attack.webp?url';
import voididleUrl from './assets/towers/animated/runtime/void_idle.webp?url';
import voidattackUrl from './assets/towers/animated/runtime/void_attack.webp?url';
import solaridleUrl from './assets/towers/animated/runtime/solar_idle.webp?url';
import solarattackUrl from './assets/towers/animated/runtime/solar_attack.webp?url';
import chronoidleUrl from './assets/towers/animated/runtime/chrono_idle.webp?url';
import chronoattackUrl from './assets/towers/animated/runtime/chrono_attack.webp?url';
import truesightidleUrl from './assets/towers/animated/runtime/truesight_idle.webp?url';
import truesightattackUrl from './assets/towers/animated/runtime/truesight_attack.webp?url';
import nexusidleUrl from './assets/towers/animated/runtime/nexus_idle.webp?url';
import nexusattackUrl from './assets/towers/animated/runtime/nexus_attack.webp?url';
import archerPortraitUrl from './assets/towers/animated/portraits/archer.webp?url';
import cannonPortraitUrl from './assets/towers/animated/portraits/cannon.webp?url';
import mortarPortraitUrl from './assets/towers/animated/portraits/mortar.webp?url';
import frostPortraitUrl from './assets/towers/animated/portraits/frost.webp?url';
import earthPortraitUrl from './assets/towers/animated/portraits/earth.webp?url';
import arcanePortraitUrl from './assets/towers/animated/portraits/arcane.webp?url';
import teslaPortraitUrl from './assets/towers/animated/portraits/tesla.webp?url';
import venomPortraitUrl from './assets/towers/animated/portraits/venom.webp?url';
import prismPortraitUrl from './assets/towers/animated/portraits/prism.webp?url';
import trapPortraitUrl from './assets/towers/animated/portraits/trap.webp?url';
import sonicPortraitUrl from './assets/towers/animated/portraits/sonic.webp?url';
import barracksPortraitUrl from './assets/towers/animated/portraits/barracks.webp?url';
import voidPortraitUrl from './assets/towers/animated/portraits/void.webp?url';
import solarPortraitUrl from './assets/towers/animated/portraits/solar.webp?url';
import chronoPortraitUrl from './assets/towers/animated/portraits/chrono.webp?url';
import truesightPortraitUrl from './assets/towers/animated/portraits/truesight.webp?url';
import nexusPortraitUrl from './assets/towers/animated/portraits/nexus.webp?url';
import normalization from './assets/towers/animated/normalization.json';
import towerManifest from './assets/towers/animated/manifest.json';
import enemyAtlasUrl from './assets/pack/enemy-roster.webp?url';
import frameSource from './assets/pack/frames.json?raw';
import { TOWER_KINDS, type TowerKind } from './game/catalog';
import { TOWER_FRAME_COUNT, type TowerAnimation } from './render/tower-animation';

export interface SuppliedFrame {
  sheet: string;
  x: number; y: number; width: number; height: number;
  originX: number; originY: number;
  /** Normalized weapon outlet, shared by battle projectiles and artwork. */
  muzzleX?: number; muzzleY?: number;
}
interface SuppliedAtlas {
  sheets: Record<string, { file: string; width: number; height: number }>;
  frames: Record<string, SuppliedFrame>;
}
const towerUrls: Record<TowerKind, Record<TowerAnimation, string>> = {
  archer: { idle: archeridleUrl, attack: archerattackUrl },
  cannon: { idle: cannonidleUrl, attack: cannonattackUrl },
  mortar: { idle: mortaridleUrl, attack: mortarattackUrl },
  frost: { idle: frostidleUrl, attack: frostattackUrl },
  earth: { idle: earthidleUrl, attack: earthattackUrl },
  arcane: { idle: arcaneidleUrl, attack: arcaneattackUrl },
  tesla: { idle: teslaidleUrl, attack: teslaattackUrl },
  venom: { idle: venomidleUrl, attack: venomattackUrl },
  prism: { idle: prismidleUrl, attack: prismattackUrl },
  trap: { idle: trapidleUrl, attack: trapattackUrl },
  sonic: { idle: sonicidleUrl, attack: sonicattackUrl },
  barracks: { idle: barracksidleUrl, attack: barracksattackUrl },
  void: { idle: voididleUrl, attack: voidattackUrl },
  solar: { idle: solaridleUrl, attack: solarattackUrl },
  chrono: { idle: chronoidleUrl, attack: chronoattackUrl },
  truesight: { idle: truesightidleUrl, attack: truesightattackUrl },
  nexus: { idle: nexusidleUrl, attack: nexusattackUrl },
};
const portraitUrls: Record<TowerKind, string> = {
  archer: archerPortraitUrl,
  cannon: cannonPortraitUrl,
  mortar: mortarPortraitUrl,
  frost: frostPortraitUrl,
  earth: earthPortraitUrl,
  arcane: arcanePortraitUrl,
  tesla: teslaPortraitUrl,
  venom: venomPortraitUrl,
  prism: prismPortraitUrl,
  trap: trapPortraitUrl,
  sonic: sonicPortraitUrl,
  barracks: barracksPortraitUrl,
  void: voidPortraitUrl,
  solar: solarPortraitUrl,
  chrono: chronoPortraitUrl,
  truesight: truesightPortraitUrl,
  nexus: nexusPortraitUrl,
};
export const TOWER_TEXTURE = 'supplied-towers-30fps';
export const ENEMY_TEXTURE = 'supplied-enemies';
export const ENEMY_ATLAS_URL = enemyAtlasUrl;
export const TOWER_ATLAS_URL = towerUrls.archer.idle;
export const SPECIALIST_TEXTURE = TOWER_TEXTURE;
export const SPECIALIST_ATLAS_URL = TOWER_ATLAS_URL;
export type SuppliedTowerKind = TowerKind;
const towerKinds = new Set<string>(TOWER_KINDS);
export const getTowerVisualKind = (kind: string): TowerKind => towerKinds.has(kind) ? kind as TowerKind : 'archer';
export const getTowerTexture = (kind: string, animation: TowerAnimation = 'idle'): string => `${TOWER_TEXTURE}-${getTowerVisualKind(kind)}-${animation}`;
/** The supplied pack has one design per family; all gameplay tiers share its authored clips. */
export const getTowerFrameKey = (kind: string, _level = 1, animation: TowerAnimation = 'idle', frame = 0): string =>
  `${getTowerVisualKind(kind)}-${animation}-${Math.max(0, Math.min(TOWER_FRAME_COUNT - 1, Math.floor(Number.isFinite(frame) ? frame : 0)))}`;
// Painted weapon outlets use the original 256px cell coordinates, matching each
// visible barrel mouth, crossbow tip, lens, or energy core.
const muzzle: Record<TowerKind, [number, number]> = {
  archer:[181,49], cannon:[192,50], mortar:[156,55], frost:[130,66], earth:[124,82], arcane:[129,64],
  tesla:[130,57], venom:[102,119], prism:[132,80], trap:[128,187], sonic:[185,52], barracks:[108,177],
  void:[131,114], solar:[131,68], chrono:[130,132], truesight:[134,68], nexus:[131,110],
};
export function getTowerAsset(kind: string, animation: TowerAnimation = 'idle') {
  const family = getTowerVisualKind(kind);
  return { url: towerUrls[family][animation], texture: getTowerTexture(family, animation),
    frameWidth: normalization.frameWidth, frameHeight: normalization.frameHeight,
    columns: towerManifest.columns, rows: towerManifest.rows, frameCount: towerManifest.frameCount,
    fps: towerManifest.fps, origin: towerManifest.anchor };
}
const legacyAtlas = JSON.parse(frameSource) as SuppliedAtlas;
/** Existing enemy crops are retained byte-for-byte; tower frames select normalized cells from the supplied artwork. */
export const suppliedAtlas: SuppliedAtlas = {
  sheets: { ...legacyAtlas.sheets },
  frames: Object.fromEntries(Object.entries(legacyAtlas.frames).filter(([, frame]) => frame.sheet === 'enemy-roster')),
};
for (const kind of TOWER_KINDS) for (const animation of ['idle', 'attack'] as const) {
  const asset = getTowerAsset(kind, animation), sheet = getTowerTexture(kind, animation);
  suppliedAtlas.sheets[sheet] = { file: `${kind}_${animation}.webp`, width: asset.columns * asset.frameWidth, height: asset.rows * asset.frameHeight };
  for (let frame = 0; frame < asset.frameCount; frame++) {
    suppliedAtlas.frames[getTowerFrameKey(kind, 1, animation, frame)] = {
      sheet, x: frame % asset.columns * asset.frameWidth, y: Math.floor(frame / asset.columns) * asset.frameHeight,
      width: asset.frameWidth, height: asset.frameHeight, originX: asset.origin.x, originY: asset.origin.y,
      muzzleX: muzzle[kind][0] / towerManifest.frameWidth, muzzleY: muzzle[kind][1] / towerManifest.frameHeight,
    };
  }
}

/** Portraits use the matching supplied placement icon; upgrades share the family artwork. */
let portraitSequence = 0;
export function towerArt(kind: string, level = 1): string {
  const discipline = getTowerVisualKind(kind), key = getTowerFrameKey(discipline, level), frame = suppliedAtlas.frames[key];
  const clip = `tower-crop-${++portraitSequence}`;
  return `<svg viewBox="0 0 ${frame.width} ${frame.height}" preserveAspectRatio="xMidYMax meet" style="overflow:hidden" aria-hidden="true" data-asset="${key}" data-discipline="${discipline}" data-tier="${Math.max(1,Math.min(3,Math.round(level)))}"><defs><clipPath id="${clip}" clipPathUnits="userSpaceOnUse"><rect x="0" y="0" width="${frame.width}" height="${frame.height}"/></clipPath></defs><image href="${portraitUrls[discipline]}" x="0" y="0" width="${frame.width}" height="${frame.height}" clip-path="url(#${clip})"/></svg>`;
}
