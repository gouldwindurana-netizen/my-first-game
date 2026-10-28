import { describe,expect,it } from 'vitest';
import { GameModel,LEVELS,TOWER_DEFS,ENEMY_DEFS,TOWER_KINDS,DIFFICULTIES,lineBlocked,positionAt,type Enemy,type EnemyKind,type TowerKind,type TowerBranchKey,type Tower } from './model';

function enemy(game:GameModel,id:number,kind:EnemyKind,distance=210,hp=ENEMY_DEFS[kind].hp):Enemy {
  return{id,kind,...positionAt(distance,game.path),hp,maxHp:hp,distance,speed:ENEMY_DEFS[kind].speed,slowUntil:0};
}
function advance(game:GameModel,seconds:number){for(let i=0;i<Math.ceil(seconds*10);i++)game.update(Math.min(.1,seconds-i*.1));}
function trained(game:GameModel){game.setTowerMastery(Object.fromEntries(TOWER_KINDS.map(kind=>[kind,1000])));return game;}
function armed(kind:TowerKind,branch?:TowerBranchKey){
  const game=trained(new GameModel());game.setProgression({},TOWER_KINDS);game.gold=10000;game.build(0,kind);
  Object.defineProperty(game,'trees',{get:()=>[],configurable:true});
  const tower=game.towers[0];if(branch){game.wave=1;game.upgrade(tower.id);if(branch==='D')game.difficulty='hell';game.wave=3;game.upgrade(tower.id,branch);}
  game.status='wave';game.wave=1;return{game,tower};
}
function placeAtTower(game:GameModel,tower:Tower,kind:EnemyKind,hp=1000,id=1000){
  const point=game.getTowerPosition(tower),road=game.nearestPathPoint(point.x,point.y);
  const e=enemy(game,id,kind,road.distance,hp);e.speed=0;game.enemies.push(e);return e;
}

describe('gold, construction and branch contracts',()=>{
  it('keeps built towers and traps fixed, with no relocation API',()=>{
    const game=new GameModel();game.gold=2000;game.build(0,'archer');game.build(1,'trap');
    expect('moveTower' in game).toBe(false);expect('moveCost' in game).toBe(false);
    const positions=game.towers.map(t=>game.getTowerPosition(t));advance(game,2);
    expect(game.towers.map(t=>game.getTowerPosition(t))).toEqual(positions);
  });
  it('locks upgrades by cleared waves and requires the newly upgraded tier to defend another wave',()=>{
    const game=trained(new GameModel());game.gold=10000;game.build(0,'archer');const tower=game.towers[0],gold=game.gold;
    expect(game.getUpgradeGate(tower)).toMatchObject({allowed:false,requiredClears:1,cleared:0,reason:'Clear wave 1 before tier II.',researched:true});
    expect(game.upgrade(tower.id)).toBe(false);expect(game.gold).toBe(gold);
    game.wave=1;game.status='wave';expect(game.upgrade(tower.id)).toBe(false);
    game.status='building';expect(game.upgrade(tower.id)).toBe(true);
    expect(game.getUpgradeGate(tower).requiredClears).toBe(3);expect(game.upgrade(tower.id,'A')).toBe(false);
    game.wave=3;expect(game.upgrade(tower.id,'A')).toBe(true);expect(tower.level).toBe(3);
    game.build(1,'archer');const late=game.towers[1];expect(game.getUpgradeGate(late).requiredClears).toBe(4);expect(game.upgrade(late.id)).toBe(false);
    game.wave=4;expect(game.upgrade(late.id)).toBe(true);expect(game.upgrade(late.id,'A')).toBe(false);expect(game.getUpgradeGate(late).requiredClears).toBe(5);
  });
  it('expires lingering fields during preparation and freezes their lifetime while paused',()=>{
    const game=new GameModel();game.zones=[{id:100,towerId:1,kind:'earth',x:400,y:300,radius:50,damage:8,damageType:'earth',expiresAt:.15,effects:{}}];
    game.paused=true;game.update(.1);expect(game.zones).toHaveLength(1);expect(game.time).toBe(0);
    game.paused=false;game.update(.1);expect(game.zones).toHaveLength(1);game.update(.1);expect(game.zones).toHaveLength(0);
  });
  it('charges the requested base and tier-two prices, rejects invalid and occupied sites',()=>{
    const game=trained(new GameModel());const initial=game.gold;
    expect(game.build(0,'archer')).toBe(true);expect(game.gold).toBe(initial-80);
    expect(game.build(0,'cannon')).toBe(false);expect(game.build(999,'archer')).toBe(false);
    game.wave=1;expect(game.upgrade(game.towers[0].id)).toBe(true);expect(game.gold).toBe(initial-80-55);
    game.gold=0;expect(game.build(1,'cannon')).toBe(false);
  });
  it('enforces premium unlocks in the model and applies a purchased family',()=>{
    const game=new GameModel();game.gold=1000;expect(game.build(0,'void')).toBe(false);
    expect(game.setProgression({},['void'])).toBe(true);expect(game.build(0,'void')).toBe(true);
    expect(game.build(1,'nexus')).toBe(false);
  });
  it('offers mutually exclusive branches and model-enforces the Hell specialization',()=>{
    const game=trained(new GameModel());game.gold=10000;game.build(0,'archer');const t=game.towers[0];
    game.wave=1;game.upgrade(t.id);game.wave=3;const before=game.gold;expect(game.upgrade(t.id,'D')).toBe(false);expect(game.gold).toBe(before);
    expect(game.upgrade(t.id,'B')).toBe(true);expect(t.branch).toBe('B');expect(game.upgrade(t.id,'C')).toBe(false);
    expect(game.getTowerStats(t).effects.pierce).toBe(2);
    const hell=trained(new GameModel());hell.setDifficulty('hell');hell.gold=10000;hell.build(0,'archer');hell.wave=1;hell.upgrade(hell.towers[0].id);hell.wave=3;expect(hell.upgrade(hell.towers[0].id,'D')).toBe(true);
  });
  it('sells fixed defenses for 70% of the paid investment',()=>{
    const game=trained(new GameModel());game.gold=1000;game.build(0,'archer');const t=game.towers[0];game.wave=1;game.upgrade(t.id);
    const before=game.gold,spent=t.spent;expect(game.sell(t.id)).toBe(true);expect(game.gold).toBe(before+Math.floor(spent*.7));expect(game.sell(t.id)).toBe(false);
  });
  it('merges meta bonuses once, uses auras, and preserves branch identity',()=>{
    const {game,tower}=armed('archer','C');const base=game.getTowerStats(tower);
    game.status='building';game.setProgression({damage:.2,range:.1,haste:.15,grandmastery:.2},TOWER_KINDS);
    const boosted=game.getTowerStats(tower);expect(boosted.damage).toBe(Math.round(base.damage*1.2));expect(boosted.range).toBeCloseTo(base.range*1.1);expect(boosted.interval).toBeCloseTo(base.interval/1.15);
    game.build(1,'arcane');const aura=game.towers.at(-1)!;game.wave=game.getUpgradeGate(aura).requiredClears;game.upgrade(aura.id);game.wave=game.getUpgradeGate(aura).requiredClears;game.upgrade(aura.id,'C');
    expect(game.getTowerStats(tower).damage).toBeGreaterThan(boosted.damage);expect(tower.branch).toBe('C');
  });
});

describe('damage, targeting, cover and detection',()=>{
  it('respects first, strongest and fastest priorities including slows',()=>{
    for(const mode of ['first','strongest','fastest'] as const){
      const {game,tower}=armed('archer');game.setTargeting(tower.id,mode);
      const a=enemy(game,1000,'grunt',220,1000),b=enemy(game,1001,'grunt',210,1400),c=enemy(game,1002,'runner',200,1000);a.speed=b.speed=0;c.speed=5;
      game.enemies=[a,b,c];game.update(.01);const damaged=[a,b,c].filter(e=>e.hp<e.maxHp);expect(damaged.map(e=>e.id)).toEqual([mode==='first'?1000:mode==='strongest'?1001:1002]);
    }
  });
  it('uses physical armor, elemental resistance and weakness rather than enemy-name exceptions',()=>{
    const physical=armed('archer'),heavy=placeAtTower(physical.game,physical.tower,'brute');physical.game.update(.01);
    expect(heavy.hp).toBeCloseTo(1000-TOWER_DEFS.archer.damage*(1-ENEMY_DEFS.brute.armor));
    const magic=armed('arcane'),same=placeAtTower(magic.game,magic.tower,'brute');magic.game.update(.01);expect(same.hp).toBe(1000-TOWER_DEFS.arcane.damage);
    const ice=armed('frost'),runner=placeAtTower(ice.game,ice.tower,'runner');ice.game.update(.01);expect(runner.hp).toBeCloseTo(1000-TOWER_DEFS.frost.damage*1.15);
  });
  it('detects segment-tree intersections, including tangency but not trees beyond the victim',()=>{
    expect(lineBlocked({x:0,y:0},{x:100,y:0},[{x:50,y:5,radius:5}])).toBe(true);
    expect(lineBlocked({x:0,y:0},{x:100,y:0},[{x:150,y:0,radius:10}])).toBe(false);
  });
  it('blocks direct fire behind trees while mortar arcs over the same cover',()=>{
    const {game,tower}=armed('archer'),target=placeAtTower(game,tower,'grunt'),point=game.getTowerPosition(tower);
    Object.defineProperty(game,'trees',{get:()=>[{x:(point.x+target.x)/2,y:(point.y+target.y)/2,radius:12}]});
    game.update(.01);expect(target.hp).toBe(1000);tower.kind='mortar';tower.cooldown=0;game.update(.01);expect(target.hp).toBeLessThan(1000);
  });
  it('requires detection for hidden enemies and offers base Magic as well as premium Truesight',()=>{
    const arrows=armed('archer'),hidden=placeAtTower(arrows.game,arrows.tower,'scout',1000,1005);arrows.game.update(.01);expect(hidden.hp).toBe(1000);
    arrows.game.build(2,'arcane');arrows.game.towers.at(-1)!.cooldown=100;arrows.game.update(.01);
    expect(hidden.revealedUntil).toBeGreaterThan(arrows.game.time);expect(hidden.hp).toBeLessThan(1000);
    const sight=armed('truesight'),ghost=placeAtTower(sight.game,sight.tower,'shadowwraith');sight.game.update(.01);expect(ghost.hp).toBeLessThan(1000-23);
  });
  it('skips flying enemies for ground cannons, traps, earth and melee but permits arrows',()=>{
    for(const kind of ['cannon','earth','barracks'] as const){const {game,tower}=armed(kind),bat=placeAtTower(game,tower,'bat');game.update(.01);expect(bat.hp).toBe(1000);expect(bat.blockedBy).toBeUndefined();}
    const {game,tower}=armed('archer'),bat=placeAtTower(game,tower,'bat');game.update(.01);expect(bat.hp).toBeLessThan(1000);
  });
  it('makes dodge deterministic while reliable area attacks cannot be dodged',()=>{
    const run=(kind:TowerKind)=>{const {game,tower}=armed(kind);const target=placeAtTower(game,tower,'raider',1000,1);game.update(.01);return target.hp;};
    expect(run('archer')).toBe(run('archer'));expect(run('cannon')).toBeLessThan(1000);
  });
});

describe('statuses and branch attack patterns',()=>{
  it('ticks burn and poison across exact expiry and freezes their clocks on pause',()=>{
    const game=new GameModel();game.status='wave';game.wave=1;const e=enemy(game,1000,'grunt',200,1000);e.speed=0;e.poisonDps=20;e.poisonUntil=.15;e.burnDps=10;e.burnUntil=.25;game.enemies=[e];
    game.update(.1);expect(e.hp).toBeCloseTo(997);game.paused=true;advance(game,1);expect(e.hp).toBeCloseTo(997);game.paused=false;advance(game,.2);expect(e.hp).toBeCloseTo(994.5);
    advance(game,.5);expect(e.hp).toBeCloseTo(994.5);
  });
  it('integrates a slow or stun expiring partway through a simulation step',()=>{
    const game=new GameModel();game.status='wave';game.wave=1;const e=enemy(game,1000,'grunt',200,1000);e.speed=100;e.slowUntil=.05;e.slowStrength=.5;e.stunUntil=.02;game.enemies=[e];game.update(.1);
    expect(e.distance).toBeCloseTo(206.5);
  });
  it('applies stun, root and knockback but honors full crowd-control immunity',()=>{
    for(const [kind,branch,status] of [['chrono','A','stunUntil'],['frost','A','rootUntil'],['sonic','A','distance']] as const){
      const {game,tower}=armed(kind,branch),e=placeAtTower(game,tower,'grunt');const before=e.distance;game.update(.01);
      expect(status==='distance'?e.distance<before:(e[status]||0)>game.time).toBe(true);
      const other=armed(kind,branch),immune=placeAtTower(other.game,other.tower,'stonegolem');const original=immune.distance;other.game.update(.01);expect(immune.stunUntil||0).toBe(0);expect(immune.rootUntil||0).toBe(0);expect(immune.slowUntil).toBe(0);expect(immune.distance).toBe(original);
    }
  });
  it('strips armor and curses subsequent incoming damage',()=>{
    const {game,tower}=armed('venom','C'),e=placeAtTower(game,tower,'brute');game.update(.01);expect(e.armorShred).toBe(.35);
    game.build(2,'archer');const archer=game.towers.at(-1)!;tower.cooldown=100;const before=e.hp;game.update(.01);expect(e.hp).toBeLessThan(before-15);
    const curse=armed('arcane','B'),victim=placeAtTower(curse.game,curse.tower,'grunt');curse.game.update(.01);expect(victim.curse).toBe(.25);
  });
  it('multishots and chains visit distinct foes, while pierce hits enemies on a line',()=>{
    const multi=armed('archer','A');const p=multi.game.nearestPathPoint(234,241).distance;multi.game.enemies=[0,12,24,36].map((offset,i)=>{const e=enemy(multi.game,1000+i,'grunt',p+offset,1000);e.speed=0;return e;});multi.game.update(.01);expect(multi.game.enemies.filter(e=>e.hp<1000)).toHaveLength(3);
    const chain=armed('tesla','A');chain.game.enemies=[0,12,24,36,48,60,72,84].map((offset,i)=>{const e=enemy(chain.game,2000+i,'grunt',p+offset,1000);e.speed=0;return e;});chain.game.update(.01);expect(chain.game.enemies.filter(e=>e.hp<1000)).toHaveLength(7);
    const pierce=armed('archer','B'),origin=pierce.game.getTowerPosition(pierce.tower);const old=pierce.game.path;const e1=enemy(pierce.game,3001,'grunt',p,1000),e2=enemy(pierce.game,3002,'grunt',p,1000);e1.speed=e2.speed=0;
    const road=pierce.game.nearestPathPoint(origin.x,origin.y);e1.x=road.x;e1.y=road.y;e2.x=road.x;e2.y=road.y; // Coincident lane targets must each be hit once.
    pierce.game.enemies=[e1,e2];pierce.game.update(.01);expect(pierce.game.enemies.filter(e=>e.hp<1000)).toHaveLength(2);expect(old).toBe(pierce.game.path);
  });
  it('creates real lingering fields and poisons enemies entering a cloud after impact',()=>{
    const {game,tower}=armed('venom','A'),first=placeAtTower(game,tower,'grunt');game.update(.01);expect(game.zones).toHaveLength(1);tower.cooldown=100;
    const newcomer=enemy(game,1002,'grunt',first.distance,1000);newcomer.speed=0;game.enemies.push(newcomer);game.update(.1);expect(newcomer.poisonUntil).toBeGreaterThan(game.time);expect(newcomer.hp).toBeLessThan(1000);
  });
  it('spreads poison from a defeated victim without giving duplicate kill rewards',()=>{
    const game=new GameModel();game.status='wave';game.wave=1;const victim=enemy(game,1000,'grunt',210,1),nearby=enemy(game,1001,'grunt',220,1000);victim.poisonUntil=4;victim.poisonDps=30;victim.poisonSpread=true;victim.speed=nearby.speed=0;game.enemies=[victim,nearby];const gold=game.gold;
    game.update(.1);expect(game.kills).toBe(1);expect(game.gold).toBe(gold+ENEMY_DEFS.grunt.reward);expect(nearby.poisonUntil).toBeGreaterThan(game.time);advance(game,.2);expect(game.kills).toBe(1);
  });
});

describe('physical troops and finite-use traps',()=>{
  it('soldiers march to the rally point, fight nearest ground enemies, block them and return',()=>{
    const game=new GameModel();game.build(0,'barracks');const tower=game.towers[0],start=game.getTowerPosition(tower);expect(game.troops).toHaveLength(2);
    advance(game,3);expect(Math.hypot(game.troops[0].x-start.x,game.troops[0].y-start.y)).toBeGreaterThan(20);
    const road=game.nearestPathPoint(tower.rally!.x,tower.rally!.y),target=enemy(game,1000,'grunt',road.distance,1000);target.speed=0;game.status='wave';game.wave=1;game.enemies=[target];advance(game,.5);
    expect(game.troops.some(t=>t.state==='fighting')).toBe(true);expect(target.blockedBy).toBeDefined();expect(target.hp).toBeLessThan(1000);
    game.enemies=[];game.status='building';advance(game,2);expect(game.troops.every(t=>t.targetId===null)).toBe(true);expect(game.troops.every(t=>Math.hypot(t.x-t.rally.x,t.y-t.rally.y)<3)).toBe(true);
  });
  it('elite barracks change troop count and dead soldiers respawn after a delay',()=>{
    const {game,tower}=armed('barracks','C');expect(game.troops).toHaveLength(1);expect(game.troops[0].maxHp).toBe(760);
    const soldier=game.troops[0];soldier.hp=0;soldier.respawnAt=game.time+8;game.status='building';advance(game,7);expect(soldier.hp).toBe(0);advance(game,1.1);expect(soldier.hp).toBe(soldier.maxHp);expect(game.setRally(tower.id,NaN,0)).toBe(false);
  });
  it('validates trap locations, spends finite charges and requires a paid rearm',()=>{
    const game=new GameModel();game.gold=10000;const point=positionAt(230,game.path),before=game.gold;
    expect(game.buildTrap(NaN,0)).toBe(false);expect(game.buildTrap(0,0)).toBe(false);expect(game.gold).toBe(before);expect(game.buildTrap(point.x,point.y)).toBe(true);const trap=game.towers[0];expect(trap.padId).toBeLessThan(0);expect(game.buildTrap(point.x,point.y)).toBe(false);
    game.status='wave';game.wave=1;const target=enemy(game,1000,'brute',230,10000);target.speed=0;game.enemies=[target];advance(game,8);expect(trap.uses).toBe(0);const hp=target.hp;advance(game,2);expect(target.hp).toBe(hp);
    const rearmGold=game.gold;expect(game.rearmTrap(trap.id)).toBe(true);expect(game.gold).toBe(rearmGold-63);expect(trap.uses).toBe(trap.maxUses);
  });
  it('preserves used charges through paced upgrades instead of refilling for free',()=>{
    const game=trained(new GameModel());game.gold=10000;game.build(0,'trap');const trap=game.towers[0];trap.uses=1;game.wave=1;game.upgrade(trap.id);expect(trap.uses).toBe(1);game.wave=3;game.upgrade(trap.id,'A');expect(trap.maxUses).toBe(6);expect(trap.uses).toBe(3);
  });
});

describe('enemy abilities and lifecycle',()=>{
  it('splits before wave completion and rewards each defeat only once',()=>{
    const game=new GameModel();game.status='wave';game.wave=1;const e=enemy(game,1000,'voidling',200,1);e.poisonDps=100;e.poisonUntil=1;game.enemies=[e];game.update(.1);expect(game.enemies.filter(e=>e.kind==='grunt')).toHaveLength(2);expect(game.status).toBe('wave');expect(game.kills).toBe(1);
  });
  it('suppresses split-on-death while sonic silence is active',()=>{
    const {game,tower}=armed('sonic','B'),e=placeAtTower(game,tower,'voidling',1);game.update(.01);expect(e.hp).toBe(0);expect(game.enemies.some(e=>e.kind==='grunt')).toBe(false);
  });
  it('summons zero-gold skeletons and heals nearby damaged enemies',()=>{
    const game=new GameModel();game.status='wave';game.wave=1;const caster=enemy(game,1000,'necromancer',200,1000),healer=enemy(game,1001,'shaman',205,1000),ally=enemy(game,1002,'grunt',210,1000);caster.speed=healer.speed=ally.speed=0;caster.nextAbilityAt=healer.nextAbilityAt=0;ally.hp=500;game.enemies=[caster,healer,ally];game.update(.01);expect(game.enemies.some(e=>e.kind==='skeleton'&&e.summoned)).toBe(true);expect(ally.hp).toBe(530);
    const skeleton=game.enemies.find(e=>e.kind==='skeleton')!;skeleton.hp=1;skeleton.poisonDps=100;skeleton.poisonUntil=10;const before=game.gold;game.update(.1);expect(game.gold).toBe(before);
  });
  it('teleports on its ability timer and a shield absorbs a tower disruption once',()=>{
    const game=new GameModel();game.status='wave';game.wave=1;const e=enemy(game,1000,'voidling',200,1000);e.speed=0;e.nextTeleportAt=0;game.enemies=[e];game.update(.01);expect(e.distance).toBe(265);
    const shield=armed('prism','B'),conduit=placeAtTower(shield.game,shield.tower,'stormconduit');conduit.nextAbilityAt=0;shield.game.update(.01);expect(shield.tower.shieldCharges).toBe(0);expect(shield.tower.disabledUntil||0).toBe(0);conduit.nextAbilityAt=0;shield.game.update(.01);expect(shield.tower.disabledUntil).toBeGreaterThan(shield.game.time);
  });
  it('scales health and speed by difficulty and wave, and never permits changes during combat',()=>{
    const values=[];for(const difficulty of ['easy','normal','hard','hell'] as const){const game=new GameModel();expect(game.setDifficulty(difficulty)).toBe(true);expect(game.maxLives).toBe(DIFFICULTIES[difficulty].lives);game.startWave();game.update(.01);values.push({hp:game.enemies[0].maxHp,speed:game.enemies[0].speed});expect(game.setDifficulty('normal')).toBe(false);expect(game.setProgression({damage:1},TOWER_KINDS)).toBe(false);}
    expect(values.map(v=>v.hp)).toEqual([...values.map(v=>v.hp)].sort((a,b)=>a-b));expect(values[3].speed).toBeGreaterThan(values[0].speed);
    const later=new GameModel();later.wave=3;later.startWave();later.update(.01);expect(later.enemies[0].speed).toBeGreaterThan(ENEMY_DEFS[later.enemies[0].kind].speed);
  });
  it('pauses all state, clamps late frames, supports 3× and loses more lives to bosses',()=>{
    const game=new GameModel();game.startWave();game.paused=true;const before=game.snapshot();game.update(10);expect(game.snapshot()).toEqual(before);game.paused=false;game.update(10);expect(game.time).toBeCloseTo(.1);game.speed=3;game.update(.1);expect(game.time).toBeCloseTo(.4);
    game.enemies=[enemy(game,1000,'boss',game.pathLength-1)];game.update(.1);expect(game.lives).toBe(game.maxLives-8);
  });
  it('offers mixed next-wave counts and optional auto-wave, with 1–3 stars at victory',()=>{
    const game=new GameModel();expect(game.wavePreview().reduce((sum,group)=>sum+group.count,0)).toBe(game.nextWave()!.enemies.length);game.wave=1;game.autoWave=true;advance(game,3.1);expect(game.status).toBe('wave');
    game.status='won';game.lives=game.maxLives;expect(game.stars).toBe(3);game.lives=Math.floor(game.maxLives*.5);expect(game.stars).toBe(2);game.lives=1;expect(game.stars).toBe(1);
  });
  it('has twelve scripted stages ending in bosses and returns detached snapshots',()=>{
    expect(LEVELS).toHaveLength(12);for(let i=0;i<LEVELS.length;i++){const game=new GameModel(i);expect(game.waves.at(-1)!.enemies.some(e=>['boss','bonedragon','hellwarden'].includes(e.kind))).toBe(true);expect(game.pads.every(p=>!/[0-9]/.test(p.name))).toBe(true);const copy=game.snapshot();copy.path[0].x=-999;expect(game.path[0].x).not.toBe(-999);}
  });
});
