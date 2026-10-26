import { describe, expect, it } from 'vitest';
import { ENEMY_DEFS, ENEMY_KINDS, type EnemyKind } from './catalog';
import { LEVELS } from './levels';

function distanceToSegment(point: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x, dy = b.y - a.y, lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared)) : 0;
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}

describe('twelve-stage scripted campaign', () => {
  it('keeps legacy save identities while presenting the requested ordered campaign', () => {
    expect(LEVELS.map(level => level.name)).toEqual([
      'Verdant Vale', 'Windward Plateau', 'Toxic Swamp', 'Frostpeak', 'Storm Highlands',
      'Crystal Caverns', 'Ember Wastes', 'Dark Chasm', 'Ancient Sanctum', 'The Void Rift',
      'Moonlit Citadel', 'Final Reckoning',
    ]);
    expect(new Set(LEVELS.map(level => level.id)).size).toBe(12);
    for (const legacy of ['eldervale', 'frostbound', 'ember', 'mirewood', 'crystal']) expect(LEVELS.some(level => level.id === legacy)).toBe(true);
  });

  it('gives every stage a timed mixed script, an earlier mini-boss, and a final boss', () => {
    const bosses: EnemyKind[] = ['boss', 'bonedragon', 'hellwarden'];
    for (const level of LEVELS) {
      expect(level.waves.length).toBeGreaterThanOrEqual(6);
      expect(level.waves.length).toBeLessThanOrEqual(12);
      const earlier = level.waves.slice(0, -1).flatMap(wave => wave.enemies);
      expect(earlier.some(enemy => enemy.miniBoss)).toBe(true);
      expect(level.waves.at(-1)!.enemies.some(enemy => bosses.includes(enemy.kind))).toBe(true);
      expect(level.waves.slice(0, -1).flatMap(wave => wave.enemies).every(enemy => !bosses.includes(enemy.kind))).toBe(true);
      for (const wave of level.waves) {
        expect(wave.name.trim().length).toBeGreaterThan(0);
        expect(wave.description.trim().length).toBeGreaterThan(0);
        expect(wave.enemies.length).toBeGreaterThan(0);
        expect(wave.enemies[0].delay).toBe(0);
        wave.enemies.forEach((enemy, index) => {
          expect(ENEMY_DEFS[enemy.kind]).toBeDefined();
          expect(Number.isFinite(enemy.delay)).toBe(true);
          if (index > 0) expect(enemy.delay).toBeGreaterThan(wave.enemies[index - 1].delay);
        });
      }
      expect(new Set(level.waves.flatMap(wave => wave.enemies.map(enemy => enemy.kind))).size).toBeGreaterThanOrEqual(6);
    }
    expect(LEVELS.reduce((sum, level) => sum + level.waves.length, 0)).toBe(110);
    expect(LEVELS.at(-1)!.waves).toHaveLength(12);
  });

  it('puts all twenty-four enemy families into real playable formations', () => {
    const used = new Set(LEVELS.flatMap(level => level.waves.flatMap(wave => wave.enemies.map(enemy => enemy.kind))));
    expect(used.size).toBe(24);
    for (const kind of ENEMY_KINDS) expect(used.has(kind)).toBe(true);
  });

  it('keeps every traced road and named foundation inside its undistorted artwork', () => {
    for (const level of LEVELS) {
      expect(level.path.length).toBeGreaterThanOrEqual(10);
      expect(level.pads.length).toBeGreaterThanOrEqual(5);
      expect(new Set(level.pads.map(pad => pad.name)).size).toBe(level.pads.length);
      for (const pad of level.pads) expect(pad.name).not.toMatch(/\d/);
      for (const point of [...level.path, ...level.pads]) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(level.world.width);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(level.world.height);
      }
      expect(level.camera).toEqual({ x: level.world.width / 2, y: level.world.height / 2 });
    }
  });

  it('places tree blockers on map margins without putting a trunk on a road or foundation', () => {
    for (const level of LEVELS) {
      if (level.mapKey === 'crystal') expect(level.trees).toEqual([]);
      else expect(level.trees.length).toBeGreaterThanOrEqual(2);
      for (const tree of level.trees) {
        expect(tree.radius).toBeGreaterThan(0);
        expect(tree.x - tree.radius).toBeGreaterThanOrEqual(0);
        expect(tree.y - tree.radius).toBeGreaterThanOrEqual(0);
        expect(tree.x + tree.radius).toBeLessThanOrEqual(level.world.width);
        expect(tree.y + tree.radius).toBeLessThanOrEqual(level.world.height);
        for (const pad of level.pads) expect(Math.hypot(tree.x - pad.x, tree.y - pad.y)).toBeGreaterThan(tree.radius + 20);
        for (let index = 1; index < level.path.length; index++) expect(distanceToSegment(tree, level.path[index - 1], level.path[index])).toBeGreaterThan(tree.radius + 5);
      }
    }
  });

  it('does not share mutable route, foundation, tree, or wave objects between reused maps', () => {
    for (let index = 0; index < LEVELS.length; index++) {
      for (let next = index + 1; next < LEVELS.length; next++) {
        expect(LEVELS[index].path).not.toBe(LEVELS[next].path);
        expect(LEVELS[index].pads).not.toBe(LEVELS[next].pads);
        expect(LEVELS[index].trees).not.toBe(LEVELS[next].trees);
        expect(LEVELS[index].waves).not.toBe(LEVELS[next].waves);
      }
    }
  });
});
