import { it, expect } from 'vitest';
import { GameModel, DIFFICULTIES, LEVELS, TOWER_DEFS, type Difficulty, type TowerKind, type TowerBranchKey } from './model';
import { Progression, SKILL_NODES } from './progression';

/** A mixed, nonpremium defense: physical pierce, holy damage, anti-air, and control cover different enemies. */
const branches: Partial<Record<TowerKind, TowerBranchKey>> = { archer: 'B', cannon: 'C', mortar: 'B', frost: 'C', earth: 'C', arcane: 'A', tesla: 'A', venom: 'C', prism: 'A', sonic: 'B', barracks: 'A' };
function run(game: GameModel) {
  const order = [...game.pads].sort((a,b) => game.nearestPathPoint(a.x,a.y).distance-game.nearestPathPoint(b.x,b.y).distance);
  const sites = [game.pads[0],...order.filter(p=>p.id!==0)];
  const arsenal: TowerKind[] = ['archer','arcane','prism','tesla','cannon','frost','venom','mortar','arcane','prism','earth','sonic','cannon','archer','prism','tesla'];
  let next=0;
  for(let step=0;step<150_000&&game.status!=='won'&&game.status!=='lost';step++){
    if(next<Math.min(4,sites.length)&&game.build(sites[next].id,arsenal[next]))next++;
    if(next>=Math.min(4,sites.length)){
      for(const tower of game.towers)game.upgrade(tower.id,branches[tower.kind]||'A');
      if(next<sites.length&&game.build(sites[next].id,arsenal[next]))next++;
    }
    if(game.status==='building')game.startWave();
    if(game.meteorCooldown===0&&game.enemies.length){
      const cluster=game.enemies.map(enemy=>({enemy,nearby:game.enemies.filter(other=>Math.hypot(enemy.x-other.x,enemy.y-other.y)<120).length})).sort((a,b)=>b.nearby-a.nearby)[0];
      if(cluster.nearby>=3||game.enemies.some(enemy=>['boss','bonedragon','hellwarden'].includes(enemy.kind)||enemy.distance>game.pathLength*.85))game.meteor(cluster.enemy.x,cluster.enemy.y);
    }
    game.update(.1);
    if (!Number.isFinite(game.gold) || game.gold < 0) throw new Error(`${game.difficulty}: purchases exceeded earned gold`);
  }
}
it('finishes 25, 50, 75, and 100 waves using only preceding clear rewards, earned tower research, and battle gold',()=>{
 const progression=new Progression(null);
 const openingTreasuries:number[]=[];
 expect(progression.xp).toBe(0);expect(progression.gems).toBe(0);expect(progression.towerMastery).toEqual({});
 for(const difficulty of ['easy','normal','hard','hell'] as Difficulty[]){
  const game=new GameModel();game.setDifficulty(difficulty);game.setProgression(progression.bonuses,progression.unlockedTowers,progression.unlockedCapstones);game.setTowerMastery(progression.towerMastery);game.reset();
  // The only starting-gold increase is the Supply Cache bought with earlier clear gems.
  expect(game.gold).toBe(Math.round(LEVELS[0].startingGold*DIFFICULTIES[difficulty].gold+progression.bonuses.startingGold));
  openingTreasuries.push(game.gold);run(game);
  expect(game.status, `${difficulty}: reached ${game.wave}/${game.waves.length}`).toBe('won');
  expect(game.wave).toBe(({easy:25,normal:50,hard:75,hell:100} as const)[difficulty]);expect(game.lives).toBe(game.maxLives);
  expect(game.towers).toHaveLength(game.pads.length);expect(game.towers.every(tower=>!TOWER_DEFS[tower.kind].premiumCost)).toBe(true);
  expect(game.towers.some(tower=>tower.kind==='cannon'&&tower.level===3)||difficulty==='easy').toBe(true);
  const research=progression.recordTowerXP(game.towerXPReport);expect(Object.values(research).some(xp=>(xp||0)>0)).toBe(true);
  const reward=progression.recordResult({stageId:LEVELS[0].id,difficulty,lives:game.lives,maxLives:game.maxLives,wave:game.wave,won:true,runId:'earned-difficulty-'+difficulty});
  expect(reward.firstClear).toBe(true);expect(reward.xp).toBeGreaterThan(0);expect(reward.gems).toBeGreaterThan(0);
  while(progression.shopPurchase('supply-cache')){}
  for(let round=0;round<100;round++)for(const branch of ['damage','haste','range','elemental']){const node=SKILL_NODES.filter(n=>n.branch===branch&&progression.canBuySkill(n.id)).sort((a,b)=>progression.getSkillCost(a.id)-progression.getSkillCost(b.id))[0];if(node)progression.buySkill(node.id);}
  expect(progression.xp).toBeGreaterThanOrEqual(0);expect(progression.gems).toBeGreaterThanOrEqual(0);
 }
 expect(openingTreasuries).toEqual([336,315,321,309]);
 expect(progression.totalRanks).toBeGreaterThan(20);expect(progression.unlockedTowers).toHaveLength(12);
},120000);
