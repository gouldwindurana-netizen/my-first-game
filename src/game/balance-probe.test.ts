import { describe, expect, it } from 'vitest';
import { GameModel, LEVELS, type TowerKind } from './model';
import { Progression, SKILL_NODES } from './progression';

/** A reproducible player strategy: fill road coverage, specialize, and use Starfall on groups. */
function defend(game: GameModel): void {
  const sites = [...game.pads].sort((a, b) =>
    game.nearestPathPoint(a.x, a.y).distance - game.nearestPathPoint(b.x, b.y).distance);
  const arsenal: TowerKind[] = ['prism', 'arcane', 'prism', 'tesla', 'arcane', 'prism', 'arcane', 'prism'];
  let nextSite = 0;
  for (let step = 0; step < 25_000 && game.status !== 'won' && game.status !== 'lost'; step++) {
    if (nextSite < sites.length) {
      if (game.build(sites[nextSite].id, arsenal[nextSite])) nextSite++;
    } else {
      // Single-target holy beams counter bosses while multi-target magic handles their escorts.
      for (const tower of game.towers) game.upgrade(tower.id, 'A');
    }
    if (game.status === 'building') game.startWave();
    if (game.meteorCooldown === 0 && game.enemies.length) {
      const clusters = game.enemies.map(enemy => ({
        enemy,
        nearby: game.enemies.filter(other => Math.hypot(other.x - enemy.x, other.y - enemy.y) < 120),
        damage: game.enemies.reduce((sum, other) => sum +
          (Math.hypot(other.x - enemy.x, other.y - enemy.y) < 120 ? Math.min(other.hp, 145) : 0), 0),
      })).sort((a, b) => b.damage - a.damage);
      const bossPresent = game.enemies.some(enemy => ['boss', 'bonedragon', 'hellwarden'].includes(enemy.kind));
      const nearKeep = game.enemies.some(enemy => enemy.distance > game.pathLength * .9);
      if (clusters[0].nearby.length >= 3 || bossPresent || nearKeep) {
        game.meteor(clusters[0].enemy.x, clusters[0].enemy.y);
      }
    }
    game.update(.1);
    expect(Number.isFinite(game.gold) && game.gold >= 0, `${game.level.name}: purchases stay within earned gold`).toBe(true);
  }
  expect(game.status, `${game.level.name}: reached wave ${game.wave}/${game.waves.length} with ${game.lives} lives`).toBe('won');
  expect(game.wave).toBe(game.waves.length);
  expect(game.lives).toBeGreaterThan(0);
}

function investEarnedRewards(progression: Progression): void {
  // Starting-gold ranks have a finite cap; these purchases never grant free battle currency.
  while (progression.shopPurchase('supply-cache')) { /* Stop at the owned-rank or gem limit. */ }
  let bought = true;
  while (bought) {
    bought = false;
    for (const branch of ['damage', 'elemental', 'haste', 'range']) {
      const next = SKILL_NODES.filter(node => node.branch === branch && progression.canBuySkill(node.id))
        .sort((a, b) => progression.getSkillCost(a.id) - progression.getSkillCost(b.id))[0];
      if (next && progression.buySkill(next.id)) bought = true;
    }
  }
}

describe('Normal campaign balance with earned resources', () => {
  it('lets a new player finish the training stage without skills, shop items, or premium towers', () => {
    const game = new GameModel();
    expect(game.difficulty).toBe('normal');
    defend(game);
    expect(game.towers.every(tower => ['prism', 'arcane', 'tesla'].includes(tower.kind))).toBe(true);
  });

  it('can finish all twelve stages using only prior clear rewards and gold earned during each defense', () => {
    const progression = new Progression(null);
    for (let index = 0; index < LEVELS.length; index++) {
      const game = new GameModel(index);
      expect(game.setProgression(progression.bonuses, progression.unlockedTowers, progression.unlockedCapstones)).toBe(true);
      game.reset();
      defend(game);
      const earned = progression.recordResult({
        stageId: game.level.id, difficulty: game.difficulty, lives: game.lives,
        maxLives: game.maxLives, wave: game.wave, won: true, runId: `earned-campaign-${game.level.id}`,
      });
      expect(earned.firstClear).toBe(true);
      expect(earned.xp).toBeGreaterThan(0);
      expect(earned.gems).toBeGreaterThan(0);
      expect(progression.stageProgress(game.level.id, 'normal')?.cleared).toBe(true);
      investEarnedRewards(progression);
      expect(progression.xp).toBeGreaterThanOrEqual(0);
      expect(progression.gems).toBeGreaterThanOrEqual(0);
    }
    expect(Object.values(progression.state.stages).filter(stage => stage.normal?.cleared)).toHaveLength(12);
    expect(progression.totalRanks).toBeGreaterThan(0);
    expect(progression.state.shopRanks['supply-cache']).toBe(5);
    expect(progression.unlockedTowers).toHaveLength(12); // No premium family is required to finish Normal.
  });
});
