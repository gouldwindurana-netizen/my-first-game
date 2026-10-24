import { describe, expect, it } from 'vitest';
import { ENEMY_DEFS, GameModel, PATH_LENGTH, WAVES, positionAt, type Enemy, type EnemyKind, type TowerKind } from './model';

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
