import { describe, expect, it } from 'vitest';
import { GameModel, TOWER_DEFS, positionAt, type Enemy, type TowerKind } from './model';
import { Progression, PROGRESSION_KEY, type StorageLike } from './progression';
import { TOWER_RESEARCH_XP, normalizedTowerMastery } from './tower-mastery';

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}
function advance(game: GameModel, seconds: number) { for (let i = 0; i < Math.round(seconds * 10); i++) game.update(.1); }
function target(game: GameModel, kind: Enemy['kind'] = 'grunt', distance?: number): Enemy {
  const tower = game.towers[0], home = game.getTowerPosition(tower), road = game.nearestPathPoint(home.x, home.y);
  const along = distance ?? road.distance;
  const enemy: Enemy = { id: 10000, kind, ...positionAt(along, game.path), hp: 1_000_000, maxHp: 1_000_000, distance: along, speed: 0, slowUntil: 0 };
  game.enemies = [enemy]; return enemy;
}
function combat(kind: TowerKind = 'archer') {
  const game = new GameModel(); game.build(0, kind);
  Object.defineProperty(game, 'trees', { get: () => [], configurable: true });
  game.status = 'wave'; game.wave = 1; target(game); return game;
}
function sync(game: GameModel, progression: Progression) {
  const report = game.towerXPReport;
  const awarded = progression.recordTowerXP(report);
  game.setTowerMastery(progression.towerMastery, report); return awarded;
}

describe('permanent tower family practice', () => {
  it('keeps skill XP, gem unlocks, and tower practice as separate progression', () => {
    const storage = new MemoryStorage();
    storage.setItem(PROGRESSION_KEY, JSON.stringify({ version: 2, xp: 1000, gems: 60, lifetimeXP: 2000,
      skillRanks: { 'damage-1': 2 }, shopRanks: { 'keep-charter': 1 }, claimedRuns: ['old-run'],
      stages: { eldervale: { normal: { bestWave: 6, stars: 3, cleared: true, clears: 1, highestLives: 20, maxLives: 20 } } } }));
    const progression = new Progression(storage), before = progression.state;
    expect(progression.towerMastery).toEqual({});
    expect(progression.recordTowerXP({ sessionId: 'practice-1', totals: { archer: 20, void: 200 } })).toEqual({ archer: 20, void: 200 });
    expect(progression.xp).toBe(1000); expect(progression.gems).toBe(60);
    expect(progression.unlockedTowers).not.toContain('void');
    expect(progression.buySkill('damage-1')).toBe(true); expect(progression.towerMastery.archer).toBe(20);
    const loaded = new Progression(storage);
    expect(loaded.state.stages).toEqual(before.stages); expect(loaded.state.shopRanks).toEqual(before.shopRanks);
    expect(loaded.state.claimedRuns).toEqual(before.claimedRuns); expect(loaded.towerMastery).toEqual({ archer: 20, void: 200 });
    expect(loaded.shopPurchase('unlock-void')).toBe(true); expect(loaded.towerMastery.void).toBe(200);
  });

  it('reconciles cumulative reports once across duplicates, stale updates, multiple sessions, and reloads', () => {
    const storage = new MemoryStorage(), progression = new Progression(storage);
    const first = { sessionId: 'defense-1', totals: { archer: 12, frost: 3 } };
    expect(progression.recordTowerXP(first)).toEqual(first.totals);
    expect(progression.recordTowerXP(first)).toEqual({});
    expect(progression.recordTowerXP({ ...first, totals: { archer: 20, frost: 1 } })).toEqual({ archer: 8 });
    expect(progression.recordTowerXP(first)).toEqual({});
    expect(progression.recordTowerXP({ sessionId: 'defense-2', totals: { frost: 4 } })).toEqual({ frost: 4 });
    const loaded = new Progression(storage);
    expect(loaded.recordTowerXP(first)).toEqual({}); expect(loaded.towerMastery).toEqual({ archer: 20, frost: 7 });
    const detached = loaded.towerMastery; detached.archer = 9999;
    expect(loaded.towerMastery.archer).toBe(20);
    for (const sessionId of ['', '__proto__', 'bad session']) expect(loaded.recordTowerXP({ sessionId, totals: { archer: 100 } })).toEqual({});
    expect(normalizedTowerMastery({ archer: Infinity, frost: -1, hacked: 50, cannon: 4.9 })).toEqual({ cannon: 4 });
  });

  it('uses permanent family XP with independent branch thresholds and no wave gate', () => {
    const game = new GameModel(); game.gold = 1000; game.build(0, 'archer'); const tower = game.towers[0];
    expect(game.wave).toBe(0);
    expect(game.getUpgradeGate(tower)).toMatchObject({ allowed: false, xp: 0, requiredXP: 12, researched: false });
    expect(game.upgrade(tower.id)).toBe(false);
    game.setTowerMastery({ archer: 74 }); expect(game.upgrade(tower.id)).toBe(true);
    expect(game.getUpgradeGate(tower, 'A')).toMatchObject({ allowed: false, requiredXP: 75, researched: false });
    game.setTowerMastery({ archer: 75 });
    expect(game.towerResearch('archer').map(choice => choice.unlocked)).toEqual([true, true, false, false, false]);
    expect(game.getUpgradeGate(tower, 'A').allowed).toBe(true); expect(game.getUpgradeGate(tower, 'B').allowed).toBe(false);
    const gold = game.gold; expect(game.upgrade(tower.id, 'B')).toBe(false); expect(game.gold).toBe(gold);
    expect(game.upgrade(tower.id, 'A')).toBe(true); expect(game.gold).toBe(gold - TOWER_DEFS.archer.branches.A.cost);
    expect(game.getTowerMasteryXP('archer')).toBe(75); expect(game.getTowerMasteryXP('frost')).toBe(0);
  });

  it('keeps pending practice visible and persists attempts before a restart without double counting', () => {
    const storage = new MemoryStorage(), progression = new Progression(storage), game = combat('frost');
    advance(game, 8); expect(game.kills).toBe(0); expect(game.getTowerMasteryXP('frost')).toBeGreaterThan(0);
    const xp = game.getTowerMasteryXP('frost'); expect(sync(game, progression).frost).toBe(xp);
    expect(game.getTowerMasteryXP('frost')).toBe(xp); expect(sync(game, progression)).toEqual({});
    const reconciledReport = game.towerXPReport, oldReport = game.towerXPReport; oldReport.totals.frost = 9999;
    expect(game.getTowerMasteryXP('frost')).toBe(xp);
    game.reset(); expect(game.towerXPReport.totals).toEqual({}); expect(game.getTowerMasteryXP('frost')).toBe(xp);
    const loaded = new Progression(storage); expect(loaded.towerMastery.frost).toBe(xp);
    expect(loaded.recordTowerXP(reconciledReport)).toEqual({});
    const replay = combat('frost'); replay.setTowerMastery(loaded.towerMastery); advance(replay, 4);
    sync(replay, loaded); expect(loaded.towerMastery.frost).toBeGreaterThan(xp);
    expect(replay.getTowerMasteryXP('frost')).toBe(loaded.towerMastery.frost);
  });

  it('does not train through preparation, pause, disable, hidden targets, blocked sight, or spent traps', () => {
    for (const condition of ['preparation', 'pause', 'disabled', 'hidden', 'trees', 'distant', 'spent'] as const) {
      const game = combat(condition === 'spent' ? 'trap' : 'archer'), tower = game.towers[0];
      if (condition === 'preparation') game.status = 'building';
      if (condition === 'pause') game.paused = true;
      if (condition === 'disabled') tower.disabledUntil = 100;
      if (condition === 'hidden') target(game, 'scout');
      if (condition === 'distant') target(game, 'grunt', game.pathLength * .7);
      if (condition === 'trees') { const home = game.getTowerPosition(tower); Object.defineProperty(game, 'trees', { get: () => [{ ...home, radius: 100 }] }); }
      if (condition === 'spent') { tower.uses = 0; const home = game.getTowerPosition(tower); target(game, 'grunt', game.nearestPathPoint(home.x, home.y).distance); }
      advance(game, 5); expect(game.towerXPReport.totals, condition).toEqual({});
    }
  });

  it('trains troops and control without requiring a kill, and does not multiply barracks engagement by troop count', () => {
    const ice = combat('frost'); advance(ice, 4);
    expect(ice.kills).toBe(0); expect(ice.towerXPReport.totals.frost).toBeGreaterThan(0);
    const base = combat('barracks'), elite = combat('barracks');
    elite.towers[0].level = 3; elite.towers[0].branch = 'D';
    for (const game of [base, elite]) {
      const tower = game.towers[0], rally = tower.rally!; target(game, 'grunt', game.nearestPathPoint(rally.x, rally.y).distance);
      game.enemies[0].maxHp = 52;
      advance(game, 4); expect(game.kills).toBe(0); expect(game.towerXPReport.totals.barracks).toBe(2);
    }
    expect(elite.troops).toHaveLength(4); expect(base.troops).toHaveLength(2);
    expect(TOWER_RESEARCH_XP.II).toBeLessThan(TOWER_RESEARCH_XP.A);
  });

  it('awards one participation bonus per family even when several towers help clear a wave', () => {
    const game = combat(); expect(game.build(2, 'archer')).toBe(true);
    game.towers[1].position = game.getTowerPosition(game.towers[0]);
    for (const tower of game.towers) tower.cooldown = 100;
    advance(game, 2); expect(game.getTowerMasteryXP('archer')).toBe(2);
    const enemy = game.enemies[0]; enemy.hp = 1;
    expect(game.meteor(enemy.x, enemy.y)).toBe(true); game.update(.1);
    expect(game.status).toBe('building'); expect(game.getTowerMasteryXP('archer')).toBe(10);
    advance(game, 3); expect(game.getTowerMasteryXP('archer')).toBe(10);
  });

  it('credits an aura helping an engaged ally and a detector revealing foes without requiring either to shoot', () => {
    const support = combat(); expect(support.build(2, 'arcane')).toBe(true);
    const [archer, battery] = support.towers, enemy = support.enemies[0];
    archer.position = { x: enemy.x + 160, y: enemy.y };
    battery.position = { x: enemy.x + 330, y: enemy.y }; battery.level = 3; battery.branch = 'C';
    expect(support.getTowerStats(archer).damage).toBeGreaterThan(TOWER_DEFS.archer.damage);
    advance(support, 4); expect(support.getTowerMasteryXP('arcane')).toBe(2);
    expect(support.shots.some(shot => shot.kind === 'arcane')).toBe(false);
    battery.level = 1; delete battery.branch;
    advance(support, 4); expect(support.getTowerMasteryXP('arcane')).toBe(2);
    const detector = combat('arcane'); target(detector, 'scout');
    const home = detector.getTowerPosition(detector.towers[0]);
    Object.defineProperty(detector, 'trees', { get: () => [{ ...home, radius: 100 }] });
    advance(detector, 4); expect(detector.getTowerMasteryXP('arcane')).toBe(2);
    expect(detector.shots).toHaveLength(0); expect(detector.kills).toBe(0);
  });
});
