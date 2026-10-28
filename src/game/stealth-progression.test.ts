import { describe, expect, it } from 'vitest';
import { GameModel, DIFFICULTIES, LEVELS, TOWER_DEFS, ENEMY_DEFS, positionAt, type Enemy, type EnemyKind } from './model';

function nearbyHidden(game:GameModel,kind:EnemyKind='scout'):Enemy {
  const home=game.getTowerPosition(game.towers[0]),road=game.nearestPathPoint(home.x,home.y);
  const enemy:Enemy={id:1000,kind,...positionAt(road.distance,game.path),hp:1000,maxHp:1000,distance:road.distance,speed:0,slowUntil:0};
  expect(enemy.distance).toBeLessThan(game.pathLength*.82);
  game.enemies=[enemy];return enemy;
}

describe('ordinary detection upgrades and a fair stealth introduction',()=>{
  it('gives trained Arrow and Ice ordinary tier-II detectors that survive specialization',()=>{
    for(const kind of ['archer','frost'] as const){
      const game=new GameModel();game.setTowerMastery({[kind]:180});game.gold=1000;game.build(0,kind);const tower=game.towers[0];
      expect(game.getTowerStats(tower).effects.reveal).toBeUndefined();
      expect(game.upgrade(tower.id)).toBe(false);
      game.wave=1;expect(game.upgrade(tower.id)).toBe(true);
      expect(game.getTowerStats(tower).effects.reveal).toBe(true);
      game.wave=3;expect(game.upgrade(tower.id,'A')).toBe(true);
      expect(game.getTowerStats(tower).effects.reveal).toBe(true);
      expect(TOWER_DEFS[kind].premiumCost).toBeUndefined();
    }
  });

  it('lets lanterns reveal an enemy for allied physical fire before the keep',()=>{
    const game=new GameModel();game.setTowerMastery({archer:12});game.gold=1000;game.build(0,'archer');game.build(2,'cannon');
    Object.defineProperty(game,'trees',{get:()=>[]});
    const [lantern,cannon]=game.towers;cannon.position={...game.getTowerPosition(lantern)};
    game.status='wave';game.wave=1;const scout=nearbyHidden(game);lantern.cooldown=100;
    game.update(.01);expect(scout.hp).toBe(1000); // Both ordinary tier-I weapons are blind.
    game.status='building';expect(game.upgrade(lantern.id)).toBe(true);game.status='wave';game.wave=2;
    lantern.cooldown=100;game.update(.01);
    expect(scout.revealedUntil).toBeGreaterThan(game.time);
    expect(scout.hp).toBeLessThan(1000); // The lantern cannot shoot: the cannon landed this hit.
    expect(game.shots.some(shot=>shot.kind==='cannon'&&shot.hitIds?.includes(scout.id))).toBe(true);
  });

  it('retains an immediate nonpremium elemental answer to physical-resistant ghosts',()=>{
    const game=new GameModel();expect(game.build(0,'arcane')).toBe(true);
    Object.defineProperty(game,'trees',{get:()=>[]});game.status='wave';game.wave=1;
    const wraith=nearbyHidden(game,'shadowwraith');game.update(.01);
    expect(wraith.hp).toBeLessThan(1000);expect(wraith.revealedUntil).toBeGreaterThan(game.time);
    expect(game.isUnlocked('truesight')).toBe(false);
  });

  it('warns of the next hidden formation and distinguishes a ready upgrade from a new tower needing training',()=>{
    const game=new GameModel();game.build(0,'archer');let briefing=game.stealthBriefing()!;
    expect(briefing.wave).toBe(4);expect(briefing.imminent).toBe(false);expect(briefing.groups).toEqual([{kind:'scout',name:'Veil scout',count:3}]);
    let lantern=briefing.options.find(option=>option.action==='upgrade'&&option.kind==='archer')!;
    expect(lantern.cost).toBe(55);expect(lantern.totalCost).toBe(135);expect(lantern.affordable).toBe(true);expect(lantern.available).toBe(false);
    expect(briefing.options.every(option=>option.unlocked&&!TOWER_DEFS[option.kind].premiumCost)).toBe(true);
    game.setTowerMastery({archer:12});game.wave=3;briefing=game.stealthBriefing()!;expect(briefing.imminent).toBe(true);
    lantern=briefing.options.find(option=>option.action==='upgrade'&&option.kind==='archer')!;expect(lantern.available).toBe(true);
    const late=game.pads[1];game.build(late.id,'frost');
    expect(game.stealthBriefing()!.options.find(option=>option.kind==='frost'&&option.action==='upgrade')!.available).toBe(false);
    expect(game.stealthBriefing()!.options.find(option=>option.kind==='arcane')!.available).toBe(true);
    expect(game.upgrade(game.towers[0].id)).toBe(true);expect(game.stealthBriefing()!.hasDetector).toBe(true);
    game.wave=game.waves.length;expect(game.stealthBriefing()).toBeNull();
  });

  it('never introduces hidden units before a completed wave and an affordable gold-only counter on any difficulty',()=>{
    for(let index=0;index<LEVELS.length;index++)for(const difficulty of Object.keys(DIFFICULTIES) as (keyof typeof DIFFICULTIES)[]){
      const game=new GameModel(index);game.setDifficulty(difficulty);
      expect(game.waves[0].enemies.every(entry=>!ENEMY_DEFS[entry.kind].stealth)).toBe(true);
      const firstHidden=game.waves.findIndex(wave=>wave.enemies.some(entry=>ENEMY_DEFS[entry.kind].stealth));
      if(firstHidden<0)continue;
      expect(firstHidden,`${game.level.name}/${difficulty}`).toBeGreaterThanOrEqual(1);
      expect(game.build(0,'archer')).toBe(true);
      const briefing=game.stealthBriefing()!;
      expect(briefing.options.find(option=>option.kind==='archer'&&option.action==='upgrade')!.affordable).toBe(true);
      expect(briefing.options.find(option=>option.kind==='arcane')!.affordable).toBe(true);
      expect(game.waves[firstHidden].description).toContain('55g');
    }
  });

  it('pays for an Arrow detection upgrade from a real opening clear on every Easy and Normal stage',()=>{
    for(let index=0;index<LEVELS.length;index++)for(const difficulty of ['easy','normal'] as const){
      const game=new GameModel(index);game.setDifficulty(difficulty);game.build(0,'archer');game.startWave();
      for(let step=0;step<3000&&game.status==='wave';step++)game.update(.1);
      expect(game.status,`${game.level.name}/${difficulty}`).toBe('building');expect(game.lives).toBe(game.maxLives);
      const gold=game.gold;expect(game.upgrade(game.towers[0].id)).toBe(true);
      expect(game.gold).toBe(gold-55);expect(game.getTowerStats(game.towers[0]).effects.reveal).toBe(true);
      expect(game.isUnlocked('truesight')).toBe(false);
    }
  });

  it('gives sonar observation a different job from the magic support battery',()=>{
    const sonic=TOWER_DEFS.sonic.branches.C,magic=TOWER_DEFS.arcane.branches.C;
    expect(sonic.effects.reveal).toBe(true);expect(sonic.effects.knockback).toBeGreaterThan(0);
    expect(sonic.effects.auraHaste).toBeUndefined();expect(magic.effects.auraHaste).toBeGreaterThan(0);
  });
});
