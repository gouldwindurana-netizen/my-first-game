import type { Point, WaveDef } from './model';
import { ENEMY_DEFS, type EnemyKind } from './catalog';
import { MAP_GEOMETRY } from './map-geometry';

export interface Foundation extends Point { id: number; name: string; }
export interface TreeBlocker extends Point { radius: number; }
export interface LevelDef {
  id: string; name: string; mapKey: string; subtitle: string; description: string;
  path: Point[]; pads: Foundation[]; waves: WaveDef[]; openingWave: WaveDef; startingGold: number; enemyMultiplier: number;
  camera: Point;
  biome: string;
  trees: TreeBlocker[];
  world: { width: number; height: number };
}

const ELDER_PATH: Point[] = [
  { x: 68, y: 118 }, { x: 117, y: 132 }, { x: 210, y: 136 },
  { x: 265, y: 153 }, { x: 303, y: 183 }, { x: 320, y: 225 },
  { x: 328, y: 282 }, { x: 359, y: 325 }, { x: 425, y: 360 },
  { x: 502, y: 381 }, { x: 573, y: 381 }, { x: 634, y: 367 },
  { x: 675, y: 336 }, { x: 688, y: 285 }, { x: 682, y: 249 },
  { x: 648, y: 213 }, { x: 659, y: 190 }, { x: 713, y: 164 },
  { x: 765, y: 156 }, { x: 818, y: 173 }, { x: 858, y: 202 },
  { x: 869, y: 244 }, { x: 869, y: 293 }, { x: 889, y: 330 },
  { x: 936, y: 357 }, { x: 997, y: 387 }, { x: 1054, y: 418 },
  { x: 1140, y: 450 },
];

const ELDER_PADS = [
  { id: 0, name: 'West watch', x: 234, y: 241 }, { id: 1, name: 'Bridge overlook', x: 380, y: 153 },
  { id: 2, name: 'River bend', x: 422, y: 294 }, { id: 3, name: 'Lower crossing', x: 529, y: 428 },
  { id: 4, name: 'Grove overlook', x: 571, y: 237 }, { id: 5, name: 'Rift bend', x: 738, y: 250 },
  { id: 6, name: 'Citadel approach', x: 813, y: 372 }, { id: 7, name: 'East watch', x: 961, y: 271 },
  { id: 8, name: 'Portal verge', x: 196, y: 174 },
  { id: 9, name: 'Lower garden', x: 649, y: 407 },
  { id: 10, name: 'Citadel ridge', x: 820, y: 110 },
];

const FROSTBOUND_PATH: Point[] = [
  { x: 80, y: 246 }, { x: 145, y: 283 }, { x: 211, y: 283 }, { x: 279, y: 250 },
  { x: 339, y: 225 }, { x: 398, y: 229 }, { x: 434, y: 262 }, { x: 413, y: 304 },
  { x: 397, y: 348 }, { x: 417, y: 392 }, { x: 480, y: 428 }, { x: 543, y: 470 },
  { x: 574, y: 493 }, { x: 657, y: 460 }, { x: 753, y: 428 }, { x: 834, y: 416 },
  { x: 878, y: 399 }, { x: 910, y: 449 }, { x: 956, y: 506 }, { x: 992, y: 558 },
  { x: 1065, y: 625 }, { x: 1131, y: 688 },
];
const FROSTBOUND_PADS: Foundation[] = [
  { id: 0, name: 'Pinewatch', x: 264, y: 189 },
  { id: 1, name: 'High Aerie', x: 527, y: 109 },
  { id: 2, name: 'Ice Shelf', x: 481, y: 357 },
  { id: 3, name: 'Frostbank', x: 410, y: 470 },
  { id: 4, name: 'Citadel Rise', x: 754, y: 306 },
  { id: 5, name: 'Snowbend', x: 971, y: 388 },
  { id: 6, name: 'Portal bank', x: 195, y: 232 },
  { id: 7, name: 'North bridgehead', x: 623, y: 223 },
  { id: 8, name: 'Lower snowbank', x: 298, y: 438 },
];
const EMBER_PATH: Point[] = [
  { x: 91, y: 185 }, { x: 143, y: 221 }, { x: 222, y: 236 }, { x: 278, y: 268 },
  { x: 314, y: 317 }, { x: 325, y: 382 }, { x: 345, y: 448 }, { x: 374, y: 504 },
  { x: 428, y: 529 }, { x: 499, y: 542 }, { x: 587, y: 542 }, { x: 662, y: 536 },
  { x: 710, y: 514 }, { x: 746, y: 472 }, { x: 784, y: 414 }, { x: 812, y: 351 },
  { x: 838, y: 289 }, { x: 868, y: 253 }, { x: 904, y: 234 },
];
const EMBER_PADS: Foundation[] = [
  { id: 0, name: 'Ashwatch', x: 341, y: 202 },
  { id: 1, name: 'Cinder Shelf', x: 238, y: 338 },
  { id: 2, name: 'Coalbank', x: 423, y: 440 },
  { id: 3, name: 'High Furnace', x: 714, y: 140 },
  { id: 4, name: 'Obsidian Rise', x: 774, y: 293 },
  { id: 5, name: 'Magma Bend', x: 738, y: 436 },
  { id: 6, name: 'Ember Gate', x: 897, y: 395 },
  { id: 7, name: 'Portal rampart', x: 250, y: 175 },
  { id: 8, name: 'Gate courtyard', x: 905, y: 176 },
  { id: 9, name: 'South bastion', x: 855, y: 514 },
];
const MIREWOOD_PATH: Point[] = [
  { x: 80, y: 317 }, { x: 145, y: 344 }, { x: 207, y: 334 }, { x: 271, y: 306 },
  { x: 321, y: 298 }, { x: 371, y: 313 }, { x: 423, y: 323 }, { x: 476, y: 317 },
  { x: 521, y: 304 }, { x: 551, y: 367 }, { x: 589, y: 418 }, { x: 635, y: 458 },
  { x: 692, y: 481 }, { x: 757, y: 497 }, { x: 821, y: 508 }, { x: 881, y: 539 },
  { x: 942, y: 581 }, { x: 999, y: 621 }, { x: 1054, y: 659 }, { x: 1122, y: 714 },
];
const MIREWOOD_PADS: Foundation[] = [
  { id: 0, name: 'Willow Bank', x: 233, y: 237 },
  { id: 1, name: 'Reedbank', x: 282, y: 428 },
  { id: 2, name: 'Canopy Watch', x: 567, y: 153 },
  { id: 3, name: 'Bog Island', x: 540, y: 483 },
  { id: 4, name: 'Lantern Isle', x: 724, y: 380 },
  { id: 5, name: 'High court', x: 873, y: 194 },
  { id: 6, name: 'Gate garden', x: 919, y: 498 },
];
const CRYSTAL_PATH: Point[] = [
  { x: 80, y: 253 }, { x: 150, y: 283 }, { x: 224, y: 304 }, { x: 286, y: 306 },
  { x: 334, y: 271 }, { x: 394, y: 227 }, { x: 434, y: 200 }, { x: 478, y: 176 },
  { x: 533, y: 148 }, { x: 570, y: 150 }, { x: 629, y: 176 }, { x: 692, y: 208 },
  { x: 744, y: 245 }, { x: 796, y: 285 }, { x: 846, y: 310 }, { x: 907, y: 310 },
  { x: 971, y: 293 }, { x: 1026, y: 267 }, { x: 1084, y: 237 }, { x: 1131, y: 229 },
];
const CRYSTAL_PADS: Foundation[] = [
  { id: 0, name: 'Azure Shelf', x: 371, y: 158 },
  { id: 1, name: 'Prism Watch', x: 392, y: 312 },
  { id: 2, name: 'Deep Crystal', x: 311, y: 411 },
  { id: 3, name: 'Amethyst Rise', x: 818, y: 192 },
  { id: 4, name: 'Echo Shelf', x: 773, y: 316 },
  { id: 5, name: 'Gemstone Bank', x: 850, y: 419 },
  { id: 6, name: 'Portal ledge', x: 240, y: 218 },
  { id: 7, name: 'Gate court', x: 1020, y: 213 },
];

interface ScriptedGroup {
  kind: EnemyKind;
  count: number;
  spacing: number;
  wait?: number;
  miniBoss?: boolean;
}
const group = (kind: EnemyKind, count: number, spacing = 1, miniBoss = false): ScriptedGroup => ({ kind, count, spacing, miniBoss });
function scripted(name: string, description: string, groups: ScriptedGroup[]): WaveDef {
  let delay = 0;
  return {
    name, description,
    enemies: groups.flatMap(entry => {
      delay += entry.wait ?? 0;
      return Array.from({ length: entry.count }, () => {
        const enemy = { kind: entry.kind, delay, ...(entry.miniBoss ? { miniBoss: true } : {}) };
        delay += entry.spacing;
        return enemy;
      });
    }),
  };
}

/** Explicit formations introduce a mechanic before combining it with later threats. */
const SCRIPTS: Record<string, WaveDef[]> = {
  eldervale: [
    scripted('Mossroad patrol', 'Training: build an Arrow tower beside the first bend, then send the scouts.', [group('grunt', 6, 1.65)]),
    scripted('Quick feet', 'Runners move faster. Use Fastest targeting or slow them with Ice.', [group('grunt', 5, 1.3), group('runner', 5, 1.25)]),
    scripted('Iron at the gate', 'Heavy goblins bring armor. Mix physical fire with elemental damage.', [group('brute', 2, 2), group('grunt', 7, 1.2)]),
    scripted('The shield line', 'Hidden Veil scouts follow the shields. Lantern Sentries or an Aurora Lens reveal them for nearby towers.', [group('shieldbearer', 2, 1.7), group('runner', 6, 1), group('scout', 3, 1.2)]),
    scripted('Ogre lieutenant', 'Mini-boss: an empowered Ogre leads the column. Try troops, traps, and tower upgrades.', [group('ogre', 1, 1, true), group('grunt', 8, .95), group('runner', 6, .85)]),
    scripted('The Hollow King', 'Final boss: save Starfall for the king and keep his escorts under control.', [group('brute', 2, 1.4), group('boss', 1, 2.5), group('grunt', 8, 1), group('runner', 6, .9)]),
  ],
  windward: [
    scripted('High-road patrol', 'A visible patrol gives defenders time to prepare their detection upgrades.', [group('grunt', 8, 1.3), group('runner', 4, 1.1)]),
    scripted('Wings on the wind', 'Bats fly over melee troops and ground traps. Cover the sky with ranged towers.', [group('bat', 8, 1.15), group('runner', 5, 1)]),
    scripted('The narrow pass', 'Shieldbearers and raiders arrive together.', [group('shieldbearer', 3, 1.5), group('raider', 8, .9)]),
    scripted('Ogre of the heights', 'Mini-boss: one powerful Ogre advances beneath a cloud of bats.', [group('ogre', 1, 1, true), group('bat', 9, .85), group('grunt', 8, .7)]),
    scripted('Windward rush', 'Dodging scouts follow fast runners. Area attacks can cover their escape routes.', [group('runner', 12, .7), group('scout', 8, .8)]),
    scripted('Feather and iron', 'An armored front line distracts towers from the flying rear guard.', [group('brute', 5, 1.1), group('bat', 10, .65), group('raider', 7, .8)]),
    scripted('Last ascent', 'A shaman supports the final vanguard. Break the support line early.', [group('shieldbearer', 4, 1), group('shaman', 2, 1.4), group('runner', 12, .65)]),
    scripted('Crown above the clouds', 'Final boss: the Hollow King climbs the pass with his sky guard.', [group('brute', 3, 1), group('boss', 1, 2), group('bat', 12, .75), group('raider', 8, .8)]),
  ],
  mirewood: [
    scripted('Reedbank patrol', 'Few foundations overlook the swamp. Combine coverage before spending on range.', [group('grunt', 9, 1.2), group('raider', 5, 1)]),
    scripted('Bones in the reeds', 'Skeleton ranks emerge from the swamp.', [group('skeleton', 12, .85), group('runner', 6, .9)]),
    scripted('Green lanterns', 'Shamans heal their companions. Strongest targeting alone may leave the healers alive.', [group('shieldbearer', 3, 1.1), group('shaman', 2, 1.5), group('grunt', 9, .75)]),
    scripted('The bog champion', 'Mini-boss: an empowered Troll regenerates beneath the canopy.', [group('troll', 1, 1, true), group('skeleton', 12, .65), group('raider', 6, .8)]),
    scripted('A restless grave', 'Necromancers summon more skeletons. Reach them before the causeway fills.', [group('skeleton', 8, .7), group('necromancer', 2, 1.6), group('runner', 10, .7)]),
    scripted('Mire iron', 'Ogres and regenerating trolls lead another long column.', [group('ogre', 3, 1.4), group('troll', 3, 1.3), group('raider', 10, .7)]),
    scripted('Last lantern', 'Healers and summoners hide behind shields. Use splash, poison, and control together.', [group('shieldbearer', 5, 1), group('necromancer', 2, 1.3), group('shaman', 2, 1.1), group('skeleton', 12, .6)]),
    scripted('The drowned crown', 'Final boss: the Hollow King crosses the haunted swamp.', [group('troll', 2, 1.5), group('boss', 1, 2), group('skeleton', 14, .7), group('shaman', 2, 1.3)]),
  ],
  frostbound: [
    scripted('Whiteout patrol', 'Visible runners test the frozen approach before hidden scouts arrive later.', [group('runner', 10, .9), group('raider', 5, 1)]),
    scripted('Cracking ice', 'Frost Wights resist cold. Fire and other elements provide a different answer.', [group('frostwight', 5, 1.3), group('grunt', 10, .8)]),
    scripted('Frozen armor', 'Heavy guards and shieldbearers shelter the next wave.', [group('brute', 4, 1.1), group('shieldbearer', 4, 1.3), group('runner', 8, .7)]),
    scripted('The ice marshal', 'Mini-boss: an Iron Sentinel advances through the pass.', [group('ironsentinel', 1, 1, true), group('frostwight', 6, 1), group('bat', 9, .75)]),
    scripted('Avalanche column', 'A dense skeleton column follows regenerating trolls.', [group('troll', 3, 1.3), group('skeleton', 18, .5)]),
    scripted('Skaters at dusk', 'A fast attack reaches both halves of the road.', [group('runner', 15, .6), group('scout', 10, .7), group('bat', 8, .65)]),
    scripted('Before the storm', 'Sentinels and Wights march with a protected healer.', [group('ironsentinel', 3, 1.6), group('frostwight', 6, .9), group('shaman', 2, 1.4)]),
    scripted('King of winter', 'Final boss: the Hollow King arrives with his cold-resistant guard.', [group('frostwight', 4, 1), group('boss', 1, 2), group('troll', 3, 1.2), group('runner', 12, .65)]),
  ],
  storm: [
    scripted('The thunder road', 'Raiding parties descend from the highlands.', [group('raider', 12, .85), group('bat', 8, .8)]),
    scripted('Living lightning', 'Storm Conduits resist lightning. Mix your damage types.', [group('stormconduit', 6, 1.25), group('runner', 10, .7)]),
    scripted('Shadows on the ridge', 'Shadow Wraiths evade ordinary sight. Reveal them or strike with area magic.', [group('shadowwraith', 5, 1.4), group('shieldbearer', 5, 1), group('scout', 7, .75)]),
    scripted('The storm captain', 'Mini-boss: a Warlord supports a stormbound column.', [group('warlord', 1, 1, true), group('stormconduit', 5, 1.2), group('raider', 12, .65)]),
    scripted('Thunder and bone', 'Necromancers call skeletons beneath a flock of bats.', [group('necromancer', 3, 1.5), group('skeleton', 12, .55), group('bat', 10, .65)]),
    scripted('Iron rain', 'Iron Sentinels accompany a fast rear guard.', [group('ironsentinel', 4, 1.4), group('runner', 14, .6), group('scout', 8, .7)]),
    scripted('Eye of the storm', 'Conduits and Wraiths combine their defenses. Use reveal and mixed elements.', [group('stormconduit', 7, 1), group('shadowwraith', 6, 1), group('shaman', 3, 1.2)]),
    scripted('The Bone Dragon wakes', 'Final boss: the Bone Dragon flies above melee defenders. Keep anti-air coverage ready.', [group('bat', 6, .7), group('bonedragon', 1, 2.5), group('stormconduit', 5, 1), group('runner', 12, .65)]),
  ],
  crystal: [
    scripted('Echoes below', 'Visible runners and skeletons reach the crystal road.', [group('runner', 9, .9), group('skeleton', 12, .7)]),
    scripted('Stone awakens', 'Stone Golems carry heavy armor. Elemental towers and armor shred help.', [group('stonegolem', 4, 1.6), group('raider', 10, .8)]),
    scripted('Rift fragments', 'Voidlings split when defeated. Leave coverage for the smaller survivors.', [group('voidling', 7, 1.2), group('runner', 10, .7)]),
    scripted('Prism runners', 'Fast and flying enemies cross the same firing lanes.', [group('runner', 16, .55), group('bat', 12, .65)]),
    scripted('The gemstone guardian', 'Mini-boss: an empowered Stone Golem leads the advance.', [group('stonegolem', 1, 1, true), group('frostwight', 6, 1), group('scout', 10, .7)]),
    scripted('Dark crystal', 'Dark Knights resist some magic. Compare armor and elemental defenses.', [group('darkknight', 5, 1.35), group('skeleton', 16, .55)]),
    scripted('Shattered light', 'Splitting Voidlings follow a wave of shields.', [group('shieldbearer', 5, 1), group('voidling', 9, .95), group('shaman', 2, 1.2)]),
    scripted('The resonant host', 'Storm Conduits and Frost Wights punish a single-element defense.', [group('stormconduit', 5, 1), group('frostwight', 5, 1), group('raider', 12, .6)]),
    scripted('The final echo', 'A Warlord and his healers shelter armored ranks.', [group('warlord', 1, 1.5), group('ironsentinel', 4, 1.3), group('shaman', 3, 1.1), group('runner', 12, .6)]),
    scripted('Crown of crystal', 'Final boss: the Hollow King reaches the cavern heart.', [group('darkknight', 3, 1.2), group('boss', 1, 2.5), group('voidling', 8, 1), group('skeleton', 14, .55)]),
  ],
  ember: [
    scripted('Ash on the wind', 'Raiders cross the cooling lava.', [group('raider', 13, .8), group('bat', 8, .8)]),
    scripted('The black anvil', 'Iron Sentinels and golems form a tough front line.', [group('ironsentinel', 4, 1.5), group('stonegolem', 3, 1.6), group('runner', 10, .65)]),
    scripted('Cinder shamans', 'Healers follow a group of regenerating trolls.', [group('troll', 4, 1.3), group('shaman', 3, 1.2), group('grunt', 12, .65)]),
    scripted('Obsidian hides', 'Juggernauts shrug off crowd control. Damage and armor shred still matter.', [group('juggernaut', 3, 1.8), group('raider', 14, .65)]),
    scripted('The furnace champion', 'Mini-boss: an empowered Juggernaut enters the crossing.', [group('juggernaut', 1, 1, true), group('bat', 12, .6), group('runner', 12, .6)]),
    scripted('A restless furnace', 'Necromancers summon into a crowded column.', [group('necromancer', 3, 1.4), group('skeleton', 20, .45), group('shieldbearer', 4, 1.2)]),
    scripted('Rift in the slag', 'Voidlings and Wraiths combine split and stealth mechanics.', [group('voidling', 8, 1), group('shadowwraith', 6, 1.15), group('scout', 10, .65)]),
    scripted('The blazing march', 'Dark Knights escort the Warlord across the chasm.', [group('darkknight', 6, 1.2), group('warlord', 2, 1.8), group('runner', 12, .6)]),
    scripted('Ember tide', 'A broad mixed attack tests your full defense.', [group('juggernaut', 3, 1.5), group('stormconduit', 4, 1), group('troll', 4, 1.1), group('bat', 12, .55)]),
    scripted('The Hell Warden', 'Final boss: the Hell Warden claims the wastes. Fire-resistant targets need other elements.', [group('ironsentinel', 3, 1.2), group('hellwarden', 1, 2.5), group('darkknight', 5, 1.2), group('raider', 14, .6)]),
  ],
  chasm: [
    scripted('Descent into darkness', 'Raiders and Dark Knights enter first. Prepare detection before the Wraiths arrive.', [group('raider', 10, .8), group('darkknight', 5, 1.3)]),
    scripted('The first rift', 'Voidlings arrive in groups; each defeat can create more foes.', [group('voidling', 10, 1), group('runner', 12, .6)]),
    scripted('Bone procession', 'Necromancers shelter behind shields and skeletons.', [group('shieldbearer', 5, 1.1), group('necromancer', 3, 1.3), group('skeleton', 18, .5)]),
    scripted('Iron in the dark', 'Juggernauts advance through slows and stuns.', [group('juggernaut', 4, 1.6), group('darkknight', 4, 1.2), group('raider', 12, .65)]),
    scripted('The chasm marshal', 'Mini-boss: an empowered Warlord leads the hollow ranks.', [group('warlord', 1, 1, true), group('shadowwraith', 7, 1), group('bat', 14, .55)]),
    scripted('The hungry rift', 'Voidlings and necromancers create a growing swarm.', [group('voidling', 9, .9), group('necromancer', 3, 1.4), group('skeleton', 16, .5)]),
    scripted('A broken lantern', 'Heal support protects heavy golems.', [group('stonegolem', 5, 1.5), group('shaman', 4, 1.1), group('runner', 14, .6)]),
    scripted('Cold shadows', 'Frost Wights and Wraiths arrive behind armored escorts.', [group('ironsentinel', 4, 1.3), group('frostwight', 6, 1), group('shadowwraith', 6, .95)]),
    scripted('Before the abyss', 'A mixed elite guard tests every part of the road.', [group('juggernaut', 3, 1.6), group('darkknight', 6, 1.1), group('stormconduit', 5, 1), group('bat', 12, .55)]),
    scripted('Wings over the abyss', 'Final boss: the Bone Dragon rises above an army of the dead.', [group('skeleton', 8, .55), group('bonedragon', 1, 2.5), group('necromancer', 3, 1.4), group('shadowwraith', 7, 1)]),
  ],
  sanctum: [
    scripted('The sealed entrance', 'Dark Knights and visible raiders march toward the ancient shrine.', [group('darkknight', 6, 1.3), group('raider', 10, .75)]),
    scripted('Sentinels of stone', 'Armored constructs fill the crossing.', [group('stonegolem', 5, 1.5), group('ironsentinel', 4, 1.4)]),
    scripted('The lost congregation', 'Shamans and summoners shelter behind a skeleton column.', [group('skeleton', 18, .5), group('shaman', 3, 1.2), group('necromancer', 3, 1.4)]),
    scripted('Prismatic defense', 'Storm and frost defenses arrive together.', [group('stormconduit', 7, .95), group('frostwight', 7, .95), group('bat', 12, .55)]),
    scripted('The ancient sentinel', 'Mini-boss: an empowered Iron Sentinel protects the inner sanctum.', [group('ironsentinel', 1, 1, true), group('shieldbearer', 6, 1), group('runner', 16, .55)]),
    scripted('Unseen worshippers', 'Wraiths follow a fast scouting party.', [group('scout', 14, .65), group('shadowwraith', 9, 1)]),
    scripted('The broken seal', 'Voidlings split across the firing lanes.', [group('voidling', 12, .85), group('raider', 14, .6)]),
    scripted('March of the faithful', 'Warlords lead heavily armored guards.', [group('warlord', 2, 1.7), group('darkknight', 7, 1.1), group('juggernaut', 3, 1.7)]),
    scripted('The inner gate', 'Healers prolong the final elite assault.', [group('stonegolem', 4, 1.4), group('troll', 5, 1.2), group('shaman', 4, 1), group('bat', 14, .5)]),
    scripted('Crown of the sanctum', 'Final boss: the Hollow King enters the old kingdom’s sacred heart.', [group('darkknight', 4, 1.1), group('boss', 1, 2.5), group('ironsentinel', 4, 1.3), group('shadowwraith', 7, .95)]),
  ],
  voidrift: [
    scripted('Rift scouts', 'Voidlings and visible runners arrive before the gate can close.', [group('voidling', 10, 1), group('runner', 12, .65)]),
    scripted('A sky without stars', 'Bats and Wraiths test reveal and anti-air coverage.', [group('bat', 18, .5), group('shadowwraith', 8, 1.05)]),
    scripted('The rift choir', 'Conduits and necromancers support a deep column.', [group('stormconduit', 6, 1), group('necromancer', 4, 1.4), group('skeleton', 18, .45)]),
    scripted('Unyielding forms', 'Juggernauts and golems demand sustained damage.', [group('juggernaut', 5, 1.6), group('stonegolem', 5, 1.5)]),
    scripted('The rift captain', 'Mini-boss: an empowered Dark Knight guards a swarm of fragments.', [group('darkknight', 1, 1, true), group('voidling', 12, .8), group('runner', 14, .55)]),
    scripted('Fading lanterns', 'Wraiths move among shieldbearers and healers.', [group('shieldbearer', 6, 1), group('shadowwraith', 9, .95), group('shaman', 4, 1.1)]),
    scripted('Fractured ranks', 'Splitting enemies stretch the road behind the main column.', [group('voidling', 14, .75), group('necromancer', 3, 1.3), group('bat', 14, .5)]),
    scripted('The long night', 'Warlords, Knights, and Sentinels arrive in succession.', [group('warlord', 2, 1.7), group('darkknight', 8, 1.05), group('ironsentinel', 5, 1.3)]),
    scripted('The gate trembles', 'A final mixed force crosses the unstable rift.', [group('juggernaut', 4, 1.5), group('frostwight', 6, .9), group('stormconduit', 6, .9), group('shadowwraith', 8, .95)]),
    scripted('Warden of the rift', 'Final boss: the Hell Warden leads the void host through the breach.', [group('voidling', 5, .85), group('hellwarden', 1, 2.5), group('darkknight', 6, 1.1), group('bat', 16, .5)]),
  ],
  moonlit: [
    scripted('The outer wall', 'The final citadel receives a visible probing attack before the Wraiths arrive.', [group('runner', 18, .55), group('raider', 14, .6)]),
    scripted('Moonless wings', 'Flying enemies distract towers from the Wraiths below.', [group('bat', 18, .5), group('shadowwraith', 9, 1)]),
    scripted('The iron siege', 'Sentinels and Juggernauts assault the wall.', [group('ironsentinel', 6, 1.3), group('juggernaut', 4, 1.5)]),
    scripted('The pale procession', 'Necromancers replenish the skeleton ranks.', [group('necromancer', 4, 1.3), group('skeleton', 24, .4), group('shaman', 3, 1.1)]),
    scripted('The last marshal', 'Mini-boss: an empowered Warlord leads a dense elite guard.', [group('warlord', 1, 1, true), group('darkknight', 7, 1), group('troll', 5, 1.1)]),
    scripted('Arcane crossfire', 'Frost Wights and Storm Conduits punish narrow elemental choices.', [group('frostwight', 8, .9), group('stormconduit', 8, .9), group('raider', 16, .55)]),
    scripted('The splintered battalion', 'Voidlings split behind a heavy armored vanguard.', [group('stonegolem', 5, 1.4), group('voidling', 14, .75), group('runner', 14, .55)]),
    scripted('The king’s standard', 'Two Warlords shelter advancing Knights and healers.', [group('warlord', 2, 1.7), group('darkknight', 8, 1), group('shaman', 4, 1.1)]),
    scripted('Before the final bell', 'The road fills with a sustained mixed attack.', [group('juggernaut', 4, 1.5), group('ironsentinel', 5, 1.2), group('shadowwraith', 9, .9), group('bat', 16, .45)]),
    scripted('The crown returns', 'Final boss: the Hollow King reaches the last citadel with his surviving host.', [group('darkknight', 5, 1), group('boss', 1, 2.5), group('warlord', 2, 1.7), group('voidling', 10, .85)]),
  ],
  reckoning: [
    scripted('One last dawn', 'Every route has led here. A visible vanguard gives time to prepare detection.', [group('raider', 16, .7), group('runner', 14, .65)]),
    scripted('A sky of bones', 'Flying attackers arrive above the skeleton ranks.', [group('bat', 20, .5), group('skeleton', 20, .45)]),
    scripted('Iron reckoning', 'Sentinels and golems advance with regeneration support.', [group('ironsentinel', 6, 1.3), group('stonegolem', 5, 1.5), group('troll', 4, 1.2)]),
    scripted('The broken covenant', 'Healers and necromancers protect a growing army.', [group('shieldbearer', 6, 1), group('shaman', 4, 1.1), group('necromancer', 4, 1.3), group('skeleton', 16, .45)]),
    scripted('The king’s champion', 'Mini-boss: an empowered Warlord leads an armored force.', [group('warlord', 1, 1, true), group('darkknight', 8, 1), group('juggernaut', 4, 1.5)]),
    scripted('Elemental collapse', 'Frost Wights and Storm Conduits march together.', [group('frostwight', 9, .9), group('stormconduit', 9, .9), group('runner', 18, .5)]),
    scripted('The invisible host', 'Wraiths and scouts arrive beneath a swarm of bats.', [group('shadowwraith', 10, .95), group('scout', 14, .6), group('bat', 16, .45)]),
    scripted('A thousand fragments', 'Defeated Voidlings leave another wave behind them.', [group('voidling', 16, .75), group('necromancer', 4, 1.3), group('raider', 14, .55)]),
    scripted('The second champion', 'Mini-boss: an empowered Juggernaut advances through control effects.', [group('juggernaut', 1, 1, true), group('stonegolem', 6, 1.4), group('shaman', 4, 1.1)]),
    scripted('The final battalion', 'Warlords lead an unbroken line of Knights and Sentinels.', [group('warlord', 3, 1.6), group('darkknight', 9, 1), group('ironsentinel', 6, 1.2)]),
    scripted('When the rift opens', 'A sustained mixed assault precedes the final boss.', [group('juggernaut', 4, 1.5), group('shadowwraith', 10, .9), group('voidling', 12, .8), group('bat', 18, .45)]),
    scripted('Final Reckoning', 'Final boss: defeat the Hell Warden and the last elite guard to seal the rift.', [group('darkknight', 5, 1), group('hellwarden', 1, 2.5), group('warlord', 2, 1.6), group('ironsentinel', 5, 1.2), group('voidling', 10, .85)]),
  ],
};

/** Blocker circles are centered on painted tree canopies, away from road and sites. */
const MAP_TREES: Record<string, TreeBlocker[]> = {
  eldervale: [{ x: 252, y: 196, radius: 12 }, { x: 617, y: 215, radius: 13 }, { x: 787, y: 228, radius: 12 }],
  frostbound: [{ x: 353, y: 120, radius: 15 }, { x: 812, y: 342, radius: 14 }, { x: 947, y: 235, radius: 11 }],
  mirewood: [{ x: 438, y: 161, radius: 15 }, { x: 634, y: 286, radius: 14 }, { x: 704, y: 582, radius: 12 }],
  ember: [{ x: 643, y: 20, radius: 8 }, { x: 434, y: 137, radius: 8 }],
  crystal: [], // Caverns have crystals, not trees: they do not invent forest blockers.
};
const MAP_ROUTES: Record<string, { path: Point[]; pads: Foundation[] }> = {
  eldervale: { path: ELDER_PATH, pads: ELDER_PADS },
  frostbound: { path: FROSTBOUND_PATH, pads: FROSTBOUND_PADS },
  ember: { path: EMBER_PATH, pads: EMBER_PADS },
  mirewood: { path: MIREWOOD_PATH, pads: MIREWOOD_PADS },
  crystal: { path: CRYSTAL_PATH, pads: CRYSTAL_PADS },
};
/** Curated on painted banks/courtyards in world coordinates; water and cliff faces stay unbuildable. */
const RESERVE_SITES: Record<string, [string, number, number][]> = {
  eldervale: [['Gatewood bank', 115, 185], ['Bracken watch', 455, 155], ['Sentry knoll', 610, 310], ['Moss rampart', 915, 435], ['Waterfall ridge', 1005, 210]],
  frostbound: [['Glacier outpost', 195, 90], ['Lower aerie', 300, 215], ['Pine ridge', 465, 110], ['Snowfield watch', 530, 370], ['Icemelt bank', 850, 220], ['Winter rampart', 900, 345], ['Crown approach', 1010, 340]],
  ember: [['Cinder ridge', 125, 190], ['Basalt watch', 370, 225], ['Furnace bank', 510, 270], ['Ashen outpost', 575, 245], ['Obsidian court', 830, 142], ['Lava rampart', 930, 205]],
  mirewood: [['Willow watch', 145, 185], ['Reed fortress', 110, 285], ['Mossy court', 210, 310], ['Sunken rampart', 930, 438], ['Marsh overlook', 660, 280], ['Fen approach', 1020, 390], ['Cypress bank', 45, 245]],
  crystal: [['Quartz bastion', 125, 160], ['Geode overlook', 120, 230], ['Sapphire outpost', 430, 290], ['Cavern approach', 867, 185], ['Prismatic bank', 915, 285], ['Echo rampart', 300, 105]],
};
function reserveFoundations(mapKey: string, originals: Foundation[]): Foundation[] {
  return [...originals, ...RESERVE_SITES[mapKey].map(([name, x, y], index) => ({ id: originals.length + index, name, x, y }))];
}
interface StageSeed {
  id: string; name: string; mapKey: string; subtitle: string; description: string; biome: string;
  startingGold: number; enemyMultiplier: number;
}
const STAGES: StageSeed[] = [
  { id: 'eldervale', name: 'Verdant Vale', mapKey: 'eldervale', subtitle: 'THE TRAINING GROUNDS', description: 'Learn targeting, mixed damage, troops, and traps along the forest road.', biome: 'forest', startingGold: 300, enemyMultiplier: .76 },
  { id: 'windward', name: 'Windward Plateau', mapKey: 'frostbound', subtitle: 'THE HIGH ROAD', description: 'Cover flying attackers and swift scouts on the exposed mountain approach.', biome: 'plateau', startingGold: 320, enemyMultiplier: .84 },
  { id: 'mirewood', name: 'Toxic Swamp', mapKey: 'mirewood', subtitle: 'THE SUNKEN CAUSEWAY', description: 'Break healers, regenerating trolls, and skeleton summoners in the haunted fen.', biome: 'swamp', startingGold: 340, enemyMultiplier: .90 },
  { id: 'frostbound', name: 'Frostpeak', mapKey: 'frostbound', subtitle: 'THE FROZEN FRONTIER', description: 'Fight cold-resistant enemies and armored guards across the icy switchbacks.', biome: 'snow', startingGold: 350, enemyMultiplier: .95 },
  { id: 'storm', name: 'Storm Highlands', mapKey: 'frostbound', subtitle: 'THE THUNDER ROAD', description: 'Mix damage types and reveal Wraiths before the Bone Dragon arrives.', biome: 'storm', startingGold: 360, enemyMultiplier: 1 },
  { id: 'crystal', name: 'Crystal Caverns', mapKey: 'crystal', subtitle: 'THE HEART BELOW', description: 'Cover splitting Voidlings and armored constructs along the crystal road.', biome: 'crystal', startingGold: 380, enemyMultiplier: 1.04 },
  { id: 'ember', name: 'Ember Wastes', mapKey: 'ember', subtitle: 'THE ASHEN CROSSING', description: 'Stop the Hell Warden’s armored host at the lava bridge.', biome: 'fire', startingGold: 400, enemyMultiplier: 1.08 },
  { id: 'chasm', name: 'Dark Chasm', mapKey: 'ember', subtitle: 'THE LONG DESCENT', description: 'Hold against stealth, splitting enemies, and the Bone Dragon’s undead guard.', biome: 'chasm', startingGold: 420, enemyMultiplier: 1.12 },
  { id: 'sanctum', name: 'Ancient Sanctum', mapKey: 'crystal', subtitle: 'THE SEALED SHRINE', description: 'Defend the old shrine against an elite army with several elemental defenses.', biome: 'sanctum', startingGold: 440, enemyMultiplier: 1.16 },
  { id: 'voidrift', name: 'The Void Rift', mapKey: 'crystal', subtitle: 'THE UNSTABLE BREACH', description: 'Keep room for reinforcements when the fractured void host begins to split.', biome: 'void', startingGold: 460, enemyMultiplier: 1.20 },
  { id: 'moonlit', name: 'Moonlit Citadel', mapKey: 'eldervale', subtitle: 'THE LAST CITADEL', description: 'Prepare the kingdom’s remaining towers for the final siege.', biome: 'citadel', startingGold: 480, enemyMultiplier: 1.24 },
  { id: 'reckoning', name: 'Final Reckoning', mapKey: 'eldervale', subtitle: 'SEAL THE RIFT', description: 'Survive the kingdom’s final siege and defeat the Hell Warden’s host.', biome: 'reckoning', startingGold: 520, enemyMultiplier: 1.30 },
];

export const LEVELS: LevelDef[] = STAGES.map(stage => {
  const sourceWorld = MAP_GEOMETRY[stage.mapKey];
  const world = { width: sourceWorld.width, height: sourceWorld.height };
  const route = MAP_ROUTES[stage.mapKey];
  const script = SCRIPTS[stage.id];
  const hiddenAt = script.findIndex(wave => wave.enemies.some(entry => ENEMY_DEFS[entry.kind].stealth));
  const detectionHint = 'Detection needs no gems: upgrade an existing Arrow to Lantern Sentries for 55g or Ice to Aurora Lens for 65g; a new Magic spire detects immediately for 160g.';
  const waves = script.map((wave, index) => ({ ...wave, description: wave.description + (index === hiddenAt - 1 ? ` Next wave brings hidden enemies. ${detectionHint}` : index === hiddenAt ? ` ${detectionHint}` : ''), enemies: wave.enemies.map(entry => ({ ...entry })) }));
  const fit = <T extends Point>(point: T): T => ({ ...point, y: point.y * world.height / 680 });
  // The source traces ended beyond the image to hide leaks. The fitted camera now
  // shows the whole panel, so leaks finish at its exact edge instead of in a border.
  const path = route.path.map(point => fit({ x: Math.min(world.width, Math.max(0, point.x)), y: Math.min(680, Math.max(0, point.y)) }));
  const trees = MAP_TREES[stage.mapKey].map(tree => ({ ...fit(tree), radius: tree.radius * Math.sqrt(world.height / 680) }));
  return {
    ...stage, world, path, pads: reserveFoundations(stage.mapKey, route.pads.map(fit)), waves,
    // Easy and Normal begin with a small, readable patrol that one well-placed
    // base Arrow tower can handle. Hard and Hell keep their original opening.
    openingWave: scripted('First watch', 'A small goblin patrol. One Arrow tower with clear road coverage is enough; save gold for the following waves.', [group('grunt', 4, 2.4)]),
    camera: { x: world.width / 2, y: world.height / 2 },
    trees,
  };
});
