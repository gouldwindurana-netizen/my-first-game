import { ENEMY_DEFS, ENEMY_COUNTERS, type EnemyKind } from './catalog';
import type { LevelDef } from './levels';
import type { Difficulty, WaveDef } from './model';

/** A difficulty changes the campaign's length and formations, not just a health multiplier. */
export const WAVES_BY_DIFFICULTY: Record<Difficulty, number> = { easy: 25, normal: 50, hard: 75, hell: 100 };
const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'normal', 'hard', 'hell'];
const BOSSES: EnemyKind[] = ['boss', 'bonedragon', 'hellwarden'];
interface Introduction { kind: EnemyKind; wave: number; difficulty?: number; }

/** New mechanics enter in small, visible lessons before they join combined formations. */
const INTRODUCTIONS: Introduction[] = [
  { kind: 'grunt', wave: 1 }, { kind: 'runner', wave: 2 },
  { kind: 'raider', wave: 3 }, { kind: 'skeleton', wave: 3 }, { kind: 'scout', wave: 4 },
  { kind: 'brute', wave: 5 }, { kind: 'bat', wave: 6 }, { kind: 'shieldbearer', wave: 7 },
  { kind: 'swarmmite', wave: 8 }, { kind: 'shaman', wave: 9 }, { kind: 'ogre', wave: 10 },
  { kind: 'troll', wave: 11 }, { kind: 'frostwolf', wave: 12 }, { kind: 'frostwight', wave: 13 },
  { kind: 'emberimp', wave: 14 }, { kind: 'necromancer', wave: 15 }, { kind: 'mossbeetle', wave: 16 },
  { kind: 'stonegolem', wave: 17 },
  { kind: 'darkknight', wave: 10, difficulty: 1 }, { kind: 'stormsprite', wave: 12, difficulty: 1 },
  { kind: 'stormconduit', wave: 14, difficulty: 1 }, { kind: 'voidling', wave: 18, difficulty: 1 },
  { kind: 'ironsentinel', wave: 20, difficulty: 1 }, { kind: 'plaguecarrier', wave: 21, difficulty: 1 },
  { kind: 'shadowwraith', wave: 22, difficulty: 1 }, { kind: 'arcanewarden', wave: 24, difficulty: 1 },
  { kind: 'juggernaut', wave: 25, difficulty: 1 }, { kind: 'crystaldrone', wave: 28, difficulty: 1 },
  { kind: 'warlord', wave: 30, difficulty: 1 },
  { kind: 'siegebeast', wave: 32, difficulty: 2 }, { kind: 'cinderdrake', wave: 38, difficulty: 2 },
  { kind: 'banshee', wave: 44, difficulty: 2 }, { kind: 'nullpriest', wave: 50, difficulty: 2 },
  { kind: 'mirrorknight', wave: 56, difficulty: 3 }, { kind: 'plaguewitch', wave: 62, difficulty: 3 },
  { kind: 'riftassassin', wave: 68, difficulty: 3 }, { kind: 'abysschampion', wave: 74, difficulty: 3 },
];

const THEMES: Record<string, EnemyKind[]> = {
  forest: ['grunt', 'runner', 'swarmmite', 'mossbeetle', 'shaman'],
  plateau: ['bat', 'runner', 'stormsprite', 'crystaldrone', 'cinderdrake'],
  swamp: ['skeleton', 'shaman', 'necromancer', 'troll', 'plaguecarrier', 'plaguewitch'],
  snow: ['frostwolf', 'frostwight', 'runner', 'shieldbearer', 'cinderdrake'],
  storm: ['stormsprite', 'stormconduit', 'bat', 'ironsentinel', 'siegebeast'],
  crystal: ['mossbeetle', 'stonegolem', 'arcanewarden', 'crystaldrone', 'mirrorknight'],
  fire: ['emberimp', 'ogre', 'ironsentinel', 'cinderdrake', 'siegebeast'],
  chasm: ['skeleton', 'scout', 'shadowwraith', 'voidling', 'banshee', 'riftassassin'],
  sanctum: ['darkknight', 'arcanewarden', 'shaman', 'nullpriest', 'mirrorknight'],
  void: ['voidling', 'shadowwraith', 'crystaldrone', 'nullpriest', 'abysschampion'],
  citadel: ['shieldbearer', 'darkknight', 'warlord', 'siegebeast', 'riftassassin'],
  reckoning: ['juggernaut', 'ironsentinel', 'stormconduit', 'plaguewitch', 'abysschampion'],
};

interface Formation { name: string; kinds: EnemyKind[]; weights?: number[]; tip: string; }
const FORMATIONS: Formation[] = [
  { name: 'The marching line', kinds: ['grunt', 'raider', 'mossbeetle'], tip: 'Arrows cover light infantry; Ice gives the line more time under fire.' },
  { name: 'Swift pursuit', kinds: ['runner', 'frostwolf', 'riftassassin'], tip: 'Fastest targeting, slows, rally-point soldiers, and road traps catch fast attackers.' },
  { name: 'A gathering swarm', kinds: ['swarmmite', 'skeleton', 'plaguecarrier'], tip: 'Mortars clear ground swarms; Tesla chains and poison clouds cover clustered survivors.' },
  { name: 'Steel and stone', kinds: ['shieldbearer', 'stonegolem', 'ironsentinel'], tip: 'Heavy armor rewards elemental damage, lightning, and poison armor-shredding upgrades.' },
  { name: 'The elemental host', kinds: ['frostwight', 'emberimp', 'stormsprite'], tip: 'Mix elements: use fire against frost, Ice against flame, and Arrow, Ice, or holy beams against airborne Storm Sprites.' },
  { name: 'Behind the shields', kinds: ['shieldbearer', 'shaman', 'necromancer'], weights: [4, 1, 1], tip: 'Reach the support line with mortar splash or Sonic silence before healing and summons accumulate.' },
  { name: 'The hidden road', kinds: ['scout', 'shadowwraith', 'banshee'], tip: 'Lantern Sentries, Aurora Lens, Magic, and Prism provide ordinary gold detection; holy damage punishes ghosts.' },
  { name: 'Wings over the road', kinds: ['bat', 'crystaldrone', 'cinderdrake'], tip: 'Arrow, Tesla, and Prism cover flying attackers. Earth, ground traps, and soldiers cannot hit the sky.' },
  { name: 'The warded vanguard', kinds: ['arcanewarden', 'mirrorknight', 'darkknight'], tip: 'Arcane-resistant wardens reward physical artillery. Holy and poison provide other answers to armored escorts.' },
  { name: 'The siege column', kinds: ['ogre', 'troll', 'siegebeast'], tip: 'Strongest targeting handles heavy targets; burning stops Troll regeneration while poison and quakes punish their slow march.' },
];

function stageNumber(level: LevelDef): number {
  return [...level.id].reduce((sum, character) => sum + character.charCodeAt(0), 0);
}
function copyWave(wave: WaveDef): WaveDef {
  return { ...wave, enemies: wave.enemies.map(enemy => ({ ...enemy })) };
}
function availableRoster(wave: number, difficulty: number): EnemyKind[] {
  return INTRODUCTIONS.filter(entry => entry.wave <= wave && (entry.difficulty || 0) <= difficulty).map(entry => entry.kind);
}
function counterText(kinds: EnemyKind[]): string {
  const distinct = [...new Set(kinds)];
  return distinct.slice(0, 3).map(kind => `${ENEMY_DEFS[kind].name}: ${ENEMY_COUNTERS[kind].tip}`).join(' ');
}
function makeWave(name: string, description: string, groups: { kind: EnemyKind; count: number; spacing: number; miniBoss?: boolean }[]): WaveDef {
  let delay = 0;
  const enemies = groups.flatMap((group, groupIndex) => {
    if (groupIndex) delay += .65;
    return Array.from({ length: group.count }, () => {
      const entry = { kind: group.kind, delay, ...(group.miniBoss ? { miniBoss: true } : {}) };
      delay += group.spacing;
      return entry;
    });
  });
  return { name, description, enemies };
}

/** Deterministic authored recipes retain regional flavor and bound the spawn budget at 44. */
export function generateWaves(level: LevelDef, difficulty: Difficulty): WaveDef[] {
  const rank = DIFFICULTY_ORDER.indexOf(difficulty), count = WAVES_BY_DIFFICULTY[difficulty];
  const seed = stageNumber(level), theme = THEMES[level.biome] || THEMES.forest;
  const waves: WaveDef[] = [];
  for (let number = 1; number <= count; number++) {
    if (number === 1) {
      waves.push(rank < 2 ? copyWave(level.openingWave) : makeWave('The first vanguard', 'A visible opening patrol. Build overlapping coverage and prepare ordinary detection before the scouts arrive.', [{ kind: 'grunt', count: 6 + rank, spacing: 1.3 }, { kind: 'runner', count: rank, spacing: 1.5 }]));
      continue;
    }
    const roster = availableRoster(number, rank);
    const eligible = new Set(roster);
    const fresh = INTRODUCTIONS.filter(entry => entry.wave === number && (entry.difficulty || 0) <= rank).map(entry => entry.kind);
    const original = level.waves[(number - 2) % Math.max(1, level.waves.length - 1)];
    const regional = [...new Set([...theme, ...original.enemies.map(enemy => enemy.kind)])].filter(kind => eligible.has(kind) && !BOSSES.includes(kind));
    const recipe = FORMATIONS[(number + seed) % FORMATIONS.length];
    let kinds = recipe.kinds.filter(kind => eligible.has(kind));
    // First sightings are small lessons. Regional reinforcements then revisit them in mixed formations.
    if (fresh.length) kinds = [...fresh, ...kinds];
    const regionalKind = regional[(Math.floor(number / 3) + seed) % Math.max(1, regional.length)];
    if (regionalKind) kinds.push(regionalKind);
    kinds = [...new Set(kinds)].slice(0, number < 6 ? 2 : number < 15 ? 3 : 4);
    if (!kinds.length) kinds = [roster[(number + seed) % roster.length]];
    if (number < 4) kinds = kinds.filter(kind => !ENEMY_DEFS[kind].stealth);
    const total = Math.min(number % 5 === 0 ? 43 : 44, 6 + Math.floor(Math.sqrt(number) * 2) + Math.floor(number / 12) + rank * 2);
    const spacing = Math.max(.46, 1.24 - Math.min(number, 75) * .008 - rank * .035);
    const weights = kinds.map(kind => recipe.weights?.[recipe.kinds.indexOf(kind)] || 1);
    const weightTotal = weights.reduce((sum, weight) => sum + weight, 0), remainder = Math.max(0, total - kinds.length * 2);
    const counts = weights.map(weight => 2 + Math.floor(remainder * weight / weightTotal));
    for (let extra = total - counts.reduce((sum, count) => sum + count, 0), index = 0; extra > 0; extra--, index++) counts[index % counts.length]++;
    let lessonEscorts = 0;
    for (let index = 0; index < kinds.length; index++) if (fresh.includes(kinds[index])) {
      const limit = ENEMY_DEFS[kinds[index]].hp >= 300 ? 2 : 4;
      lessonEscorts += Math.max(0, counts[index] - limit); counts[index] = Math.min(counts[index], limit);
    }
    if (lessonEscorts) {
      let escort = kinds.findIndex(kind => !fresh.includes(kind) && ENEMY_DEFS[kind].hp < 300);
      if (escort < 0) { escort = kinds.length; kinds.push('grunt'); counts.push(0); }
      counts[escort] += lessonEscorts;
    }
    const groups = kinds.map((kind, index) => ({ kind, count: counts[index], spacing: spacing + (ENEMY_DEFS[kind].hp >= 300 ? .28 : 0) }));
    const matchesRecipe = kinds.some(kind => recipe.kinds.includes(kind));
    let name = fresh.length ? `${ENEMY_DEFS[fresh[0]].name} advance` : matchesRecipe ? recipe.name : `${ENEMY_DEFS[kinds[0]].name} patrol`;
    let description = `${matchesRecipe ? recipe.tip + ' ' : ''}${counterText(kinds)}`;
    if (number % 5 === 0 && number !== count) {
      const championPool = ['brute', 'ogre', 'troll', 'stonegolem', 'juggernaut', 'warlord', 'siegebeast', 'abysschampion'] as EnemyKind[];
      const champions = championPool.filter(kind => eligible.has(kind));
      const champion = champions[Math.min(champions.length - 1, Math.floor(number / 10))] || 'brute';
      groups.unshift({ kind: champion, count: 1, spacing: 1.75 });
      name = `${ENEMY_DEFS[champion].name} champion`;
      description = `Champion wave: one empowered ${ENEMY_DEFS[champion].name} leads a mixed column. ${counterText([champion])} ${description}`;
    }
    if (number === count) {
      const originalBoss = level.waves.at(-1)!.enemies.find(enemy => BOSSES.includes(enemy.kind))?.kind || 'boss';
      const finaleEscorts = groups.slice(0, rank >= 2 ? 4 : 3).map(group => ({ ...group, count: Math.min(group.count, rank >= 2 ? 6 : 5) }));
      groups.splice(0, groups.length, { kind: originalBoss, count: rank === 3 ? 2 : 1, spacing: 3 }, ...finaleEscorts);
      name = level.waves.at(-1)!.name;
      description = `Final assault · ${count} waves. ${counterText([originalBoss])} Finish the boss while your other damage types cover its escorts.`;
    }
    const wave = makeWave(name, description, groups);
    if (number % 5 === 0 && number !== count) wave.enemies[0].miniBoss = true;
    waves.push(wave);
  }
  const detectionHint = 'Detection needs no gems: an existing Arrow has a 55g Lantern upgrade, Ice has a 65g Aurora Lens, and a new Magic spire detects immediately for 160g. Research uses permanent family XP; upgrades have no wave-clear lock.';
  for (let index = 0; index < waves.length; index++) {
    const hidden = waves[index].enemies.some(enemy => ENEMY_DEFS[enemy.kind].stealth);
    if (hidden) waves[index].description += ` ${detectionHint}`;
    if (!hidden && waves[index + 1]?.enemies.some(enemy => ENEMY_DEFS[enemy.kind].stealth)) waves[index].description += ` Next wave has hidden enemies. ${detectionHint}`;
  }
  return waves;
}
