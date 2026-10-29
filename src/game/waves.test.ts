import { describe, expect, it } from 'vitest';
import { ENEMY_DEFS, ENEMY_KINDS, type EnemyKind } from './catalog';
import { LEVELS } from './levels';
import { generateWaves, WAVES_BY_DIFFICULTY } from './waves';

const difficulties = ['easy', 'normal', 'hard', 'hell'] as const;
const bosses: EnemyKind[] = ['boss', 'bonedragon', 'hellwarden'];

describe('difficulty campaign formations', () => {
  it('generates deterministic isolated lists with bounded enemy counts and ordered timers for all 48 campaigns', () => {
    for (const level of LEVELS) for (const difficulty of difficulties) {
      const waves = generateWaves(level, difficulty), repeated = generateWaves(level, difficulty);
      expect(waves).toEqual(repeated); expect(waves).not.toBe(repeated);
      expect(waves).toHaveLength(WAVES_BY_DIFFICULTY[difficulty]);
      for (const [index, wave] of waves.entries()) {
        expect(wave).not.toBe(repeated[index]); expect(wave.enemies).not.toBe(repeated[index].enemies);
        expect(wave.name.trim().length).toBeGreaterThan(0); expect(wave.description.trim().length).toBeGreaterThan(0);
        expect(wave.enemies.length).toBeGreaterThan(0); expect(wave.enemies.length).toBeLessThanOrEqual(44);
        expect(wave.enemies[0].delay).toBe(0);
        expect(wave.enemies.at(-1)!.delay).toBeLessThan(60);
        for (const [enemyIndex, enemy] of wave.enemies.entries()) {
          expect(ENEMY_DEFS[enemy.kind]).toBeDefined(); expect(Number.isFinite(enemy.delay)).toBe(true);
          if (enemyIndex) expect(enemy.delay).toBeGreaterThan(wave.enemies[enemyIndex - 1].delay);
        }
      }
    }
  });

  it('preserves the one-Arrow Easy/Normal opening and teaches detection before hidden enemies', () => {
    for (const level of LEVELS) for (const difficulty of difficulties) {
      const waves = generateWaves(level, difficulty);
      if (difficulty === 'easy' || difficulty === 'normal') expect(waves[0]).toEqual(level.openingWave);
      expect(waves.slice(0, 3).flatMap(wave => wave.enemies).every(enemy => !ENEMY_DEFS[enemy.kind].stealth)).toBe(true);
      const hidden = waves.findIndex(wave => wave.enemies.some(enemy => ENEMY_DEFS[enemy.kind].stealth));
      expect(hidden).toBeGreaterThanOrEqual(3);
      expect(waves[hidden - 1].description).toContain('Next wave has hidden enemies');
      expect(waves[hidden].description).toContain('55g'); expect(waves[hidden].description).toContain('160g');
      expect(waves[hidden].description).toContain('no wave-clear lock');
    }
  });

  it('gives harder modes a strictly broader roster with advanced threats after their lessons', () => {
    for (const level of LEVELS) {
      const rosters = difficulties.map(difficulty => new Set(generateWaves(level, difficulty).flatMap(wave => wave.enemies.map(enemy => enemy.kind))));
      for (let index = 1; index < rosters.length; index++) {
        expect(rosters[index].size).toBeGreaterThan(rosters[index - 1].size);
        for (const kind of rosters[index - 1]) expect(rosters[index].has(kind)).toBe(true);
      }
      expect(rosters[0].has('swarmmite')).toBe(true); expect(rosters[1].has('arcanewarden')).toBe(true);
      expect(rosters[1].has('siegebeast')).toBe(false); expect(rosters[2].has('siegebeast')).toBe(true);
      expect(rosters[2].has('abysschampion')).toBe(false); expect(rosters[3].has('abysschampion')).toBe(true);
      const hell = generateWaves(level, 'hell');
      expect(hell.slice(0, 43).flatMap(wave => wave.enemies).some(enemy => enemy.kind === 'banshee')).toBe(false);
      expect(hell[43].enemies.some(enemy => enemy.kind === 'banshee')).toBe(true);
    }
    const all = new Set(LEVELS.flatMap(level => generateWaves(level, 'hell').flatMap(wave => wave.enemies.map(enemy => enemy.kind))));
    expect([...all].sort()).toEqual([...ENEMY_KINDS].sort());
  });

  it('reserves true bosses for the finale and places a champion every five waves', () => {
    for (const level of LEVELS) for (const difficulty of difficulties) {
      const waves = generateWaves(level, difficulty);
      expect(waves.at(-1)!.enemies.some(enemy => bosses.includes(enemy.kind))).toBe(true);
      expect(waves.slice(0, -1).flatMap(wave => wave.enemies).some(enemy => bosses.includes(enemy.kind))).toBe(false);
      for (let number = 5; number < waves.length; number += 5) expect(waves[number - 1].enemies.some(enemy => enemy.miniBoss)).toBe(true);
      expect(waves.at(-1)!.description).toContain('Final assault');
    }
  });

  it('introduces advanced counters in small lessons before mixing them into later assaults', () => {
    for (const level of LEVELS) {
      const waves = generateWaves(level, 'hell');
      for (const [number, kind] of [[32, 'siegebeast'], [38, 'cinderdrake'], [44, 'banshee'], [50, 'nullpriest'], [56, 'mirrorknight'], [62, 'plaguewitch'], [68, 'riftassassin'], [74, 'abysschampion']] as [number, EnemyKind][]) {
        const firstSight = waves[number - 1].enemies.filter(enemy => enemy.kind === kind);
        expect(firstSight.length).toBeGreaterThan(0);
        expect(firstSight.length).toBeLessThanOrEqual(ENEMY_DEFS[kind].hp >= 300 ? 2 : 4);
        expect(waves[number - 1].enemies.some(enemy => enemy.kind !== kind)).toBe(true);
      }
    }
  });
});
