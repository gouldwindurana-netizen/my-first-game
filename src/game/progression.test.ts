import { describe, expect, it } from 'vitest';
import {
  CAPSTONES, DIFFICULTIES, Progression, PROGRESSION_KEY, SHOP_ITEMS, SKILL_BRANCHES,
  SKILL_NODES, STAGE_IDS, skillCost, starsForLives, type StageResult, type StorageLike,
} from './progression';

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}
function funded(xp = 100_000, gems = 1000) {
  const storage = new MemoryStorage();
  storage.setItem(PROGRESSION_KEY, JSON.stringify({ version: 2, xp, gems }));
  return { storage, meta: new Progression(storage) };
}
const result = (overrides: Partial<StageResult> = {}): StageResult => ({ stageId: 'eldervale', difficulty: 'normal', lives: 20, maxLives: 20, wave: 8, won: true, runId: 'session-1/run-1', ...overrides });

describe('campaign meta progression', () => {
  it('provides 100 ranked nodes, ten branches, seven capstones, and five gem tower unlocks', () => {
    expect(SKILL_BRANCHES).toHaveLength(10); expect(SKILL_NODES).toHaveLength(100); expect(CAPSTONES).toHaveLength(7);
    expect(new Set(SKILL_NODES.map(node => node.id)).size).toBe(100);
    for (const branch of SKILL_BRANCHES) expect(SKILL_NODES.filter(node => node.branch === branch.id)).toHaveLength(10);
    expect(SKILL_NODES.every(node => node.maxRank === 3 || node.maxRank === 5)).toBe(true);
    expect(SHOP_ITEMS.filter(item => item.tower)).toHaveLength(5);
    expect(STAGE_IDS).toHaveLength(12); expect(DIFFICULTIES).toEqual(['easy', 'normal', 'hard', 'hell']);
  });

  it('awards one to three stars by lives remaining and rejects invalid life pools', () => {
    expect(starsForLives(20, 20)).toBe(3); expect(starsForLives(18, 20)).toBe(3);
    expect(starsForLives(17, 20)).toBe(2); expect(starsForLives(10, 20)).toBe(2);
    expect(starsForLives(9, 20)).toBe(1); expect(starsForLives(1, 20)).toBe(1);
    for (const [lives, max] of [[0, 20], [-1, 20], [20, 0], [NaN, 20], [20, Infinity]]) expect(starsForLives(lives, max)).toBe(0);
  });

  it('charges exact escalating XP costs, checks prerequisites, and caps ranks', () => {
    const { meta } = funded(1000, 0);
    expect(meta.buySkill('damage-2')).toBe(false); expect(meta.buySkill('unknown')).toBe(false);
    let expected = 1000;
    for (let rank = 0; rank < 3; rank++) {
      const cost = skillCost('damage-1', rank); expect(meta.getSkillCost('damage-1')).toBe(cost);
      expect(meta.buySkill('damage-1')).toBe(true); expected -= cost; expect(meta.xp).toBe(expected);
    }
    expect(meta.buySkill('damage-1')).toBe(false); expect(meta.getSkillCost('damage-1')).toBe(0);
    expect(meta.buySkill('damage-2')).toBe(true); expect(meta.branchRanks('damage')).toBe(4);
    expect(meta.bonuses.damage).toBeCloseTo(.036); expect(meta.totalRanks).toBe(4);
    expect(skillCost('missing', 0)).toBe(0); expect(skillCost('damage-1', NaN)).toBe(0);
  });

  it('requires mastery for capstones, charges once, and applies permanent combat bonuses', () => {
    const { meta } = funded();
    expect(meta.buyCapstone('arsenal')).toBe(false);
    for (let index = 1; index <= 5; index++) for (let rank = 0; rank < 3; rank++) expect(meta.buySkill(`damage-${index}`)).toBe(true);
    for (let index = 1; index <= 4; index++) for (let rank = 0; rank < (index === 4 ? 1 : 3); rank++) expect(meta.buySkill(`range-${index}`)).toBe(true);
    const before = meta.xp, damage = meta.bonuses.damage;
    expect(meta.buyCapstone('arsenal')).toBe(true); expect(meta.xp).toBe(before - 1200);
    expect(meta.bonuses.damage).toBeCloseTo(damage + .08); expect(meta.bonuses.capstones).toContain('arsenal');
    expect(meta.buyCapstone('arsenal')).toBe(false); expect(meta.buyCapstone('unknown')).toBe(false);
  });

  it('unlocks premium towers with earned gems and caps repeatable permanent shop upgrades', () => {
    const { meta, storage } = funded(0, 1000);
    expect(meta.unlockedTowers).toHaveLength(12); expect(meta.unlockedTowers).not.toContain('void');
    expect(meta.shopPurchase('unlock-void')).toBe(true); expect(meta.gems).toBe(955);
    expect(meta.unlockedTowers).toContain('void'); expect(meta.shopPurchase('unlock-void')).toBe(false);
    for (let rank = 0; rank < 5; rank++) expect(meta.shopPurchase('supply-cache')).toBe(true);
    expect(meta.bonuses.startingGold).toBe(75); expect(meta.shopPurchase('supply-cache')).toBe(false);
    const loaded = new Progression(storage); expect(loaded.unlockedTowers).toContain('void'); expect(loaded.bonuses.startingGold).toBe(75);
    expect(meta.shopPurchase('unknown')).toBe(false);
    expect(new Progression(null).shopPurchase('unlock-void')).toBe(false);
  });

  it('makes all five premium families affordable from normal campaign first clears without replay gem farming', () => {
    const meta = new Progression(null);
    STAGE_IDS.forEach((stageId, index) => meta.recordResult(result({ stageId, runId: `normal-clear-${index}` })));
    expect(meta.gems).toBe(438);
    for (const item of SHOP_ITEMS.filter(item => item.tower)) expect(meta.shopPurchase(item.id)).toBe(true);
    expect(meta.unlockedTowers).toHaveLength(17); expect(meta.gems).toBe(158);
  });

  it('rewards a result once per run, gives XP on replays, and limits gems to new clears or improved stars', () => {
    const storage = new MemoryStorage(), meta = new Progression(storage);
    const first = meta.recordResult(result({ lives: 8 })); expect(first.firstClear).toBe(true); expect(first.stars).toBe(1);
    expect(first.xp).toBe(145); expect(first.gems).toBe(25);
    const before = meta.state;
    expect(meta.recordResult(result({ lives: 8 })).duplicate).toBe(true); expect(meta.state).toEqual(before);
    const replay = meta.recordResult(result({ lives: 8, runId: 'replay-1' })); expect(replay.xp).toBe(30); expect(replay.gems).toBe(0);
    const improved = meta.recordResult(result({ lives: 20, runId: 'replay-2' })); expect(improved.stars).toBe(3); expect(improved.gems).toBe(6);
    const later = new Progression(storage);
    expect(later.recordResult(result({ runId: 'replay-2' })).duplicate).toBe(true);
    expect(later.stageProgress('eldervale')?.stars).toBe(3); expect(later.stageProgress('eldervale')?.clears).toBe(3);
  });

  it('saves defeat wave records without XP, gems, stars, or victory flags', () => {
    const meta = new Progression(null);
    expect(meta.recordResult(result({ won: false, lives: 0, wave: 4 })).xp).toBe(0);
    expect(meta.gems).toBe(0); expect(meta.xp).toBe(0);
    expect(meta.stageProgress('eldervale')).toEqual({ bestWave: 4, cleared: false, stars: 0, clears: 0, highestLives: 0, maxLives: 20 });
    const reward = meta.recordResult(result({ runId: 'after-defeat' })); expect(reward.firstClear).toBe(true);
    expect(meta.stageProgress('eldervale')?.bestWave).toBe(8);
  });

  it('tracks all four difficulties separately and rejects malformed result claims', () => {
    const meta = new Progression(null);
    DIFFICULTIES.forEach(difficulty => expect(meta.recordResult(result({ difficulty, runId: `run-${difficulty}` })).firstClear).toBe(true));
    expect(Object.keys(meta.state.stages.eldervale)).toHaveLength(4);
    const before = meta.state;
    for (const claim of [result({ stageId: 'unknown', runId: 'bad-stage' }), result({ maxLives: 0, runId: 'bad-lives' }), result({ wave: NaN, runId: 'bad-wave' }), result({ runId: '' })]) expect(meta.recordResult(claim).xp).toBe(0);
    expect(meta.state).toEqual(before);
  });

  it('refunds 80% of exact spent skill and capstone XP once and retains shop purchases', () => {
    const { meta } = funded();
    let spent = 0;
    for (let rank = 0; rank < 3; rank++) { spent += meta.getSkillCost('damage-1'); meta.buySkill('damage-1'); }
    meta.shopPurchase('unlock-chrono'); const before = meta.xp;
    expect(meta.resetSkills()).toBe(Math.floor(spent * .8)); expect(meta.xp).toBe(before + Math.floor(spent * .8));
    expect(meta.totalRanks).toBe(0); expect(meta.bonuses.damage).toBe(0); expect(meta.unlockedTowers).toContain('chrono');
    expect(meta.resetSkills()).toBe(0);
  });

  it('loads bounded values, ignores unknown nodes and capstones, and returns detached snapshots', () => {
    const storage = new MemoryStorage();
    storage.setItem(PROGRESSION_KEY, JSON.stringify({ version: 2, xp: -4, gems: 1e30, skillRanks: { 'damage-1': 999, 'damage-2': -4, 'damage-9': 5, hacked: 5 }, shopRanks: { 'unlock-nexus': 999, hacked: 999 }, capstones: ['unknown', 'grandmaster', 'arsenal'], stages: { eldervale: { normal: { bestWave: 9999, cleared: true, stars: 99, clears: -6 } }, hacked: { normal: { cleared: true } } }, claimedRuns: ['ok', '', null, 'ok'] }));
    const meta = new Progression(storage), snapshot = meta.state;
    expect(meta.xp).toBe(0); expect(meta.gems).toBe(1_000_000);
    expect(snapshot.skillRanks).toEqual({ 'damage-1': 3 }); expect(snapshot.capstones).toEqual([]);
    expect(snapshot.shopRanks).toEqual({ 'unlock-nexus': 1 }); expect(snapshot.claimedRuns).toEqual(['ok']);
    expect(snapshot.stages.eldervale.normal?.stars).toBe(3); expect(snapshot.stages.eldervale.normal?.bestWave).toBe(99); expect(snapshot.stages.hacked).toBeUndefined();
    snapshot.skillRanks['damage-1'] = 0; snapshot.stages.eldervale.normal!.stars = 0;
    expect(meta.state.skillRanks['damage-1']).toBe(3); expect(meta.stageProgress('eldervale')?.stars).toBe(3);
  });

  it('migrates legacy stage victories and best waves without inventing gem or XP rewards', () => {
    const storage = new MemoryStorage();
    storage.setItem('mossguard-campaign', JSON.stringify({ frostbound: { best: 8, completed: true }, ember: { best: 5, completed: false }, fake: { best: 100, completed: true } }));
    storage.setItem('mossguard-best', '12');
    const meta = new Progression(storage);
    expect(meta.stageProgress('frostbound')?.stars).toBe(1); expect(meta.stageProgress('ember')?.bestWave).toBe(5);
    expect(meta.stageProgress('eldervale')?.cleared).toBe(true); expect(meta.state.stages.fake).toBeUndefined();
    expect(meta.xp).toBe(0); expect(meta.gems).toBe(0);
    expect(JSON.parse(storage.getItem(PROGRESSION_KEY)!).version).toBe(2);
    expect(new Progression(storage).state).toEqual(meta.state);
  });

  it('keeps session progress functional when localStorage throws or saved JSON is broken', () => {
    const blocked: StorageLike = { getItem() { throw Error('denied'); }, setItem() { throw Error('quota'); } };
    const meta = new Progression(blocked); expect(meta.storageAvailable).toBe(false);
    expect(meta.recordResult(result()).xp).toBeGreaterThan(0); expect(meta.buySkill('damage-1')).toBe(true); expect(meta.save()).toBe(false);
    const storage = new MemoryStorage(); storage.setItem(PROGRESSION_KEY, '{broken');
    const recovered = new Progression(storage); expect(recovered.xp).toBe(0);
    recovered.recordResult(result()); expect(new Progression(storage).xp).toBeGreaterThan(0);
  });

  it('bounds full-tree combat bonuses and claimed-run history after sustained play', () => {
    const storage = new MemoryStorage(), skillRanks = Object.fromEntries(SKILL_NODES.map(node => [node.id, node.maxRank]));
    storage.setItem(PROGRESSION_KEY, JSON.stringify({ version: 2, skillRanks, capstones: CAPSTONES.map(item => item.id), shopRanks: Object.fromEntries(SHOP_ITEMS.map(item => [item.id, item.maxRank])) }));
    const meta = new Progression(storage), bonuses = meta.bonuses;
    expect(meta.totalRanks).toBe(320); expect(meta.unlockedCapstones).toHaveLength(7);
    for (const key of ['damage', 'range', 'haste', 'area', 'control', 'elemental', 'gold', 'fortify'] as const) expect(bonuses[key]).toBeLessThanOrEqual(.6);
    expect(bonuses.criticalChance).toBeLessThanOrEqual(.3); expect(bonuses.extraLives).toBeLessThanOrEqual(8);
    expect(bonuses.critical).toBe(bonuses.criticalChance); expect(bonuses.economy).toBe(bonuses.gold);
    for (let index = 0; index < 105; index++) meta.recordResult(result({ won: false, lives: 0, runId: `loss-${index}` }));
    expect(meta.state.claimedRuns).toHaveLength(100);
  });
});
