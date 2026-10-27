/** Combat content is data: gold costs are per defense; premium costs unlock a family permanently. */
export const TOWER_KINDS = ['archer','cannon','mortar','frost','earth','arcane','tesla','venom','prism','trap','sonic','barracks','void','solar','chrono','truesight','nexus'] as const;
export type TowerKind = typeof TOWER_KINDS[number];
export const BRANCH_KEYS = ['A','B','C','D'] as const;
export type TowerBranchKey = typeof BRANCH_KEYS[number];
export const DAMAGE_TYPES = ['physical','fire','ice','lightning','earth','arcane','poison','holy','sonic','void'] as const;
export type DamageType = typeof DAMAGE_TYPES[number];
export const TARGET_MODES = ['first','last','strongest','fastest'] as const;
export type TowerTargetMode = typeof TARGET_MODES[number];
export type UnitVisual = 'grunt' | 'runner' | 'brute' | 'boss';

/** Fractions describe slow/curse/shred/aura strength; durations are seconds; distances are world units.
 * Pierce and chain counts include the first victim. Values of zero explicitly remove a base effect.
 */
export interface TowerEffects {
  targets?: number; pierce?: number; chain?: number; chainRange?: number; splash?: number;
  slow?: number; slowDuration?: number; stun?: number; root?: number;
  burnDps?: number; burnDuration?: number; poisonDps?: number; poisonDuration?: number;
  armorShred?: number; curse?: number; knockback?: number; pull?: number;
  auraDamage?: number; auraHaste?: number; reveal?: boolean; shield?: number;
  executeGhosts?: number; disableAbilities?: number; spread?: boolean;
  lingerDuration?: number; zoneDps?: number; clusters?: number; ignoreArmor?: boolean;
  trapUses?: number; troops?: number; troopHp?: number; troopDamage?: number; troopSpeed?: number;
  troopStealth?: boolean;
}
export interface TowerBranchDef {
  name: string; description: string; cost: number;
  /** Optional absolute stat overrides, applied after the ordinary tier scaling. */
  damage?: number; range?: number; interval?: number; effects: TowerEffects;
}
export interface TowerDef {
  name: string; description: string; cost: number; tier2Cost: number;
  /** A named tier can add a mechanic before the final specialization. */
  tier2Name?: string; tier2Description?: string; tier2Effects?: TowerEffects;
  damage: number; range: number; interval: number; color: number; damageType: DamageType;
  role: string; premiumCost?: number; effects: TowerEffects;
  branches: Record<TowerBranchKey,TowerBranchDef>;
}
const branch=(name:string,cost:number,description:string,effects:TowerEffects,stats:Pick<Partial<TowerBranchDef>,'damage'|'range'|'interval'>={}):TowerBranchDef=>({name,cost,description,effects,...stats});

export const TOWER_DEFS: Record<TowerKind,TowerDef> = {
  archer: {
    name:'Arrow tower', description:'Fast physical arrows against ground and flying foes. Tier II lanterns reveal hidden enemies for nearby allies.', cost:80,tier2Cost:55,tier2Name:'Lantern Sentries',tier2Description:'Reveals hidden enemies within firing range for this tower and nearby allies. Unlocked after this tower defends one wave.',tier2Effects:{reveal:true},damage:16,range:175,interval:.65,color:0xd8ba75,damageType:'physical',role:'PRECISION & SCOUTING',effects:{},
    branches:{
      A:branch('Longbow Citadel',150,'Fires at three separate targets.',{targets:3},{damage:30,range:205,interval:.85}),
      B:branch('Rapid Archer',145,'Rapid arrows pierce one additional foe.',{pierce:2},{damage:17,range:185,interval:.27}),
      C:branch('Sniper Post',165,'Extreme-range, high-power precision shots.',{},{damage:118,range:350,interval:1.65}),
      D:branch('Arrow Storm',260,'Hell specialization: volleys hit five separate targets.',{targets:5},{damage:34,range:220,interval:.65}),
    },
  },
  cannon: {
    name:'Cannon',description:'Heavy physical cannonballs with a small impact splash.',cost:100,tier2Cost:75,damage:43,range:165,interval:1.6,color:0xec8b5e,damageType:'physical',role:'HEAVY ARTILLERY',effects:{splash:28},
    branches:{
      A:branch('Piercing Rounds',180,'Cannonballs pass through two foes.',{pierce:2,splash:0},{damage:76,range:185,interval:1.4}),
      B:branch('Gatling Gun',190,'An extreme firing rate trades shell power for pressure.',{splash:0},{damage:15,range:175,interval:.18}),
      C:branch('Rail Cannon',215,'Long-range rounds pierce up to six foes in a line.',{pierce:6,splash:0},{damage:88,range:310,interval:2}),
      D:branch('Siege Engine',310,'Hell specialization: a rapid barrage pierces three foes.',{pierce:3,splash:0},{damage:48,range:235,interval:.48}),
    },
  },
  mortar: {
    name:'Mortar',description:'Long-range physical splash shells arc over tree cover.',cost:130,tier2Cost:95,damage:68,range:255,interval:2.5,color:0xe5a863,damageType:'physical',role:'SPLASH & SIEGE',effects:{splash:62},
    branches:{
      A:branch('Demolition Keep',230,'Large-area shells crush clustered ground troops.',{splash:105},{damage:118,range:275,interval:2.4}),
      B:branch('Cluster Battery',235,'Each shell divides into four clustered blasts.',{splash:38,clusters:4},{damage:38,range:270,interval:2.6}),
      C:branch('Artillery Fort',250,'Extreme range and shell power, with a slower reload.',{splash:65},{damage:225,range:390,interval:3.1}),
      D:branch('Carpet Bomber',380,'Hell specialization: rapid four-blast area bombardment.',{splash:57,clusters:4},{damage:48,range:325,interval:1.8}),
    },
  },
  frost: {
    name:'Ice shrine',description:'Instant ice pulses damage and slow enemies around the impact. Tier II aurora lenses reveal hidden enemies.',cost:90,tier2Cost:65,tier2Name:'Aurora Lens',tier2Description:'An aurora lens reveals hidden enemies within firing range for nearby allies while ice pulses slow them.',tier2Effects:{reveal:true},damage:9,range:160,interval:.9,color:0x88d9de,damageType:'ice',role:'SLOW & FREEZE',effects:{splash:45,slow:.45,slowDuration:1.5},
    branches:{
      A:branch('Crystal Glacier',165,'A freezing pulse roots enemies briefly and slows their return.',{splash:90,root:.7,slow:.55,slowDuration:2.2},{damage:23,range:175,interval:1.4}),
      B:branch('Cryo Sniper',170,'Long-range bolts deliver a deep single-target freeze.',{splash:0,root:1.25,slow:.65,slowDuration:2.5},{damage:52,range:325,interval:1.9}),
      C:branch('Blizzard Core',180,'A massive, lingering slow zone covers the crossing.',{splash:125,slow:.6,slowDuration:2,lingerDuration:3,zoneDps:8},{damage:15,range:190,interval:2.4}),
      D:branch('Absolute Zero',290,'Hell specialization: an area pulse nearly freezes enemies.',{splash:105,slow:.9,slowDuration:2.4,root:.35},{damage:32,range:205,interval:1.8}),
    },
  },
  earth: {
    name:'Earth tower',description:'A ground-only quake damages a zone and slows its occupants.',cost:200,tier2Cost:145,damage:27,range:175,interval:2,color:0xc29b65,damageType:'earth',role:'GROUND CONTROL',effects:{splash:75,slow:.3,slowDuration:1.5,lingerDuration:1.8,zoneDps:12},
    branches:{
      A:branch('Seismic Ravager',310,'A broad lingering quake damages and slows enemies.',{splash:95,slow:.45,slowDuration:2,lingerDuration:3.5,zoneDps:24},{damage:46,range:195,interval:2.7}),
      B:branch('Landslide Tower',300,'A long-lived landslide imposes a heavy slow.',{splash:90,slow:.65,slowDuration:2,lingerDuration:5,zoneDps:17},{damage:31,range:225,interval:3.5}),
      C:branch('Tectonic Engine',330,'A concentrated quake field inflicts massive tick damage.',{splash:48,slow:.2,lingerDuration:3.2,zoneDps:70},{damage:90,range:185,interval:3}),
      D:branch('World Breaker',490,'Hell specialization: a colossal damaging quake field.',{splash:145,slow:.6,slowDuration:2,lingerDuration:4,zoneDps:43,knockback:22},{damage:85,range:225,interval:3.5}),
    },
  },
  arcane: {
    name:'Magic spire',description:'An elemental magic bolt bypasses physical armor and reveals hidden foes.',cost:160,tier2Cost:115,damage:29,range:180,interval:1,color:0xb78dff,damageType:'arcane',role:'MAGIC & SUPPORT',effects:{reveal:true},
    branches:{
      A:branch('Wizard Tower',250,'Magic bolts strike three separate targets.',{targets:3},{damage:48,range:200,interval:1.15}),
      B:branch('Dark Sorcerer',260,'Curses a target to take 25% more incoming damage.',{curse:.25},{damage:70,range:205,interval:1.2}),
      C:branch('Arcane Battery',245,'Nearby towers gain 20% damage and 15% firing haste.',{auraDamage:.2,auraHaste:.15},{damage:32,range:185,interval:1.1}),
      D:branch('Grand Mage',390,'Hell specialization: four-target magic, curses, and a support aura.',{targets:4,curse:.2,auraDamage:.12,auraHaste:.1},{damage:65,range:220,interval:1.15}),
    },
  },
  tesla: {
    name:'Tesla coil',description:'Chain lightning jumps among three nearby enemies.',cost:180,tier2Cost:135,damage:24,range:175,interval:1.3,color:0x86c8ff,damageType:'lightning',role:'CHAIN & STUN',effects:{chain:3,chainRange:85},
    branches:{
      A:branch('Tesla Overlord',280,'Lightning chains through seven enemies.',{chain:7,chainRange:100},{damage:38,range:195,interval:1.3}),
      B:branch('EMP Tower',285,'Two-target electrical hits stun for 1.2 seconds.',{chain:2,stun:1.2},{damage:28,range:180,interval:2}),
      C:branch('Lightning Rod',305,'Extreme damage with a three-enemy chain.',{chain:3,chainRange:105},{damage:105,range:210,interval:1.85}),
      D:branch('Thunderlord',435,'Hell specialization: six-enemy chains stun for 0.8 seconds.',{chain:6,chainRange:110,stun:.8},{damage:61,range:215,interval:1.55}),
    },
  },
  venom: {
    name:'Poison lab',description:'Toxic bolts apply lasting elemental poison damage.',cost:150,tier2Cost:105,damage:8,range:175,interval:1.2,color:0xa7d766,damageType:'poison',role:'DAMAGE OVER TIME',effects:{poisonDps:13,poisonDuration:4},
    branches:{
      A:branch('Miasma Silo',235,'A large poison cloud damages enemies that cross it.',{splash:90,poisonDps:22,poisonDuration:4,lingerDuration:3.5,zoneDps:7},{damage:15,range:190,interval:2.5}),
      B:branch('Plague Engine',240,'Poisoned victims spread their poison when they die.',{poisonDps:29,poisonDuration:5,spread:true},{damage:17,range:190,interval:1.3}),
      C:branch('Acid Tower',245,'Acid strips 35% armor and applies strong poison.',{armorShred:.35,poisonDps:25,poisonDuration:4},{damage:30,range:200,interval:1.4}),
      D:branch('Viral Core',365,'Hell specialization: poison clouds spread on death and strip armor.',{splash:100,poisonDps:34,poisonDuration:5,spread:true,armorShred:.4,lingerDuration:3,zoneDps:9},{damage:22,range:210,interval:2.1}),
    },
  },
  prism: {
    name:'Prism beacon',description:'A focused holy beam strikes one enemy and reveals hidden foes.',cost:190,tier2Cost:145,damage:48,range:190,interval:1.4,color:0xf3dfa3,damageType:'holy',role:'BEAM & PROTECTION',effects:{reveal:true},
    branches:{
      A:branch('Celestial Beacon',300,'A devastating single-target holy beam.',{},{damage:220,range:235,interval:2}),
      B:branch('Divine Shield',280,'A holy ward absorbs one enemy ability hit against the tower.',{shield:1},{damage:90,range:210,interval:1.3}),
      C:branch('Radiant Pillar',315,'A holy beam pierces up to eight enemies in a line.',{pierce:8},{damage:78,range:290,interval:1.65}),
      D:branch('Archangel',450,'Hell specialization: a shielded beam pierces four foes with massive force.',{pierce:4,shield:1},{damage:190,range:270,interval:1.8}),
    },
  },
  trap: {
    name:'Path trap',description:'Place on the road: four heavy triggers, then rearm for gold.',cost:140,tier2Cost:100,damage:72,range:42,interval:1.8,color:0xd29a6a,damageType:'physical',role:'LIMITED-USE TRAP',effects:{trapUses:4,splash:28},
    branches:{
      A:branch('Entrapment Forge',210,'Six charges root enemies for 2.5 seconds.',{trapUses:6,root:2.5,splash:32},{damage:92,range:45,interval:1.8}),
      B:branch('Bomb Trap',220,'Five explosive charges deal heavy area damage.',{trapUses:5,splash:100},{damage:170,range:45,interval:1.9}),
      C:branch('Net Tower',205,'Six net charges root for two seconds and leave a slow zone.',{trapUses:6,splash:65,root:2,slow:.55,slowDuration:3,lingerDuration:3,zoneDps:0},{damage:60,range:55,interval:2}),
      D:branch('Deathtrap',340,'Hell specialization: six massive hits root nearby enemies for two seconds.',{trapUses:6,splash:75,root:2},{damage:240,range:55,interval:1.65}),
    },
  },
  sonic: {
    name:'Sonic tower',description:'A sonic wave damages a wide area around its target.',cost:170,tier2Cost:125,damage:28,range:170,interval:1.4,color:0xdaa7e8,damageType:'sonic',role:'PUSH & DISRUPTION',effects:{splash:65},
    branches:{
      A:branch('Acoustic Annihilator',265,'Huge sound waves push enemies back along the road.',{splash:115,knockback:48},{damage:51,range:195,interval:1.8}),
      B:branch('Frequency Tower',255,'Sound waves disable enemy abilities for three seconds.',{splash:75,disableAbilities:3},{damage:57,range:195,interval:1.6}),
      C:branch('Echo Observatory',260,'Far-reaching sonar reveals hidden foes through tree cover and pushes them back.',{splash:80,reveal:true,knockback:18},{damage:38,range:265,interval:1.5}),
      D:branch('Dissonance Core',400,'Hell specialization: wide sonic pushback, ability suppression, and amplification.',{splash:125,knockback:50,disableAbilities:3,auraDamage:.15,auraHaste:.15},{damage:72,range:215,interval:1.7}),
    },
  },
  barracks: {
    name:'Barracks',description:'Two soldiers march to a rally point, block ground foes, and fight in melee.',cost:110,tier2Cost:85,damage:0,range:190,interval:1,color:0xb9c5a0,damageType:'physical',role:'MELEE TROOPS',effects:{troops:2,troopHp:105,troopDamage:13,troopSpeed:62},
    branches:{
      A:branch('Imperial Garrison',195,'Two tanky elite soldiers hold the rally point.',{troops:2,troopHp:290,troopDamage:28,troopSpeed:55},{range:205}),
      B:branch('Shadow Rangers',200,'Three swift scouts approach unseen until they engage.',{troops:3,troopHp:125,troopDamage:23,troopSpeed:98,troopStealth:true},{range:225}),
      C:branch('Titan Guard',210,'One super-soldier combines massive health and melee damage.',{troops:1,troopHp:760,troopDamage:72,troopSpeed:48},{range:205}),
      D:branch('Elite Legion',330,'Hell specialization: four durable elite soldiers.',{troops:4,troopHp:300,troopDamage:36,troopSpeed:72},{range:230}),
    },
  },
  void: {
    name:'Void obelisk',description:'A heavy void strike erodes enemy armor.',cost:190,tier2Cost:120,damage:64,range:185,interval:1.9,color:0x9279d4,damageType:'void',role:'PREMIUM VOID',premiumCost:45,effects:{armorShred:.15},
    branches:{
      A:branch('Event Horizon',290,'Heavier void hits strip 50% enemy armor.',{armorShred:.5},{damage:180,range:210,interval:2}),
      B:branch('Singularity',285,'A pulling implosion draws enemies toward its impact.',{splash:90,pull:48,armorShred:.2},{damage:115,range:210,interval:2.1}),
      C:branch('Oblivion Beam',310,'A lane-length beam pierces five foes.',{pierce:5,armorShred:.25},{damage:115,range:1100,interval:2.6}),
      D:branch('True Void',460,'Hell specialization: a catastrophic single hit ignores physical armor.',{armorShred:.6,ignoreArmor:true},{damage:390,range:255,interval:2.5}),
    },
  },
  solar: {
    name:'Solar tower',description:'A fiery explosion leaves a lasting burn.',cost:160,tier2Cost:130,damage:35,range:180,interval:1.6,color:0xffb75d,damageType:'fire',role:'PREMIUM BURN',premiumCost:50,effects:{splash:50,burnDps:11,burnDuration:3},
    branches:{
      A:branch('Solar Wind',260,'A hotter, longer burn wears down survivors.',{splash:55,burnDps:34,burnDuration:6},{damage:50,range:205,interval:1.8}),
      B:branch('Nova Burst',265,'A much larger explosion punishes clustered enemies.',{splash:115,burnDps:18,burnDuration:3},{damage:105,range:205,interval:2}),
      C:branch('Eclipse',260,'Fire curses enemies to take 25% more damage and suppresses their powers.',{splash:70,curse:.25,disableAbilities:2,burnDps:19,burnDuration:4},{damage:62,range:205,interval:1.7}),
      D:branch('Supernova',405,'Hell specialization: a colossal burning impact field.',{splash:145,burnDps:44,burnDuration:5,lingerDuration:3,zoneDps:20},{damage:165,range:240,interval:2.9}),
    },
  },
  chrono: {
    name:'Chrono spire',description:'Temporal hits briefly stun and slow an enemy.',cost:150,tier2Cost:125,damage:13,range:170,interval:1.5,color:0x8ee7d5,damageType:'arcane',role:'PREMIUM TIME CONTROL',premiumCost:55,effects:{stun:.35,slow:.3,slowDuration:1.5},
    branches:{
      A:branch('Temporal Lock',245,'A focused temporal lock stuns for 1.1 seconds.',{stun:1.1,slow:.4,slowDuration:2},{damage:30,range:195,interval:1.9}),
      B:branch('Dilation Field',250,'A wide field strongly slows and stuns for 0.4 seconds.',{splash:100,slow:.65,slowDuration:2.5,stun:.4,lingerDuration:2,zoneDps:5},{damage:20,range:195,interval:2.1}),
      C:branch('Paradox',255,'Temporal energy chains through three foes, stunning for 0.5 seconds.',{chain:3,chainRange:100,stun:.5},{damage:34,range:205,interval:1.7}),
      D:branch('Time Stop',380,'Hell specialization: a small area freezes foes for 1.6 seconds.',{splash:65,stun:1.6,slow:.85,slowDuration:2},{damage:45,range:220,interval:2.4}),
    },
  },
  truesight: {
    name:'Truesight watch',description:'An optional ghost hunter with revealing holy shots and bonus damage against ghosts. Ordinary towers can also gain detection.',cost:130,tier2Cost:100,damage:23,range:200,interval:.9,color:0xd6eaa4,damageType:'holy',role:'PREMIUM GHOST HUNTER',premiumCost:40,effects:{reveal:true,executeGhosts:1.75},
    branches:{
      A:branch('Piercing Sight',215,'A revealing beam pierces two enemies.',{reveal:true,pierce:2,executeGhosts:2},{damage:48,range:250,interval:1.05}),
      B:branch('Wraith Hunter',225,'Rapid holy shots are devastating against ghosts.',{reveal:true,executeGhosts:3.5},{damage:33,range:230,interval:.4}),
      C:branch('Mind Spike',220,'A mind spike curses targets and suppresses their abilities.',{reveal:true,curse:.25,disableAbilities:3,executeGhosts:2},{damage:58,range:240,interval:1.15}),
      D:branch('Omniscience',340,'Hell specialization: three-target piercing, curses, and lethal anti-ghost power.',{reveal:true,pierce:3,curse:.3,executeGhosts:4,disableAbilities:2},{damage:80,range:280,interval:.85}),
    },
  },
  nexus: {
    name:'Nexus',description:'A powerful elemental impact combines area damage and slow.',cost:280,tier2Cost:200,damage:65,range:200,interval:1.7,color:0xe7bcff,damageType:'arcane',role:'PREMIUM HYBRID',premiumCost:90,effects:{splash:45,slow:.25,slowDuration:1.5},
    branches:{
      A:branch('Convergence',390,'Balanced damage and area with four-foe piercing and a slow.',{pierce:4,splash:55,slow:.4,slowDuration:2},{damage:100,range:240,interval:1.6}),
      B:branch('Starfall Nexus',410,'A heavy impact leaves a burning zone.',{splash:100,burnDps:35,burnDuration:5,lingerDuration:3,zoneDps:22},{damage:170,range:260,interval:2.6}),
      C:branch('Event Cascade',430,'An eight-foe piercing beam chains through four enemies.',{pierce:8,chain:4,chainRange:100,splash:0},{damage:78,range:300,interval:2}),
      D:branch('Genesis',640,'Hell specialization: ten-foe piercing, chains, burn, slow, and armor erosion.',{pierce:10,chain:4,chainRange:115,splash:65,slow:.5,slowDuration:2,burnDps:30,burnDuration:4,armorShred:.3},{damage:150,range:320,interval:1.9}),
    },
  },
};

export const ENEMY_KINDS = ['grunt','runner','scout','raider','bat','brute','shieldbearer','ogre','troll','stonegolem','juggernaut','ironsentinel','shaman','necromancer','stormconduit','frostwight','voidling','skeleton','darkknight','shadowwraith','warlord','boss','bonedragon','hellwarden'] as const;
export type EnemyKind = typeof ENEMY_KINDS[number];
export interface EnemyDef {
  name: string; hp: number; speed: number; reward: number; leak: number;
  /** Physical armor and elemental resistances are fractions; a negative resistance is a weakness. */
  armor: number; resistances: Partial<Record<DamageType,number>>; visual: UnitVisual;
  flying?: boolean; stealth?: boolean; ghost?: boolean; dodge?: number; ccImmune?: boolean;
  splitInto?: EnemyKind; splitCount?: number; teleportInterval?: number; regen?: number;
  heal?: number; summon?: EnemyKind; ability?: string;
}
export const ENEMY_DEFS: Record<EnemyKind,EnemyDef> = {
  grunt:{name:'Goblin',hp:52,speed:48,reward:11,leak:1,armor:0,resistances:{},visual:'grunt'},
  runner:{name:'Goblin runner',hp:37,speed:81,reward:10,leak:1,armor:0,resistances:{ice:-.15},visual:'runner'},
  scout:{name:'Veil scout',hp:45,speed:73,reward:13,leak:1,armor:.05,resistances:{holy:-.2},visual:'runner',stealth:true,dodge:.12,ability:'Hidden until revealed or close to the keep.'},
  raider:{name:'Goblin raider',hp:82,speed:59,reward:15,leak:1,armor:.12,resistances:{fire:-.15},visual:'grunt',dodge:.16,ability:'Can dodge direct attacks; area damage remains reliable.'},
  bat:{name:'Cave bat',hp:43,speed:78,reward:12,leak:1,armor:0,resistances:{lightning:-.25,earth:.8},visual:'runner',flying:true,ability:'Flies above melee troops and ground traps.'},
  brute:{name:'Heavy',hp:165,speed:35,reward:24,leak:2,armor:.35,resistances:{poison:-.15},visual:'brute'},
  shieldbearer:{name:'Shieldbearer',hp:220,speed:34,reward:27,leak:2,armor:.6,resistances:{lightning:-.2},visual:'brute'},
  ogre:{name:'Ogre',hp:390,speed:29,reward:35,leak:3,armor:.2,resistances:{fire:-.15,ice:.2},visual:'brute'},
  troll:{name:'Troll',hp:330,speed:32,reward:34,leak:3,armor:.15,resistances:{fire:-.35,poison:.3},visual:'brute',regen:9,ability:'Regenerates health while not burning.'},
  stonegolem:{name:'Stone Golem',hp:520,speed:24,reward:44,leak:3,armor:.65,resistances:{earth:.5,lightning:-.25,sonic:-.25},visual:'brute',ccImmune:true,ability:'Immune to roots, stuns, slows, and forced movement.'},
  juggernaut:{name:'Juggernaut',hp:700,speed:27,reward:53,leak:4,armor:.5,resistances:{ice:.3,fire:-.15},visual:'brute',ccImmune:true,ability:'Crowd-control immune armored vanguard.'},
  ironsentinel:{name:'Iron Sentinel',hp:580,speed:30,reward:48,leak:3,armor:.7,resistances:{fire:.25,lightning:-.35},visual:'brute'},
  shaman:{name:'Shaman',hp:145,speed:39,reward:28,leak:2,armor:.05,resistances:{arcane:.3,holy:-.2},visual:'grunt',heal:15,ability:'Periodically heals nearby living enemies.'},
  necromancer:{name:'Necromancer',hp:190,speed:34,reward:34,leak:2,armor:.05,resistances:{void:.25,holy:-.35},visual:'runner',summon:'skeleton',ability:'Periodically summons skeletons until silenced.'},
  stormconduit:{name:'Storm Conduit',hp:210,speed:38,reward:33,leak:2,armor:.1,resistances:{lightning:.65,earth:-.25},visual:'grunt',ability:'Storm surges briefly disrupt a nearby tower; silence prevents them.'},
  frostwight:{name:'Frost Wight',hp:240,speed:36,reward:32,leak:2,armor:.15,resistances:{ice:.65,fire:-.4,holy:-.2},visual:'runner',ability:'Chills nearby soldiers, reducing their attack rate.'},
  voidling:{name:'Voidling',hp:150,speed:49,reward:29,leak:2,armor:.05,resistances:{void:.6,holy:-.3},visual:'grunt',teleportInterval:5,splitInto:'grunt',splitCount:2,ability:'Teleports forward and splits into two goblins on death.'},
  skeleton:{name:'Skeleton',hp:72,speed:46,reward:8,leak:1,armor:.2,resistances:{poison:.65,holy:-.45,fire:-.15},visual:'grunt'},
  darkknight:{name:'Dark Knight',hp:420,speed:35,reward:40,leak:3,armor:.5,resistances:{arcane:.25,holy:-.3},visual:'brute'},
  shadowwraith:{name:'Shadow Wraith',hp:190,speed:63,reward:32,leak:2,armor:.15,resistances:{physical:.75,void:.3,holy:-.5},visual:'runner',ghost:true,stealth:true,teleportInterval:6,ability:'A hidden ghost that slips through melee blockers.'},
  warlord:{name:'Warlord',hp:1050,speed:30,reward:80,leak:5,armor:.4,resistances:{fire:.2,ice:.2},visual:'boss',ability:'War cries strengthen nearby enemies unless silenced.'},
  boss:{name:'Hollow King',hp:1800,speed:25,reward:180,leak:8,armor:.25,resistances:{arcane:.15,holy:-.15},visual:'boss',ccImmune:true,ability:'A crowd-control immune stage boss.'},
  bonedragon:{name:'Bone Dragon',hp:2400,speed:30,reward:220,leak:10,armor:.3,resistances:{fire:.5,poison:.65,holy:-.4},visual:'boss',flying:true,ccImmune:true,summon:'skeleton',ability:'An airborne boss summons skeletons and attacks tower wards.'},
  hellwarden:{name:'Hell Warden',hp:3200,speed:24,reward:280,leak:12,armor:.45,resistances:{fire:.75,void:.2,ice:-.3,holy:-.2},visual:'boss',ccImmune:true,teleportInterval:10,ability:'A fire-resistant boss teleports and suppresses unshielded towers.'},
};
