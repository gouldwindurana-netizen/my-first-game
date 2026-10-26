import type { TowerKind } from './catalog';

/** Saved progression is independent of rendering and survives unavailable browser storage. */
export const PROGRESSION_KEY = 'mossguard-progression-v2';
export const DIFFICULTIES = ['easy', 'normal', 'hard', 'hell'] as const;
export type MetaDifficulty = typeof DIFFICULTIES[number];
export const STAGE_IDS = ['eldervale', 'windward', 'mirewood', 'frostbound', 'storm', 'crystal', 'ember', 'chasm', 'sanctum', 'voidrift', 'moonlit', 'reckoning'] as const;
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; }
export type SkillBranchId = 'damage' | 'range' | 'haste' | 'area' | 'control' | 'elemental' | 'critical' | 'economy' | 'fortify' | 'grandmastery';
export interface CombatBonuses {
  damage: number; range: number; haste: number; area: number; control: number; elemental: number;
  criticalChance: number; criticalDamage: number; gold: number; fortify: number;
  startingGold: number; extraLives: number; xp: number; gems: number;
  /** Aliases support displaying the ten skill branches; do not apply both aliases. */
  critical: number; economy: number; grandmastery: number;
  capstones: string[];
}
export interface SkillBranch { id: SkillBranchId; name: string; description: string; perRank: number; }
export interface SkillNode {
  id: string; branch: SkillBranchId; name: string; description: string;
  tier: number; maxRank: number; cost: number; prerequisite: string | null;
}
export const SKILL_BRANCHES: SkillBranch[] = [
  { id: 'damage', name: 'Damage', description: 'Increase every tower’s direct damage.', perRank: .009 },
  { id: 'range', name: 'Range', description: 'Extend tower reach without changing the map.', perRank: .007 },
  { id: 'haste', name: 'Haste', description: 'Increase attack speed and troop tempo.', perRank: .006 },
  { id: 'area', name: 'Area', description: 'Widen blasts, pulses, clouds, and lingering fields.', perRank: .008 },
  { id: 'control', name: 'Control', description: 'Improve the duration of slows, roots, and stuns.', perRank: .009 },
  { id: 'elemental', name: 'Elemental', description: 'Increase elemental damage and damaging effects.', perRank: .010 },
  { id: 'critical', name: 'Critical', description: 'Improve the chance of a critical direct hit.', perRank: .0035 },
  { id: 'economy', name: 'Economy', description: 'Earn more gold from kills and wave clears.', perRank: .005 },
  { id: 'fortify', name: 'Fortify', description: 'Improve soldier health and fortification strength.', perRank: .012 },
  { id: 'grandmastery', name: 'Grandmastery', description: 'Improve damage, reach, and attack speed together.', perRank: .0015 },
];
const NODE_NAMES: Record<SkillBranchId, string[]> = {
  damage: ['Honed Edges', 'True Aim', 'Steel Discipline', 'Heavy Impact', 'Siegecraft', 'Merciless Volley', 'Killing Ground', 'Veteran Arsenal', 'Relentless Force', 'Crown of War'],
  range: ['Watchful Eyes', 'High Ground', 'Rangefinders', 'Long Shafts', 'Far Horizon', 'Signal Towers', 'Eagle Standard', 'Distant Thunder', 'Unbroken Sight', 'Worldwatch'],
  haste: ['Quick Hands', 'Fresh Strings', 'Drillmasters', 'Light Mechanisms', 'Rapid Reload', 'Battle Rhythm', 'Tireless Crews', 'Fleet Command', 'Relentless Tempo', 'Perfect Cadence'],
  area: ['Wide Heads', 'Powder Measures', 'Ring of Frost', 'Broad Reach', 'Blast Geometry', 'Rolling Shock', 'Cloud Studies', 'Sweeping Fire', 'Overlapping Fields', 'Endless Horizon'],
  control: ['Cold Grasp', 'Binding Knots', 'Heavy Footing', 'Lingering Chill', 'Stunning Force', 'Root Network', 'Temporal Pressure', 'Stillwater', 'Commanding Presence', 'Absolute Dominion'],
  elemental: ['First Spark', 'Runic Ink', 'Icecraft', 'Living Flame', 'Voltaic Study', 'Toxic Lore', 'Earthsong', 'Prismatic Law', 'Void Attunement', 'Elemental Harmony'],
  critical: ['Weak Points', 'Patient Aim', 'Gaps in Armor', 'Lucky Shot', 'Keen Instinct', 'Measured Strike', 'Deadly Precision', 'Fateful Volley', 'Hunter’s Focus', 'Perfect Opening'],
  economy: ['Coin Pouches', 'Fair Contracts', 'Salvage Teams', 'Supply Lines', 'Guild Charter', 'Treasury Ledgers', 'Trade Roads', 'Royal Mint', 'Abundant Stores', 'Prosperous Realm'],
  fortify: ['Stout Shields', 'Field Rations', 'Stone Foundations', 'Medic Training', 'Veteran Armor', 'Defensive Drills', 'Hold the Line', 'Citadel Oath', 'Unyielding Guard', 'Lasting Bastion'],
  grandmastery: ['First Command', 'Combined Arms', 'Tactical Study', 'Disciplined Lines', 'Shared Purpose', 'Seasoned Counsel', 'Royal Strategy', 'Unified Defense', 'Legendary Command', 'Mossguard Mastery'],
};
export const SKILL_NODES: SkillNode[] = SKILL_BRANCHES.flatMap(branch => NODE_NAMES[branch.id].map((name, index) => ({
  id: `${branch.id}-${index + 1}`, branch: branch.id, name,
  description: `${branch.description} Each rank grants +${Number((branch.perRank * 100).toFixed(2))}%.`,
  tier: index + 1, maxRank: index === 9 ? 5 : 3, cost: 14 + index * 7,
  prerequisite: index === 0 ? null : `${branch.id}-${index}`,
})));
const nodeById = new Map(SKILL_NODES.map(node => [node.id, node]));
export interface Capstone {
  id: string; name: string; description: string; cost: number;
  requires: Partial<Record<SkillBranchId, number>>; totalRanks?: number;
  bonuses: Partial<CombatBonuses>;
}
export const CAPSTONES: Capstone[] = [
  { id: 'arsenal', name: 'Royal Arsenal', description: '+8% damage. A permanent reward for mastering aim and reach.', cost: 1200, requires: { damage: 15, range: 10 }, bonuses: { damage: .08 } },
  { id: 'stormheart', name: 'Stormheart', description: '+8% area and +5% control duration.', cost: 1200, requires: { haste: 15, area: 10 }, bonuses: { area: .08, control: .05 } },
  { id: 'elemental-crown', name: 'Elemental Crown', description: '+10% elemental damage.', cost: 1400, requires: { elemental: 20, control: 10 }, bonuses: { elemental: .10 } },
  { id: 'sunder', name: 'Sunder the Crown', description: '+3% critical chance and +20% critical damage.', cost: 1300, requires: { critical: 15, damage: 15 }, bonuses: { criticalChance: .03, criticalDamage: .20 } },
  { id: 'golden-age', name: 'Golden Age', description: '+8% gold earnings and +30 starting gold.', cost: 1800, requires: { economy: 20 }, bonuses: { gold: .08, startingGold: 30 } },
  { id: 'unbroken', name: 'The Unbroken', description: '+12% fortification strength and four keep lives.', cost: 1500, requires: { fortify: 20, control: 10 }, bonuses: { fortify: .12, extraLives: 4 } },
  { id: 'grandmaster', name: 'Grandmaster’s Oath', description: '+4% damage, range, and attack speed.', cost: 2500, requires: { grandmastery: 20 }, totalRanks: 120, bonuses: { damage: .04, range: .04, haste: .04 } },
];
export interface ShopItem {
  id: string; name: string; description: string; cost: number; maxRank: number;
  tower?: TowerKind; bonuses?: Partial<CombatBonuses>;
}
export const SHOP_ITEMS: ShopItem[] = [
  { id: 'unlock-void', name: 'Void Spire', description: 'Permanently unlock Void and its four branches.', cost: 45, maxRank: 1, tower: 'void' },
  { id: 'unlock-solar', name: 'Solar Sanctum', description: 'Permanently unlock Solar and its four branches.', cost: 50, maxRank: 1, tower: 'solar' },
  { id: 'unlock-chrono', name: 'Chrono Shrine', description: 'Permanently unlock Chrono and its four branches.', cost: 55, maxRank: 1, tower: 'chrono' },
  { id: 'unlock-truesight', name: 'Truesight Watch', description: 'Permanently unlock Truesight and its four branches.', cost: 40, maxRank: 1, tower: 'truesight' },
  { id: 'unlock-nexus', name: 'Nexus Heart', description: 'Permanently unlock Nexus and its four branches.', cost: 90, maxRank: 1, tower: 'nexus' },
  { id: 'supply-cache', name: 'Supply Cache', description: '+15 starting gold per rank. Five permanent ranks.', cost: 22, maxRank: 5, bonuses: { startingGold: 15 } },
  { id: 'keep-charter', name: 'Keep Charter', description: '+1 keep life per rank. Four permanent ranks.', cost: 25, maxRank: 4, bonuses: { extraLives: 1 } },
  { id: 'field-journal', name: 'Field Journal', description: '+5% stage XP per rank. Four permanent ranks.', cost: 20, maxRank: 4, bonuses: { xp: .05 } },
];
const shopById = new Map(SHOP_ITEMS.map(item => [item.id, item]));
const capstoneById = new Map(CAPSTONES.map(item => [item.id, item]));
const BASE_TOWERS: TowerKind[] = ['archer', 'cannon', 'mortar', 'frost', 'earth', 'arcane', 'tesla', 'venom', 'prism', 'trap', 'sonic', 'barracks'];
export interface StageProgress { bestWave: number; stars: number; cleared: boolean; clears: number; highestLives: number; maxLives: number; }
export interface ProgressionState {
  version: 2; xp: number; gems: number; lifetimeXP: number; lifetimeGems: number;
  skillRanks: Record<string, number>; capstones: string[]; shopRanks: Record<string, number>;
  stages: Record<string, Partial<Record<MetaDifficulty, StageProgress>>>; claimedRuns: string[];
}
export interface StageResult {
  stageId: string; difficulty: MetaDifficulty; lives: number; maxLives: number;
  wave: number; won: boolean; runId: string;
}
export interface StageReward { xp: number; gems: number; stars: number; firstClear: boolean; duplicate: boolean; }
const ZERO_REWARD: StageReward = { xp: 0, gems: 0, stars: 0, firstClear: false, duplicate: false };
const integer = (value: unknown, cap = 1_000_000_000) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(cap, Math.floor(value))) : 0;
const plain = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const blankState = (): ProgressionState => ({ version: 2, xp: 0, gems: 0, lifetimeXP: 0, lifetimeGems: 0, skillRanks: {}, capstones: [], shopRanks: {}, stages: {}, claimedRuns: [] });
export function starsForLives(lives: number, maxLives: number): number {
  if (!Number.isFinite(lives) || !Number.isFinite(maxLives) || lives <= 0 || maxLives <= 0) return 0;
  const ratio = Math.min(1, lives / maxLives);
  return ratio >= .9 ? 3 : ratio >= .5 ? 2 : 1;
}
/** Rank is the number already owned; escalating costs make late ranks useful XP sinks. */
export function skillCost(node: SkillNode | string, rank = 0): number {
  const definition = typeof node === 'string' ? nodeById.get(node) : node;
  if (!definition || !Number.isInteger(rank) || rank < 0 || rank >= definition.maxRank) return 0;
  return Math.round(definition.cost * (1 + rank * .65));
}
function availableStorage(): StorageLike | null { try { return globalThis.localStorage ?? null; } catch { return null; } }

export class Progression {
  private value = blankState();
  private readonly storage: StorageLike | null;
  private readonly stageIds: string[];
  private readonly legacyMap: Record<string, string>;
  storageAvailable: boolean;
  constructor(storage: StorageLike | null = availableStorage(), stageIds: readonly string[] = STAGE_IDS, legacyMap: Record<string, string> = {}) {
    this.storage = storage; this.storageAvailable = !!storage;
    this.stageIds = [...new Set(stageIds.filter(id => typeof id === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(id)))];
    this.legacyMap = legacyMap;
    this.load();
  }
  get state(): ProgressionState { return clone(this.value); }
  snapshot(): ProgressionState { return this.state; }
  get xp(): number { return this.value.xp; }
  get gems(): number { return this.value.gems; }
  get totalRanks(): number { return Object.values(this.value.skillRanks).reduce((sum, rank) => sum + rank, 0); }
  branchRanks(branch: SkillBranchId): number { return SKILL_NODES.filter(node => node.branch === branch).reduce((sum, node) => sum + (this.value.skillRanks[node.id] || 0), 0); }
  get unlockedTowers(): TowerKind[] { return [...BASE_TOWERS, ...SHOP_ITEMS.filter(item => item.tower && this.value.shopRanks[item.id] > 0).map(item => item.tower!)]; }
  get unlockedCapstones(): string[] { return [...this.value.capstones]; }
  get bonuses(): CombatBonuses {
    const ranks = (branch: SkillBranchId) => this.branchRanks(branch);
    const mastery = ranks('grandmastery') * .0015;
    const result: CombatBonuses = {
      damage: ranks('damage') * .009 + mastery, range: ranks('range') * .007 + mastery,
      haste: ranks('haste') * .006 + mastery, area: ranks('area') * .008,
      control: ranks('control') * .009, elemental: ranks('elemental') * .01,
      criticalChance: ranks('critical') * .0035, criticalDamage: .5,
      gold: ranks('economy') * .005, fortify: ranks('fortify') * .012,
      startingGold: 0, extraLives: 0, xp: 0, gems: 0,
      critical: 0, economy: 0, grandmastery: mastery, capstones: [...this.value.capstones],
    };
    const add = (bonuses: Partial<CombatBonuses>, count = 1) => {
      for (const [key, amount] of Object.entries(bonuses)) {
        if (typeof amount === 'number' && Number.isFinite(amount) && typeof result[key as keyof CombatBonuses] === 'number') {
          (result as unknown as Record<string, number>)[key] += amount * count;
        }
      }
    };
    for (const id of this.value.capstones) add(capstoneById.get(id)!.bonuses);
    for (const item of SHOP_ITEMS) if (item.bonuses) add(item.bonuses, this.value.shopRanks[item.id] || 0);
    for (const key of ['damage', 'range', 'haste', 'area', 'control', 'elemental', 'gold', 'fortify'] as const) result[key] = Math.min(.6, result[key]);
    result.criticalChance = Math.min(.3, result.criticalChance); result.criticalDamage = Math.min(1, result.criticalDamage);
    result.startingGold = Math.min(150, result.startingGold); result.extraLives = Math.min(8, result.extraLives);
    result.xp = Math.min(.2, result.xp); result.gems = Math.min(.2, result.gems);
    result.critical = result.criticalChance; result.economy = result.gold;
    return result;
  }
  getSkillCost(id: string): number { return skillCost(id, this.value.skillRanks[id] || 0); }
  canBuySkill(id: string): boolean {
    const node = nodeById.get(id), cost = this.getSkillCost(id);
    return !!node && cost > 0 && this.value.xp >= cost && (!node.prerequisite || (this.value.skillRanks[node.prerequisite] || 0) >= 1);
  }
  buySkill(id: string): boolean {
    if (!this.canBuySkill(id)) return false;
    this.value.xp -= this.getSkillCost(id); this.value.skillRanks[id] = (this.value.skillRanks[id] || 0) + 1;
    this.save(); return true;
  }
  canBuyCapstone(id: string): boolean {
    const item = capstoneById.get(id);
    return !!item && !this.value.capstones.includes(id) && this.value.xp >= item.cost && this.meetsCapstone(item);
  }
  private meetsCapstone(item: Capstone): boolean {
    return this.totalRanks >= (item.totalRanks || 0) && Object.entries(item.requires).every(([branch, count]) => this.branchRanks(branch as SkillBranchId) >= count);
  }
  buyCapstone(id: string): boolean {
    if (!this.canBuyCapstone(id)) return false;
    this.value.xp -= capstoneById.get(id)!.cost; this.value.capstones.push(id); this.save(); return true;
  }
  getShopCost(id: string): number {
    const item = shopById.get(id), rank = this.value.shopRanks[id] || 0;
    return !item || rank >= item.maxRank ? 0 : Math.round(item.cost * (1 + rank * .5));
  }
  canShopPurchase(id: string): boolean { const cost = this.getShopCost(id); return cost > 0 && this.value.gems >= cost; }
  shopPurchase(id: string): boolean {
    if (!this.canShopPurchase(id)) return false;
    this.value.gems -= this.getShopCost(id); this.value.shopRanks[id] = (this.value.shopRanks[id] || 0) + 1; this.save(); return true;
  }
  /** A free respec returns 80% of exact spent XP, including any capstones. */
  resetSkills(): number {
    let spent = 0;
    for (const node of SKILL_NODES) for (let rank = 0; rank < (this.value.skillRanks[node.id] || 0); rank++) spent += skillCost(node, rank);
    for (const id of this.value.capstones) spent += capstoneById.get(id)!.cost;
    const refund = Math.floor(spent * .8); this.value.xp = Math.min(1_000_000_000, this.value.xp + refund);
    this.value.skillRanks = {}; this.value.capstones = []; this.save(); return refund;
  }
  stageProgress(stageId: string, difficulty: MetaDifficulty = 'normal'): StageProgress | null {
    const progress = this.value.stages[stageId]?.[difficulty]; return progress ? { ...progress } : null;
  }
  recordResult(result: StageResult): StageReward {
    if (!this.stageIds.includes(result.stageId) || !DIFFICULTIES.includes(result.difficulty) || typeof result.runId !== 'string' || !result.runId.trim() || result.runId.length > 160 || !Number.isFinite(result.lives) || !Number.isFinite(result.maxLives) || result.maxLives <= 0 || !Number.isFinite(result.wave)) return { ...ZERO_REWARD };
    if (this.value.claimedRuns.includes(result.runId)) return { ...ZERO_REWARD, duplicate: true };
    this.value.claimedRuns.push(result.runId); this.value.claimedRuns = this.value.claimedRuns.slice(-100);
    const old = this.value.stages[result.stageId]?.[result.difficulty];
    const won = result.won === true && result.lives > 0;
    const stars = won ? starsForLives(result.lives, result.maxLives) : 0;
    const firstClear = won && !old?.cleared;
    const earnedStars = Math.max(0, stars - (old?.stars || 0));
    const stageIndex = this.stageIds.indexOf(result.stageId), difficultyIndex = DIFFICULTIES.indexOf(result.difficulty);
    const rewardMultiplier = [.75, 1, 1.35, 1.7][difficultyIndex];
    const firstXP = (130 + stageIndex * 20 + stars * 15) * rewardMultiplier;
    const replayXP = (30 + stageIndex * 5 + earnedStars * 20) * rewardMultiplier;
    const xp = won ? Math.round((firstClear ? firstXP : replayXP) * (1 + this.bonuses.xp)) : 0;
    // Gems belong to first clears and improved star records; replay XP remains useful.
    const gems = won ? Math.round(((firstClear ? 17 + stageIndex + difficultyIndex * 5 : 0) + earnedStars * 3) * (1 + this.bonuses.gems)) : 0;
    this.value.xp = Math.min(1_000_000_000, this.value.xp + xp); this.value.gems = Math.min(1_000_000, this.value.gems + gems);
    this.value.lifetimeXP = Math.min(1_000_000_000, this.value.lifetimeXP + xp); this.value.lifetimeGems = Math.min(1_000_000_000, this.value.lifetimeGems + gems);
    const stage: StageProgress = {
      bestWave: Math.max(old?.bestWave || 0, integer(result.wave, 99)), stars: Math.max(old?.stars || 0, stars),
      cleared: !!old?.cleared || won, clears: Math.min(1_000_000, (old?.clears || 0) + (won ? 1 : 0)),
      highestLives: Math.max(old?.highestLives || 0, won ? integer(result.lives, 1000) : 0),
      maxLives: Math.max(old?.maxLives || 0, integer(result.maxLives, 1000)),
    };
    (this.value.stages[result.stageId] ||= {})[result.difficulty] = stage;
    this.save(); return { xp, gems, stars, firstClear, duplicate: false };
  }
  completeStage(stageId: string, difficulty: MetaDifficulty, lives: number, maxLives: number, wave: number, runId: string): StageReward {
    return this.recordResult({ stageId, difficulty, lives, maxLives, wave, won: lives > 0, runId });
  }
  save(): boolean {
    if (!this.storage) return false;
    try { this.storage.setItem(PROGRESSION_KEY, JSON.stringify(this.value)); this.storageAvailable = true; return true; }
    catch { this.storageAvailable = false; return false; }
  }
  private read(key: string): unknown {
    if (!this.storage) return null;
    try { const text = this.storage.getItem(key); return text ? JSON.parse(text) as unknown : null; }
    catch { this.storageAvailable = false; return null; }
  }
  private load(): void {
    const saved = this.read(PROGRESSION_KEY);
    if (plain(saved) && saved.version === 2) {
      const next = blankState(); next.xp = integer(saved.xp); next.gems = integer(saved.gems, 1_000_000);
      next.lifetimeXP = Math.max(next.xp, integer(saved.lifetimeXP)); next.lifetimeGems = Math.max(next.gems, integer(saved.lifetimeGems));
      if (plain(saved.skillRanks)) for (const node of SKILL_NODES) {
        const rank = integer(saved.skillRanks[node.id], node.maxRank);
        if (rank > 0 && (!node.prerequisite || (next.skillRanks[node.prerequisite] || 0) > 0)) next.skillRanks[node.id] = rank;
      }
      if (plain(saved.shopRanks)) for (const item of SHOP_ITEMS) { const rank = integer(saved.shopRanks[item.id], item.maxRank); if (rank) next.shopRanks[item.id] = rank; }
      this.value = next;
      if (Array.isArray(saved.capstones)) for (const id of saved.capstones) if (typeof id === 'string' && !next.capstones.includes(id)) {
        const item = capstoneById.get(id); if (item && this.meetsCapstone(item)) next.capstones.push(id);
      }
      if (plain(saved.stages)) for (const stageId of this.stageIds) {
        const stages = saved.stages[stageId]; if (!plain(stages)) continue;
        for (const difficulty of DIFFICULTIES) {
          const entry = stages[difficulty]; if (!plain(entry)) continue;
          const cleared = entry.cleared === true;
          const stars = cleared ? Math.max(1, integer(entry.stars, 3)) : 0;
          (next.stages[stageId] ||= {})[difficulty] = { bestWave: integer(entry.bestWave, 99), stars, cleared, clears: integer(entry.clears, 1_000_000), highestLives: integer(entry.highestLives, 1000), maxLives: integer(entry.maxLives, 1000) };
        }
      }
      if (Array.isArray(saved.claimedRuns)) next.claimedRuns = [...new Set(saved.claimedRuns.filter((id): id is string => typeof id === 'string' && !!id.trim() && id.length <= 160))].slice(-100);
      return;
    }
    this.migrateLegacy();
  }
  private migrateLegacy(): void {
    const legacy = this.read('mossguard-campaign');
    if (plain(legacy)) for (const [oldId, oldEntry] of Object.entries(legacy)) {
      const stageId = this.legacyMap[oldId] || oldId;
      if (!this.stageIds.includes(stageId) || !plain(oldEntry)) continue;
      const bestWave = integer(oldEntry.best, 99), cleared = oldEntry.completed === true;
      if (bestWave || cleared) this.value.stages[stageId] = { normal: { bestWave, cleared, stars: cleared ? 1 : 0, clears: cleared ? 1 : 0, highestLives: 0, maxLives: 20 } };
    }
    const legacyBest = integer(this.read('mossguard-best'), 12), elderId = this.legacyMap.eldervale || 'eldervale';
    if (legacyBest > 0 && this.stageIds.includes(elderId) && !this.value.stages[elderId]) this.value.stages[elderId] = { normal: { bestWave: legacyBest, cleared: legacyBest >= 12, stars: legacyBest >= 12 ? 1 : 0, clears: legacyBest >= 12 ? 1 : 0, highestLives: 0, maxLives: 20 } };
    // Migration preserves victories without retroactively paying unverifiable rewards.
    if (Object.keys(this.value.stages).length) this.save();
  }
}
