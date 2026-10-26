import type { Point, WaveDef, EnemyKind } from './model';
import { MAP_GEOMETRY } from './map-geometry';

export interface Foundation extends Point { id: number; name: string; }
export interface LevelDef {
  id: string; name: string; mapKey: string; subtitle: string; description: string;
  path: Point[]; pads: Foundation[]; waves: WaveDef[]; startingGold: number; enemyMultiplier: number;
  camera: Point;
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
];

const wave = (name: string, description: string, kinds: EnemyKind[], spacing = 1.2): WaveDef => ({
  name, description, enemies: kinds.map((kind, index) => ({ kind, delay: index * spacing })),
});
const many = (kind: EnemyKind, count: number): EnemyKind[] => Array.from({ length: count }, () => kind);
const ELDER_WAVES: WaveDef[] = [
  wave('Footsteps in the fern', 'A small scouting party. Build a ranger nest near the entrance.', many('grunt', 7), 1.55),
  wave('Quick on their feet', 'Fast runners join the attack. A frost shrine can buy time.', ['grunt', 'grunt', ...many('runner', 7), 'grunt', 'grunt'], 1.15),
  wave('Iron hides', 'Armored brutes resist arrows. Ember cannons ignore armor.', ['grunt', 'grunt', 'brute', 'runner', 'runner', 'brute', 'grunt', 'brute', 'grunt'], 1.4),
  wave('The gathering swarm', 'A close-packed swarm. Splash damage is your friend.', [...many('grunt', 13), ...many('runner', 5)], 0.65),
  wave('Heavy footsteps', 'Brutes lead the charge. Upgrade towers to level II.', ['brute', 'grunt', 'grunt', 'brute', 'runner', 'runner', 'brute', 'brute', 'grunt', 'brute', 'runner', 'brute'], 1.1),
  wave('Through the undergrowth', 'Runners dart between armored escorts.', [...many('runner', 8), 'brute', 'brute', ...many('runner', 8), 'brute'], 0.75),
  wave('Bramble battalion', 'A sustained mixed attack. Cover the second half of the trail.', ['brute', 'brute', ...many('grunt', 8), ...many('runner', 7), 'brute', 'brute', 'brute'], 0.85),
  wave('Nightfall rush', 'The fastest attack yet. Frost and splash work together.', [...many('runner', 13), ...many('brute', 6), ...many('grunt', 8)], 0.6),
  wave('The roots tremble', 'An armored vanguard. Save your meteor for tight groups.', [...many('brute', 10), ...many('runner', 12), ...many('brute', 4)], 0.85),
  wave('Shattered procession', 'Armored ranks march close together. Chain lightning punishes their formation.', ['brute', ...many('grunt', 7), 'brute', 'brute', ...many('runner', 9), ...many('brute', 6)], 0.72),
  wave('The violet breach', 'The portal surges. Upgrade your arcane spires and prepare for the king.', [...many('runner', 10), ...many('brute', 8), ...many('grunt', 10), ...many('brute', 4)], 0.64),
  wave('The Hollow King', 'The forest stands with you. Defeat the king and his final guard.', ['brute', 'brute', 'boss', ...many('runner', 8), ...many('brute', 7), ...many('grunt', 8)], 1.05),
];


/** Each region has its own formations; the original twelve-wave defense stays intact. */
const FROST_WAVES = [
  wave('Whiteout scouts', 'Runners follow the frozen road. Frost and venom can hold the approach.', [...many('grunt', 5), ...many('runner', 4)], 1.3),
  wave('Cracking ice', 'Armored escorts shelter a fast rear guard.', ['brute', ...many('grunt', 6), ...many('runner', 4), 'brute'], 1.05),
  wave('Avalanche column', 'A tightly packed column. Mortars can reach across the pass.', [...many('grunt', 12), ...many('brute', 4)], .7),
  wave('Skaters at dusk', 'A long runner rush sweeps through the bends.', [...many('runner', 14), ...many('grunt', 5)], .65),
  wave('The iron thaw', 'Armored ranks march in pairs. Upgrade your strongest coverage.', [...many('brute', 7), ...many('runner', 8)], .95),
  wave('Snowbound host', 'The pass fills with enemies. Tesla pulses punish crowded bends.', [...many('grunt', 16), ...many('brute', 6), ...many('runner', 8)], .58),
  wave('Before the storm', 'A mixed vanguard tests the entire road.', [...many('brute', 8), ...many('runner', 12), ...many('grunt', 8)], .7),
  wave('King of winter', 'The Hollow King claims the pass. Keep Starfall ready for his guard.', ['brute', 'boss', ...many('runner', 8), ...many('brute', 6)], 1.1),
];
const EMBER_WAVES = [
  wave('Ash on the wind', 'Scouts cross the cooling lava. Cover the entrance and the central crossing.', [...many('grunt', 6), ...many('runner', 4)], 1.2),
  wave('Cinder runners', 'Swift foes dash between armored guards.', ['brute', ...many('runner', 9), 'brute', ...many('grunt', 4)], .9),
  wave('Obsidian hides', 'Brutes resist arrows. Use mortar shells or toxin against their armor.', [...many('brute', 6), ...many('grunt', 6)], 1.15),
  wave('Furnace swarm', 'A close swarm pours into the chasm. Area damage buys breathing room.', [...many('grunt', 18), ...many('runner', 7)], .55),
  wave('The blazing march', 'A sustained mix of heavy troops and runners.', [...many('brute', 7), ...many('runner', 12)], .82),
  wave('Ember tide', 'The road glows with another dense attack.', [...many('grunt', 14), ...many('brute', 7), ...many('runner', 10)], .58),
  wave('The black anvil', 'An armored column leads the final assault.', [...many('brute', 12), ...many('runner', 10)], .8),
  wave('Lord of the chasm', 'The king marches through the fire with an armored escort.', ['brute', 'brute', 'boss', ...many('runner', 10), ...many('brute', 6)], 1.05),
];
const MIRE_WAVES = [
  wave('Mirelight scouts', 'Few foundations guard the causeway. Start with overlapping coverage.', [...many('grunt', 6), ...many('runner', 3)], 1.35),
  wave('Reeds in motion', 'Runners weave through the mist. Slow them before the far bend.', [...many('runner', 9), 'brute', ...many('grunt', 4)], .98),
  wave('Bog iron', 'Heavy troops enter the wetland. Venom ignores their armor.', [...many('brute', 5), ...many('grunt', 7)], 1.15),
  wave('Lantern procession', 'A dense group follows the winding causeway.', [...many('grunt', 15), ...many('runner', 6)], .65),
  wave('Sunken battalion', 'Armored pairs shield their runners.', [...many('brute', 6), ...many('runner', 10)], .9),
  wave('The hungry fen', 'A broad mixed force approaches. Upgrade before the next wave.', [...many('grunt', 12), ...many('brute', 6), ...many('runner', 8)], .65),
  wave('Last lantern', 'The mist conceals the king’s final guard.', [...many('runner', 12), ...many('brute', 8)], .78),
  wave('The drowned crown', 'The king reaches the causeway. Concentrate your upgraded towers.', ['brute', 'boss', ...many('runner', 8), ...many('brute', 5)], 1.15),
];
const CRYSTAL_WAVES = [
  wave('Echoes below', 'Scouts enter the crystal road. Every bend offers a second shot.', [...many('grunt', 6), ...many('runner', 5)], 1.2),
  wave('Prism runners', 'A rapid column approaches. Tesla and frost control the groups.', [...many('runner', 11), ...many('grunt', 5)], .85),
  wave('Gemstone guards', 'Armored ranks cross the cavern.', [...many('brute', 6), ...many('runner', 6)], 1.1),
  wave('The bright swarm', 'The cavern fills with a close-packed swarm.', [...many('grunt', 18), ...many('runner', 9)], .55),
  wave('Resonant armor', 'Heavy troops hold the front while runners follow.', [...many('brute', 8), ...many('runner', 10)], .85),
  wave('Shattered light', 'Wave after wave enters the hollow. Combine toxin with crowd damage.', [...many('grunt', 15), ...many('brute', 7), ...many('runner', 10)], .58),
  wave('The final echo', 'The king’s army makes one last rush.', [...many('runner', 14), ...many('brute', 10), ...many('grunt', 8)], .65),
  wave('Crown of crystal', 'The Hollow King leads his final host. Defend the heart of the cavern.', ['brute', 'brute', 'boss', ...many('runner', 10), ...many('brute', 8)], 1.05),
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
];
export const LEVELS: LevelDef[] = [
  { id: 'eldervale', name: 'Ruins of Eldervale', mapKey: 'eldervale', subtitle: 'THE WESTERN RIFT', description: 'Defend the ancient river road and the last citadel.', path: ELDER_PATH, pads: ELDER_PADS, waves: ELDER_WAVES, startingGold: 240, enemyMultiplier: 1, camera: { x: 550, y: 260 } },
  { id: 'frostbound', name: 'Frostbound Pass', mapKey: 'frostbound', subtitle: 'THE FROZEN FRONTIER', description: 'Guard icy switchbacks, narrow bridges, and the far snowbank.', path: FROSTBOUND_PATH, pads: FROSTBOUND_PADS, waves: FROST_WAVES, startingGold: 260, enemyMultiplier: 1.04, camera: { x: 550, y: 340 } },
  { id: 'ember', name: 'Ember Chasm', mapKey: 'ember', subtitle: 'THE ASHEN CROSSING', description: 'Hold the lava bridge and the long road to the obsidian gate.', path: EMBER_PATH, pads: EMBER_PADS, waves: EMBER_WAVES, startingGold: 280, enemyMultiplier: 1.07, camera: { x: 550, y: 340 } },
  { id: 'mirewood', name: 'Mirewood Causeway', mapKey: 'mirewood', subtitle: 'THE SUNKEN ROAD', description: 'Five islands defend a winding causeway through the haunted fen.', path: MIREWOOD_PATH, pads: MIREWOOD_PADS, waves: MIRE_WAVES, startingGold: 300, enemyMultiplier: 1.06, camera: { x: 550, y: 340 } },
  { id: 'crystal', name: 'Crystal Hollow', mapKey: 'crystal', subtitle: 'THE HEART BELOW', description: 'Defend the crystal bridge and the eastern cavern gate.', path: CRYSTAL_PATH, pads: CRYSTAL_PADS, waves: CRYSTAL_WAVES, startingGold: 320, enemyMultiplier: 1.1, camera: { x: 550, y: 340 } },
].map(level => {
  const world = MAP_GEOMETRY[level.mapKey];
  // Roads were traced against the old stretched 1100×680 panels. Apply the
  // same correction to every gameplay landmark as to the restored artwork.
  const fit = <T extends Point>(point: T): T => ({ ...point, y: point.y * world.height / 680 });
  return { ...level, world, path: level.path.map(fit), pads: level.pads.map(fit), camera: fit(level.camera) };
});
