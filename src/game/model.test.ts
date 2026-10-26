import { describe, expect, it } from 'vitest';
import { ENEMY_DEFS, GameModel, LEVELS, PATH_LENGTH, TOWER_DEFS, WAVES, positionAt, type Enemy, type EnemyKind, type TowerKind, type TowerTargetMode } from './model';

function enemy(id: number, kind: EnemyKind, distance = 210, hp = ENEMY_DEFS[kind].hp): Enemy {
  return { id, kind, ...positionAt(distance), hp, maxHp: hp, distance, speed: ENEMY_DEFS[kind].speed, slowUntil: 0 };
}
function advance(game: GameModel, seconds: number): void {
  for (let remaining = seconds; remaining > 0; remaining -= 0.1) game.update(Math.min(0.1, remaining));
}

describe('tower economy', () => {
  it('charges exact costs and rejects occupied pads, missing pads, and unaffordable builds', () => {
    const game = new GameModel();
    expect(game.build(0, 'cannon')).toBe(true);
    expect(game.gold).toBe(120);
    expect(game.build(0, 'archer')).toBe(false);
    expect(game.build(99, 'archer')).toBe(false);
    expect(game.build(1, 'cannon')).toBe(true);
    expect(game.build(2, 'archer')).toBe(false);
    expect(game.gold).toBe(0);
    expect(game.towers).toHaveLength(2);
  });

  it('upgrades to level III, rejects further upgrades, and refunds 70% of total investment', () => {
    const game = new GameModel();
    game.gold = 1000;
    game.build(0, 'archer');
    const tower = game.towers[0];
    const initial = game.getTowerStats(tower);
    expect(game.upgrade(tower.id)).toBe(true);
    expect(game.upgrade(tower.id)).toBe(true);
    expect(tower.level).toBe(3);
    expect(game.getTowerStats(tower).damage).toBeGreaterThan(initial.damage);
    expect(game.getTowerStats(tower).range).toBeGreaterThan(initial.range);
    expect(game.upgrade(tower.id)).toBe(false);
    const beforeSale = game.gold;
    expect(game.sell(tower.id)).toBe(true);
    expect(game.gold).toBe(beforeSale + Math.floor(tower.spent * 0.7));
    expect(game.sell(tower.id)).toBe(false);
    expect(game.towers).toHaveLength(0);
    expect(game.upgrade(999)).toBe(false);
  });
});

describe('combat and abilities', () => {
  it('targets the furthest enemy and awards gold once for its defeat', () => {
    const game = new GameModel();
    game.build(0, 'archer');
    game.startWave();
    game.enemies = [enemy(100, 'grunt', 200), enemy(101, 'grunt', 220, 10)];
    const before = game.gold;
    game.update(0.01);
    expect(game.enemies.some(item => item.id === 101)).toBe(false);
    expect(game.enemies.find(item => item.id === 100)?.hp).toBe(52);
    expect(game.kills).toBe(1);
    expect(game.gold).toBe(before + ENEMY_DEFS.grunt.reward);
  });

  it('applies cannon damage to a nearby group but leaves distant enemies alone', () => {
    const game = new GameModel();
    game.build(0, 'cannon');
    game.startWave();
    game.enemies = [enemy(100, 'brute', 200), enemy(101, 'brute', 230), enemy(102, 'brute', 650)];
    game.update(0.01);
    expect(game.enemies.find(item => item.id === 100)?.hp).toBe(122);
    expect(game.enemies.find(item => item.id === 101)?.hp).toBe(122);
    expect(game.enemies.find(item => item.id === 102)?.hp).toBe(165);
  });

  it('slows movement with frost and reduces arrow damage against armor', () => {
    const game = new GameModel();
    game.build(0, 'frost');
    game.startWave();
    game.enemies = [enemy(100, 'grunt')];
    game.update(0.01);
    const target = game.enemies.find(item => item.id === 100)!;
    expect(target.slowUntil).toBeGreaterThan(game.time);
    const before = target.distance;
    game.update(0.1);
    expect(target.distance - before).toBeCloseTo(48 * 0.55 * 0.1);

    const archer = new GameModel();
    archer.build(0, 'archer');
    archer.startWave();
    archer.enemies = [enemy(101, 'brute')];
    archer.update(0.01);
    expect(archer.enemies.find(item => item.id === 101)?.hp).toBeCloseTo(165 - 16 * 0.6);
  });

  it('chains arcane damage to the nearest distinct enemy, with falloff and a limited jump range', () => {
    const game = new GameModel();
    game.build(0, 'arcane');
    game.startWave();
    game.enemies = [enemy(100, 'brute', 200), enemy(101, 'brute', 170), enemy(102, 'brute', 70), enemy(103, 'brute', 650)];
    game.update(0.01);
    expect(game.enemies.find(item => item.id === 100)?.hp).toBe(165 - 24);
    expect(game.enemies.find(item => item.id === 101)?.hp).toBeCloseTo(165 - 24 * 0.65);
    expect(game.enemies.find(item => item.id === 102)?.hp).toBe(165);
    expect(game.enemies.find(item => item.id === 103)?.hp).toBe(165);
    const bolts = game.shots.filter(shot => shot.kind === 'arcane');
    expect(bolts).toHaveLength(2);
    expect(bolts[1].from).toEqual({ x: game.enemies.find(item => item.id === 100)!.x, y: game.enemies.find(item => item.id === 100)!.y });
    expect(bolts[1].maxLife).toBe(0.2);

    const isolated = new GameModel();
    isolated.build(0, 'arcane');
    isolated.startWave();
    isolated.enemies = [enemy(100, 'brute', 200), enemy(101, 'brute', 100)];
    isolated.update(0.01);
    expect(isolated.enemies.find(item => item.id === 101)?.hp).toBe(165);
    expect(isolated.shots.filter(shot => shot.kind === 'arcane')).toHaveLength(1);
  });

  it('grows arcane chains from two to four targets through upgrades', () => {
    for (let level = 1; level <= 3; level++) {
      const game = new GameModel();
      game.gold = 1000;
      game.build(0, 'arcane');
      for (let upgrade = 1; upgrade < level; upgrade++) game.upgrade(game.towers[0].id);
      game.startWave();
      game.enemies = [200, 170, 140, 110].map((distance, index) => enemy(100 + index, 'brute', distance, 1000));
      game.update(0.01);
      const hits = game.enemies.filter(item => item.id >= 100 && item.hp < 1000);
      expect(hits).toHaveLength(level + 1);
      const damage = game.getTowerStats(game.towers[0]).damage;
      for (let index = 0; index < level + 1; index++) {
        expect(game.enemies.find(item => item.id === 100 + index)?.hp).toBeCloseTo(1000 - damage * 0.65 ** index);
      }
    }
  });

  it('does not revisit dead arcane targets or award their rewards twice', () => {
    const game = new GameModel();
    game.gold = 1000;
    game.build(0, 'arcane');
    game.upgrade(game.towers[0].id);
    game.upgrade(game.towers[0].id);
    game.startWave();
    game.enemies = [enemy(100, 'brute', 200, 10), enemy(101, 'brute', 170, 10)];
    const before = game.gold;
    game.update(0.01);
    expect(game.enemies.some(item => item.id === 100 || item.id === 101)).toBe(false);
    expect(game.kills).toBe(2);
    expect(game.gold).toBe(before + 2 * ENEMY_DEFS.brute.reward);
    expect(game.shots.filter(shot => shot.kind === 'arcane')).toHaveLength(2);
  });

  it('casts a targeted meteor, respects its cooldown, and recharges over simulation time', () => {
    const game = new GameModel();
    const impact = positionAt(210);
    expect(game.meteor(impact.x, impact.y)).toBe(false);
    game.startWave();
    game.enemies = [enemy(100, 'grunt'), enemy(101, 'brute', 230), enemy(102, 'grunt', 600)];
    expect(game.meteor(impact.x, impact.y)).toBe(true);
    expect(game.enemies.some(item => item.id === 100)).toBe(false);
    expect(game.enemies.find(item => item.id === 101)?.hp).toBe(20);
    expect(game.enemies.find(item => item.id === 102)?.hp).toBe(52);
    expect(game.meteor(impact.x, impact.y)).toBe(false);
    game.update(0.1);
    expect(game.meteorCooldown).toBeCloseTo(24.9);
  });
});

describe('wave and game lifecycle', () => {
  it('pauses all simulation, clamps delayed frames, and supports double speed', () => {
    const game = new GameModel();
    game.startWave();
    game.paused = true;
    const snapshot = game.snapshot();
    game.update(10);
    expect(game.snapshot()).toEqual(snapshot);
    game.paused = false;
    game.update(10);
    expect(game.time).toBeCloseTo(0.1);
    game.speed = 2;
    game.update(0.1);
    expect(game.time).toBeCloseTo(0.3);
    game.update(Number.NaN);
    expect(game.time).toBeCloseTo(0.3);
  });

  it('counts pending enemies and blocks overlapping waves', () => {
    const game = new GameModel();
    expect(game.startWave()).toBe(true);
    expect(game.waveRemaining).toBe(7);
    expect(game.startWave()).toBe(false);
    game.update(0.1);
    expect(game.enemies).toHaveLength(1);
    expect(game.waveRemaining).toBe(7);
  });

  it('finishes a wave, pays its reward, and gives a decaying early-call bonus', () => {
    const game = new GameModel();
    game.build(0, 'archer');
    game.build(1, 'archer');
    game.build(2, 'archer');
    game.startWave();
    advance(game, 70);
    expect(game.status).toBe('building');
    expect(game.waveRemaining).toBe(0);
    expect(game.kills).toBe(7);
    expect(game.lives).toBe(20);
    // Start immediately after a fresh wave-clear transition to inspect its reward.
    game.reset();
    game.gold = 10000;
    game.build(0, 'archer');
    game.build(1, 'archer');
    game.build(2, 'archer');
    game.startWave();
    while (game.status === 'wave') game.update(0.1);
    expect(game.earlyBonus).toBe(24);
    advance(game, 6);
    expect(game.earlyBonus).toBe(12);
    const before = game.gold;
    expect(game.startWave()).toBe(true);
    expect(game.gold).toBe(before + 12);
    expect(game.wave).toBe(2);
  });

  it('leaks enemies, reaches loss, rejects end-game actions, and fully resets', () => {
    const game = new GameModel();
    game.startWave();
    game.lives = 1;
    game.enemies = [enemy(100, 'grunt', PATH_LENGTH - 1)];
    game.update(0.1);
    expect(game.status).toBe('lost');
    expect(game.lives).toBe(0);
    expect(game.build(0, 'archer')).toBe(false);
    expect(game.startWave()).toBe(false);
    const time = game.time;
    game.update(1);
    expect(game.time).toBe(time);
    game.reset();
    expect(game.status).toBe('building');
    expect(game.gold).toBe(240);
    expect(game.lives).toBe(20);
    expect(game.wave).toBe(0);
    expect(game.enemies).toHaveLength(0);
    expect(game.towers).toHaveLength(0);
    expect(game.waveRemaining).toBe(0);
  });

  it('can win the entire campaign by investing earned gold in a mixed defense', () => {
    const game = new GameModel();
    const plan: { padId: number; kind: TowerKind }[] = [
      { padId: 0, kind: 'archer' }, { padId: 2, kind: 'cannon' },
      { padId: 1, kind: 'frost' }, { padId: 5, kind: 'archer' },
      { padId: 4, kind: 'cannon' }, { padId: 3, kind: 'frost' },
      { padId: 6, kind: 'cannon' }, { padId: 7, kind: 'archer' },
    ];
    let nextBuild = 0;
    for (let step = 0; step < 15000 && game.status !== 'won' && game.status !== 'lost'; step++) {
      if (nextBuild < plan.length && game.build(plan[nextBuild].padId, plan[nextBuild].kind)) nextBuild++;
      else if (nextBuild === plan.length) for (const tower of game.towers) game.upgrade(tower.id);
      if (game.status === 'building') game.startWave();
      if (game.meteorCooldown === 0 && game.enemies.length >= 4) {
        const center = game.enemies[Math.floor(game.enemies.length / 2)];
        game.meteor(center.x, center.y);
      }
      game.update(0.1);
    }
    expect(game.wave).toBe(WAVES.length);
    expect(game.status).toBe('won');
    expect(game.lives).toBeGreaterThan(0);
    expect(game.kills).toBeGreaterThan(100);
  });
});

describe('regional campaign levels', () => {
  it('uses distinct supplied-map routes, named foundations, and eight-wave regional defenses', () => {
    const game = new GameModel();
    const routes = new Set<string>();
    for (let index = 0; index < LEVELS.length; index++) {
      expect(game.selectLevel(index)).toBe(true);
      expect(game.level).toBe(LEVELS[index]);
      expect(game.currentLevelIndex).toBe(index);
      expect(game.gold).toBe(LEVELS[index].startingGold);
      expect(game.pads.every(pad => pad.name.length > 0)).toBe(true);
      expect(game.pads.map(pad => pad.id)).toEqual(game.pads.map((_, padIndex) => padIndex));
      expect(game.pathLength).toBeGreaterThan(900);
      expect(game.waves).toHaveLength(index === 0 ? 12 : 8);
      expect(game.waves.every(wave => wave.enemies.length > 0)).toBe(true);
      routes.add(JSON.stringify(game.path));
      game.startWave(); game.update(.1);
      expect(game.enemies[0].x).toBeCloseTo(positionAt(game.enemies[0].distance, game.path).x);
      expect(game.enemies[0].y).toBeCloseTo(positionAt(game.enemies[0].distance, game.path).y);
      expect(game.enemies[0].hp).toBe(Math.round(ENEMY_DEFS.grunt.hp * game.level.enemyMultiplier));
      game.reset();
    }
    expect(routes.size).toBe(5);
  });

  it('rejects invalid or active-combat switches and resets every transient when choosing a region', () => {
    const game = new GameModel(1);
    game.build(0, 'venom'); game.startWave(); game.update(.1);
    const active = game.snapshot();
    expect(game.selectLevel(2)).toBe(false);
    expect(game.snapshot()).toEqual(active);
    game.reset();
    expect(game.currentLevelIndex).toBe(1);
    expect(game.gold).toBe(260);
    game.build(0, 'mortar'); game.paused = true; game.speed = 2; game.meteorCooldown = 12;
    expect(game.selectLevel(3)).toBe(true);
    expect(game.currentLevelIndex).toBe(3);
    expect(game.gold).toBe(300);
    expect(game.status).toBe('building'); expect(game.paused).toBe(false); expect(game.speed).toBe(1);
    expect(game.wave).toBe(0); expect(game.time).toBe(0); expect(game.meteorCooldown).toBe(0);
    expect(game.towers).toHaveLength(0); expect(game.enemies).toHaveLength(0); expect(game.shots).toHaveLength(0); expect(game.floats).toHaveLength(0);
    expect(game.selectLevel(-1)).toBe(false); expect(game.selectLevel(100)).toBe(false); expect(game.selectLevel(1.5)).toBe(false);
    expect(game.currentLevelIndex).toBe(3);
    const snapshot = game.snapshot(); snapshot.path[0].x = -999; snapshot.pads[0].name = 'changed';
    expect(game.path[0].x).not.toBe(-999); expect(game.pads[0].name).not.toBe('changed');
  });

  it('leaks at the selected route endpoint and reaches its own final wave', () => {
    for (let index = 1; index < LEVELS.length; index++) {
      const game = new GameModel(index);
      game.startWave();
      const target = enemy(1000, 'brute', game.pathLength - 1);
      game.enemies = [target];
      game.update(.1);
      expect(game.lives).toBe(18);
      expect(game.enemies.some(enemy => enemy.id === 1000)).toBe(false);
      game.reset();
      game.wave = game.waves.length - 1;
      expect(game.startWave()).toBe(true);
      expect(game.wave).toBe(8);
      expect(game.nextWave()).toBeUndefined();
    }
  });
});

describe('specialist towers', () => {
  it('hits a distant armored cluster with mortar shells beyond cannon range', () => {
    const game = new GameModel(); game.build(0, 'mortar'); game.startWave();
    game.enemies = [enemy(100, 'brute', 450), enemy(101, 'brute', 390), enemy(102, 'brute', 1000)];
    const pad = game.pads[0], target = game.enemies[0];
    expect(Math.hypot(target.x - pad.x, target.y - pad.y)).toBeGreaterThan(TOWER_DEFS.cannon.range);
    expect(Math.hypot(target.x - pad.x, target.y - pad.y)).toBeLessThan(TOWER_DEFS.mortar.range);
    game.update(.01);
    expect(game.enemies.find(enemy => enemy.id === 100)?.hp).toBe(165 - TOWER_DEFS.mortar.damage);
    expect(game.enemies.find(enemy => enemy.id === 101)?.hp).toBe(165 - TOWER_DEFS.mortar.damage);
    expect(game.enemies.find(enemy => enemy.id === 102)?.hp).toBe(165);
    expect(game.shots[0].kind).toBe('mortar');
  });

  it('pulses every target within Tesla radius with no chain falloff', () => {
    const game = new GameModel(); game.build(0, 'tesla'); game.startWave();
    game.enemies = [enemy(100, 'brute', 210), enemy(101, 'brute', 230), enemy(102, 'brute', 250), enemy(103, 'brute', 650)];
    game.update(.01);
    for (const id of [100, 101, 102]) expect(game.enemies.find(enemy => enemy.id === id)?.hp).toBe(165 - TOWER_DEFS.tesla.damage);
    expect(game.enemies.find(enemy => enemy.id === 103)?.hp).toBe(165);
    expect(game.shots.filter(shot => shot.kind === 'tesla')).toHaveLength(1);
  });

  it('keeps venom damage active after a target leaves range and pays its defeat once', () => {
    const game = new GameModel(); game.build(0, 'venom'); game.startWave();
    game.enemies = [enemy(100, 'brute', 210, 25)];
    game.update(.01);
    const target = game.enemies.find(enemy => enemy.id === 100)!;
    expect(target.hp).toBe(17);
    expect(target.poisonUntil).toBeCloseTo(game.time + 3.5);
    target.distance = 1100;
    const before = game.gold;
    advance(game, 2);
    expect(game.enemies.some(enemy => enemy.id === 100)).toBe(false);
    expect(game.kills).toBe(1);
    expect(game.gold).toBe(before + ENEMY_DEFS.brute.reward);
    const after = game.gold;
    advance(game, .5);
    expect(game.gold).toBe(after);
  });

  it('refreshes toxin without stacking damage and freezes it while paused', () => {
    const game = new GameModel(); game.gold = 1000;
    game.build(0, 'venom'); game.build(1, 'venom'); game.startWave();
    game.enemies = [enemy(100, 'brute', 210, 1000)];
    game.update(.01);
    const target = game.enemies.find(enemy => enemy.id === 100)!;
    expect(target.poisonDps).toBe(TOWER_DEFS.venom.damage * 1.4);
    const hp = target.hp;
    for (const tower of game.towers) tower.cooldown = 100;
    game.paused = true; advance(game, 2); expect(target.hp).toBe(hp);
    game.paused = false; advance(game, 1);
    expect(target.hp).toBeCloseTo(hp - 11.2);
    const expiry = target.poisonUntil!;
    advance(game, 3);
    const expired = target.hp;
    expect(game.time).toBeGreaterThan(expiry);
    advance(game, 1); expect(target.hp).toBe(expired);
  });

  it('upgrades and sells each specialist through the same economy as core towers', () => {
    for (const kind of ['mortar', 'tesla', 'venom'] as const) {
      const game = new GameModel(); game.gold = 1000; game.build(0, kind);
      const tower = game.towers[0], first = game.getTowerStats(tower);
      game.upgrade(tower.id); game.upgrade(tower.id);
      expect(tower.level).toBe(3); expect(game.getTowerStats(tower).damage).toBeGreaterThan(first.damage);
      expect(game.getTowerStats(tower).range).toBeGreaterThan(first.range);
      const before = game.gold; game.sell(tower.id);
      expect(game.gold).toBe(before + Math.floor(tower.spent * .7));
    }
  });
});


describe('regional campaign balance', () => {
  it('can win every new region by investing earned gold and using Starfall', () => {
    const plans: { padId: number; kind: TowerKind }[][] = [[],
      [{padId:0,kind:'archer'},{padId:2,kind:'cannon'},{padId:4,kind:'mortar'},{padId:3,kind:'frost'},{padId:5,kind:'venom'},{padId:1,kind:'mortar'}],
      [{padId:0,kind:'archer'},{padId:1,kind:'cannon'},{padId:2,kind:'tesla'},{padId:5,kind:'frost'},{padId:4,kind:'venom'},{padId:6,kind:'mortar'},{padId:3,kind:'mortar'}],
      [{padId:0,kind:'archer'},{padId:1,kind:'cannon'},{padId:3,kind:'frost'},{padId:4,kind:'mortar'},{padId:2,kind:'mortar'}],
      [{padId:1,kind:'archer'},{padId:0,kind:'cannon'},{padId:4,kind:'frost'},{padId:3,kind:'mortar'},{padId:2,kind:'mortar'},{padId:5,kind:'venom'}],
    ];
    for (let region = 1; region < LEVELS.length; region++) {
      const game = new GameModel(region), plan = plans[region];
      let nextBuild = 0;
      for (let step = 0; step < 15000 && game.status !== 'won' && game.status !== 'lost'; step++) {
        if (nextBuild < plan.length && game.build(plan[nextBuild].padId, plan[nextBuild].kind)) nextBuild++;
        else if (nextBuild === plan.length) for (const tower of game.towers) game.upgrade(tower.id);
        if (game.status === 'building') game.startWave();
        if (game.meteorCooldown === 0 && game.enemies.length >= 4) {
          const center = game.enemies[Math.floor(game.enemies.length / 2)]; game.meteor(center.x, center.y);
        }
        game.update(.1);
      }
      expect(game.status, `${game.level.name}: wave ${game.wave}, lives ${game.lives}, kills ${game.kills}`).toBe('won');
      expect(game.wave).toBe(game.waves.length);
      expect(game.lives).toBeGreaterThan(0);
    }
  });
});


describe('tower strategy controls', () => {
  it('selects first, last, strongest remaining health, and fastest actual movement', () => {
    const expected: Record<TowerTargetMode, number> = { first: 100, last: 103, strongest: 101, fastest: 102 };
    for (const mode of ['first', 'last', 'strongest', 'fastest'] as const) {
      const game = new GameModel(); game.build(0, 'archer');
      const tower = game.towers[0];
      expect(tower.targeting).toBe('first');
      expect(game.setTargeting(tower.id, mode)).toBe(true);
      game.startWave();
      game.enemies = [enemy(100, 'grunt', 270), enemy(101, 'brute', 230), enemy(102, 'runner', 250), enemy(103, 'grunt', 210)];
      const health = new Map(game.enemies.map(item => [item.id, item.hp]));
      game.update(.001);
      const hit = game.enemies.filter(item => health.has(item.id) && item.hp < health.get(item.id)!);
      expect(hit.map(item => item.id), mode).toEqual([expected[mode]]);
      expect(game.shots).toHaveLength(1);
    }
    const slowed = new GameModel(); slowed.build(0, 'archer');
    slowed.setTargeting(slowed.towers[0].id, 'fastest'); slowed.startWave();
    slowed.enemies = [enemy(100, 'runner', 250), enemy(101, 'grunt', 230)];
    slowed.enemies[0].slowUntil = 100;
    slowed.update(.001);
    expect(slowed.enemies.find(item => item.id === 100)?.hp).toBe(37);
    expect(slowed.enemies.find(item => item.id === 101)?.hp).toBe(52 - 16);
  });

  it('resolves equal targeting priorities by enemy id and rejects invalid or terminal changes', () => {
    for (const mode of ['first', 'last', 'strongest', 'fastest'] as const) {
      const game = new GameModel(); game.build(0, 'archer');
      game.setTargeting(game.towers[0].id, mode); game.startWave();
      game.enemies = [enemy(101, 'grunt', 220, 100), enemy(100, 'grunt', 220, 100)];
      for (const unit of game.enemies) unit.speed = 0;
      game.update(.001);
      expect(game.enemies.find(item => item.id === 100)?.hp, mode).toBe(84);
      expect(game.enemies.find(item => item.id === 101)?.hp, mode).toBe(100);
    }
    const game = new GameModel(); game.build(0, 'archer');
    const tower = game.towers[0];
    expect(game.setTargeting(999, 'last')).toBe(false);
    expect(game.setTargeting(tower.id, 'flying' as TowerTargetMode)).toBe(false);
    expect(tower.targeting).toBe('first');
    for (const status of ['won', 'lost'] as const) {
      game.status = status;
      expect(game.setTargeting(tower.id, 'last')).toBe(false);
      expect(tower.targeting).toBe('first');
    }
  });

  it('relocates an upgraded tower for a non-refundable fee without resetting its combat state', () => {
    const game = new GameModel(); game.gold = 1000; game.build(0, 'archer');
    const tower = game.towers[0]; game.upgrade(tower.id); game.setTargeting(tower.id, 'strongest');
    tower.cooldown = .45;
    const before = { ...tower }, gold = game.gold, fee = game.moveCost(tower);
    expect(fee).toBe(14);
    expect(game.moveTower(tower.id, 1)).toBe(true);
    expect(tower).toEqual({ ...before, padId: 1 });
    expect(game.gold).toBe(gold - fee);
    expect(game.build(0, 'cannon')).toBe(true);
    const beforeSale = game.gold;
    expect(game.sell(tower.id)).toBe(true);
    expect(game.gold).toBe(beforeSale + Math.floor(before.spent * .7));
  });

  it('rejects impossible relocation without spending gold and clears strategy state on reset', () => {
    const game = new GameModel(); game.gold = 1000; game.build(0, 'venom'); game.build(1, 'archer');
    const tower = game.towers[0];
    for (const [id, padId] of [[999, 2], [tower.id, 0], [tower.id, 1], [tower.id, -1], [tower.id, 99], [tower.id, 1.5]]) {
      const before = game.snapshot();
      expect(game.moveTower(id, padId)).toBe(false); expect(game.snapshot()).toEqual(before);
    }
    game.gold = game.moveCost(tower) - 1;
    const poor = game.snapshot(); expect(game.moveTower(tower.id, 2)).toBe(false); expect(game.snapshot()).toEqual(poor);
    game.gold = 1000;
    for (const status of ['won', 'lost'] as const) {
      game.status = status; const before = game.snapshot();
      expect(game.moveTower(tower.id, 2)).toBe(false); expect(game.snapshot()).toEqual(before);
    }
    game.reset(); game.build(0, 'archer');
    expect(game.towers[0].targeting).toBe('first'); expect(game.towers[0].padId).toBe(0);
  });

  it('advances movement and cooldowns at triple speed, with safe fallback for unsupported values', () => {
    const game = new GameModel(); game.startWave(); game.meteor(0, 0); game.speed = 3;
    game.update(.1);
    expect(game.time).toBeCloseTo(.3);
    expect(game.enemies[0].distance).toBeCloseTo(48 * .3);
    expect(game.meteorCooldown).toBeCloseTo(24.7);
    game.paused = true; const before = game.snapshot(); game.update(10); expect(game.snapshot()).toEqual(before);
    for (const invalid of [0, -1, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const fallback = new GameModel(); fallback.speed = invalid; fallback.update(.1);
      expect(fallback.time).toBeCloseTo(.1);
    }
  });
});
