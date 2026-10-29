import { describe, expect, it } from 'vitest';
import { GameModel, positionAt, type Enemy, type EnemyKind, type TowerKind } from './model';
import { ENEMY_KINDS, ENEMY_DEFS, ENEMY_COUNTERS, TOWER_DEFS, TOWER_MATCHUPS, enemyCounterInfo, enemyDamageMultiplier } from './catalog';

/** Actual landed hits keep displayed matchup advice accountable to the simulation. */
function hitWith(towerKind:TowerKind,kind:EnemyKind) {
  const game=new GameModel();game.gold=1000;game.setProgression({},[towerKind]);game.build(0,towerKind);
  Object.defineProperty(game,'trees',{get:()=>[]});
  const home=game.getTowerPosition(game.towers[0]),road=game.nearestPathPoint(home.x,home.y);
  const enemy:Enemy={id:10000,kind,...positionAt(road.distance,game.path),hp:1000,maxHp:1000,distance:road.distance,speed:0,slowUntil:0,revealedUntil:100,nextAbilityAt:100};
  game.enemies=[enemy];game.status='wave';game.wave=1;game.update(.01);
  return{dealt:1000-enemy.hp,expected:TOWER_DEFS[towerKind].damage*enemyDamageMultiplier(kind,TOWER_DEFS[towerKind].damageType)};
}

describe('typed fantasy enemies and counter information',()=>{
  it('gives every enemy an ordinary counter and avoids recommending ground-only towers against flyers',()=>{
    expect(ENEMY_KINDS).toHaveLength(40);
    for(const kind of ENEMY_KINDS){
      const counter=ENEMY_COUNTERS[kind],info=enemyCounterInfo(kind);
      expect(counter.tip.length).toBeGreaterThan(25);
      expect(counter.towers.some(tower=>!TOWER_DEFS[tower].premiumCost),kind).toBe(true);
      expect(info.towerNames).toHaveLength(counter.towers.length);
      if(ENEMY_DEFS[kind].flying)expect(counter.towers.some(tower=>['cannon','mortar','earth','trap','barracks'].includes(tower)),kind).toBe(false);
      for(const type of info.weaknesses)expect(ENEMY_DEFS[kind].resistances[type]).toBeLessThan(0);
      expect(info.tags).toContain(ENEMY_DEFS[kind].flying?'Flying':'Ground');
    }
    expect(TOWER_MATCHUPS.cannon.weakAgainst).toContain('cinderdrake');
    expect(TOWER_MATCHUPS.earth.strongAgainst).toContain('siegebeast');
    expect(TOWER_MATCHUPS.archer.strongAgainst).toContain('arcanewarden');
  });

  for(const [enemy,strong,weak] of [
    ['emberimp','frost','solar'],['frostwolf','archer','frost'],['mossbeetle','venom','archer'],
    ['arcanewarden','archer','arcane'],['crystaldrone','tesla','arcane'],['siegebeast','earth','archer'],
    ['banshee','prism','archer'],['nullpriest','sonic','arcane'],['mirrorknight','cannon','prism'],
  ] as [EnemyKind,TowerKind,TowerKind][]){
    it(`makes ${strong} exploit ${enemy} while ${weak} meets its defense`,()=>{
      const good=hitWith(strong,enemy),poor=hitWith(weak,enemy);
      expect(good.dealt).toBeCloseTo(good.expected);
      expect(poor.dealt).toBeCloseTo(poor.expected);
      expect(good.dealt).toBeGreaterThan(poor.dealt);
    });
  }

  it('uses generic caster abilities for new enemies and makes silence stop them',()=>{
    for(const silenced of [false,true]){
      const game=new GameModel(),kind:EnemyKind='plaguewitch';game.status='wave';game.wave=20;
      const caster:Enemy={id:1000,kind,...positionAt(200,game.path),hp:1000,maxHp:1000,distance:200,speed:0,slowUntil:0,nextAbilityAt:0,disabledUntil:silenced?10:0};
      game.enemies=[caster];game.update(.01);
      expect(game.enemies.some(enemy=>enemy.kind==='swarmmite'&&enemy.summoned)).toBe(!silenced);
    }
    const game=new GameModel();game.status='wave';game.wave=20;
    const priest:Enemy={id:1000,kind:'nullpriest',...positionAt(200,game.path),hp:1000,maxHp:1000,distance:200,speed:0,slowUntil:0,nextAbilityAt:0};
    const ally:Enemy={...priest,id:1001,kind:'grunt',hp:400};game.enemies=[priest,ally];game.update(.01);
    expect(ally.hp).toBe(454);
  });
});
