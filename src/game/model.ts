import { LEVELS } from './levels';
import { TOWER_DEFS, ENEMY_DEFS, TOWER_KINDS, TARGET_MODES, BRANCH_KEYS, enemyDamageMultiplier, enemyCounterInfo, type TowerKind, type EnemyKind, type TowerTargetMode, type TowerBranchKey, type TowerEffects, type DamageType } from './catalog';
import { generateWaves } from './waves';
import type { CombatBonuses } from './progression';
import { normalizedTowerMastery, towerResearch, TOWER_RESEARCH_XP, TOWER_XP_LIMIT, type TowerMastery, type TowerResearchKey, type TowerXPReport } from './tower-mastery';
export { LEVELS } from './levels';
export { TOWER_DEFS, ENEMY_DEFS, TOWER_KINDS, TARGET_MODES, BRANCH_KEYS } from './catalog';
export type { TowerKind, EnemyKind, TowerTargetMode, TowerBranchKey, TowerEffects, DamageType } from './catalog';
export type { CombatBonuses } from './progression';

/** Simulation state is independent of Phaser, localStorage, and browser timers. */
export type Point = { x: number; y: number };
export type GameStatus = 'building' | 'wave' | 'won' | 'lost';
export const DIFFICULTIES = {
  easy: { name: 'Easy', health: .75, speed: .9, gold: 1.12, lives: 25 },
  normal: { name: 'Normal', health: 1, speed: 1, gold: 1, lives: 20 },
  hard: { name: 'Hard', health: 1.35, speed: 1.08, gold: .97, lives: 18 },
  hell: { name: 'Hell', health: 1.8, speed: 1.16, gold: .93, lives: 15 },
} as const;
export type Difficulty = keyof typeof DIFFICULTIES;
export interface Enemy {
  id: number; kind: EnemyKind; x: number; y: number; hp: number; maxHp: number;
  distance: number; speed: number; slowUntil: number; slowStrength?: number;
  poisonUntil?: number; poisonDps?: number; poisonSpread?: boolean;
  burnUntil?: number; burnDps?: number; stunUntil?: number; rootUntil?: number;
  armorShred?: number; armorShredUntil?: number; curse?: number; curseUntil?: number;
  revealedUntil?: number; disabledUntil?: number; blockedBy?: number;
  nextAbilityAt?: number; nextTeleportAt?: number; miniBoss?: boolean; summoned?: boolean;
  flying?: boolean; ghost?: boolean; stealth?: boolean; rewardGranted?: boolean;
}
export interface Tower {
  id: number; padId: number; kind: TowerKind; level: number; cooldown: number; spent: number; targeting: TowerTargetMode;
  branch?: TowerBranchKey; position?: Point; rally?: Point; uses?: number; maxUses?: number;
  shieldCharges?: number; disabledUntil?: number;
  builtAfterClear?: number; upgradedAfterClear?: number;
}
export interface Troop {
  id: number; towerId: number; x: number; y: number; hp: number; maxHp: number;
  damage: number; speed: number; cooldown: number; respawnAt: number; rally: Point;
  targetId: number | null; state: 'moving' | 'fighting' | 'returning' | 'fallen' | 'guarding';
  slowUntil?: number; stealth?: boolean;
}
export interface Shot { id: number; kind: TowerKind; from: Point; to: Point; life: number; maxLife: number; hitIds?: number[]; }
export interface FloatText { id: number; x: number; y: number; text: string; color: string; life: number; }
export interface WaveDef { name: string; description: string; enemies: { kind: EnemyKind; delay: number; miniBoss?: boolean }[]; }
export interface DamageZone { id: number; towerId: number; kind: TowerKind; x: number; y: number; radius: number; damage: number; damageType: DamageType; expiresAt: number; effects: TowerEffects; }
export interface UpgradeGate { allowed: boolean; requiredClears: number; cleared: number; reason: string; researchKey: TowerResearchKey; xp: number; requiredXP: number; researched: boolean; }
export interface TowerStats { damage: number; range: number; interval: number; damageType: DamageType; effects: TowerEffects; }
export interface DetectionOption {
  kind: TowerKind; towerId?: number; action: 'upgrade' | 'build' | 'build-upgrade'; name: string;
  cost: number; totalCost: number; affordable: boolean; available: boolean; unlocked: boolean; reason: string;
}
export interface StealthBriefing {
  wave: number; imminent: boolean; groups: { kind: EnemyKind; name: string; count: number }[];
  hasDetector: boolean; options: DetectionOption[];
}
export const PATH = LEVELS[0].path, PADS = LEVELS[0].pads, WAVES = generateWaves(LEVELS[0],'normal');
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
function segmentLengths(path: Point[]): number[] { return path.slice(1).map((point, i) => Math.hypot(point.x-path[i].x,point.y-path[i].y)); }
const lengths = segmentLengths(PATH);
export const PATH_LENGTH = lengths.reduce((sum, length) => sum + length, 0);
function positionAlong(distance: number, path: Point[], segments: number[]): Point {
  let remaining = Math.max(0,distance);
  for(let i=0;i<segments.length;i++) { if(remaining<=segments[i]) { const t=segments[i]===0?0:remaining/segments[i];return{x:path[i].x+(path[i+1].x-path[i].x)*t,y:path[i].y+(path[i+1].y-path[i].y)*t}; } remaining-=segments[i]; }
  return {...path[path.length-1]};
}
export function positionAt(distance: number,path: Point[]=PATH): Point { return positionAlong(distance,path,path===PATH?lengths:segmentLengths(path)); }
/** A finite segment against a tree circle. Tangency counts as cover. */
export function lineBlocked(from:Point,to:Point,trees:readonly {x:number;y:number;radius:number}[]):boolean {
  const dx=to.x-from.x,dy=to.y-from.y,length=dx*dx+dy*dy;
  return trees.some(tree=>{const t=length===0?0:clamp(((tree.x-from.x)*dx+(tree.y-from.y)*dy)/length,0,1);return Math.hypot(from.x+dx*t-tree.x,from.y+dy*t-tree.y)<=tree.radius;});
}
const DEFAULT_BONUSES: CombatBonuses = {
  damage:0,range:0,haste:0,area:0,control:0,elemental:0,critical:0,economy:0,fortify:0,grandmastery:0,
  criticalChance:0,criticalDamage:.5,gold:0,startingGold:0,extraLives:0,xp:0,gems:0,capstones:[],
};
let practiceSessionSequence = 0;
function practiceSessionId(): string { return globalThis.crypto?.randomUUID?.() || `practice-${Date.now().toString(36)}-${++practiceSessionSequence}-${Math.random().toString(36).slice(2)}`; }

export class GameModel {
  private levelIndex=0;
  private segments=segmentLengths(LEVELS[0].path);
  difficulty: Difficulty='normal';
  autoWave=false;
  bonuses:CombatBonuses={...DEFAULT_BONUSES,capstones:[]};
  unlockedTowers:TowerKind[]=TOWER_KINDS.filter(kind=>!TOWER_DEFS[kind].premiumCost);
  gold=240; lives=20; maxLives=20; wave=0; status:GameStatus='building'; paused=false; speed=1; time=0; kills=0;
  towers:Tower[]=[]; enemies:Enemy[]=[]; troops:Troop[]=[]; shots:Shot[]=[]; floats:FloatText[]=[]; zones:DamageZone[]=[];
  meteorCooldown=0;
  private nextId=1;
  private pending:WaveDef['enemies']=[];
  private campaignWaves:WaveDef[]=[];
  private waveTime=0;
  private clearedAt=0;
  private hitSequence=0;
  private savedMastery:TowerMastery={};
  private practiceXP:TowerMastery={};
  private acknowledgedPractice:TowerMastery={};
  private practiceSession=practiceSessionId();
  private practicedThisWave=new Set<TowerKind>();
  private engagedThisUpdate=new Set<number>();
  constructor(levelIndex=0){this.selectLevel(levelIndex);}
  get currentLevelIndex(){return this.levelIndex;}
  get level(){return LEVELS[this.levelIndex];}
  get path(){return this.level.path;}
  get pads(){return this.level.pads;}
  get waves(){return this.campaignWaves;}
  get trees(){return this.level.trees || [];}
  get pathLength(){return this.segments.reduce((sum,length)=>sum+length,0);}
  get waveRemaining(){return this.pending.length+this.enemies.filter(enemy=>enemy.hp>0).length;}
  get clearedWaves(){return Math.max(0,this.wave-(['wave','lost'].includes(this.status)?1:0));}
  get earlyBonus(){return this.status==='building'&&this.wave>0?Math.max(0,Math.ceil(24*(1-(this.time-this.clearedAt)/12))):0;}
  get stars(){return this.status!=='won'?0:this.lives/this.maxLives>=.9?3:this.lives/this.maxLives>=.5?2:1;}
  get autoWaveIn(){return this.autoWave&&this.status==='building'&&this.wave>0?Math.max(0,3-(this.time-this.clearedAt)):null;}
  get towerXPReport():TowerXPReport{return{sessionId:this.practiceSession,totals:normalizedTowerMastery(this.practiceXP)};}
  getTowerMasteryXP(kind:TowerKind):number{return Math.floor(Math.min(TOWER_XP_LIMIT,(this.savedMastery[kind]||0)+(this.practiceXP[kind]||0)-(this.acknowledgedPractice[kind]||0)));}
  get towerMastery():TowerMastery {
    const result:TowerMastery={};
    for(const kind of TOWER_KINDS){const xp=this.getTowerMasteryXP(kind);if(xp>0)result[kind]=xp;}
    return result;
  }
  towerResearch(kind:TowerKind){return towerResearch(kind,this.towerMastery);}
  /** Apply saved XP; pass the report just reconciled by Progression to avoid counting it twice. */
  setTowerMastery(mastery:TowerMastery,acknowledgedReport?:TowerXPReport):void {
    const next=normalizedTowerMastery(mastery);
    for(const kind of TOWER_KINDS)this.savedMastery[kind]=Math.max(this.savedMastery[kind]||0,next[kind]||0);
    if(acknowledgedReport?.sessionId===this.practiceSession){const totals=normalizedTowerMastery(acknowledgedReport.totals);for(const kind of TOWER_KINDS)this.acknowledgedPractice[kind]=Math.max(this.acknowledgedPractice[kind]||0,Math.min(totals[kind]||0,Math.floor(this.practiceXP[kind]||0)));}
  }
  private practice(kind:TowerKind,amount:number){this.practiceXP[kind]=Math.min(TOWER_XP_LIMIT,Math.round(((this.practiceXP[kind]||0)+amount)*1_000_000)/1_000_000);this.practicedThisWave.add(kind);}
  private engage(tower:Tower,delta:number){if(this.engagedThisUpdate.has(tower.id)||(tower.disabledUntil||0)>this.time)return;this.engagedThisUpdate.add(tower.id);this.practice(tower.kind,delta*.5);}
  private get actionable(){return this.status!=='won'&&this.status!=='lost';}
  selectLevel(index:number):boolean {
    if(this.status==='wave'||!Number.isInteger(index)||index<0||index>=LEVELS.length)return false;
    this.levelIndex=index;this.segments=segmentLengths(this.path);this.reset();return true;
  }
  setDifficulty(value:Difficulty):boolean {
    if(!Object.hasOwn(DIFFICULTIES,value)||this.status==='wave')return false;
    this.difficulty=value;this.reset();return true;
  }
  setProgression(bonuses:Partial<CombatBonuses>,unlocked:readonly TowerKind[]=[],capstones:readonly string[]=[]):boolean {
    if(this.status==='wave')return false;
    const next={...DEFAULT_BONUSES,capstones:[...(bonuses.capstones||capstones)].filter(item=>typeof item==='string')};
    for(const key of Object.keys(DEFAULT_BONUSES) as (keyof CombatBonuses)[]) {
      if(key==='capstones')continue;
      const value=bonuses[key];
      if(typeof value==='number'&&Number.isFinite(value))next[key]=clamp(value,0,key==='startingGold'?1000:key==='extraLives'?20:key==='criticalDamage'?3:2);
    }
    this.bonuses=next;
    this.unlockedTowers=TOWER_KINDS.filter(kind=>!TOWER_DEFS[kind].premiumCost||unlocked.includes(kind));
    if(this.wave===0&&this.towers.length===0){this.gold=this.startingGold();this.maxLives=this.startingLives();this.lives=this.maxLives;}
    return true;
  }
  isUnlocked(kind:TowerKind){return this.unlockedTowers.includes(kind);}
  private startingGold(){return Math.round(this.level.startingGold*DIFFICULTIES[this.difficulty].gold+this.bonuses.startingGold);}
  private startingLives(){return DIFFICULTIES[this.difficulty].lives+Math.floor(this.bonuses.extraLives);}
  nearestPathPoint(x:number,y:number){
    let best={x:this.path[0].x,y:this.path[0].y,distance:0,offset:Infinity},distance=0;
    for(let i=0;i<this.path.length-1;i++){
      const a=this.path[i],b=this.path[i+1],dx=b.x-a.x,dy=b.y-a.y,squared=dx*dx+dy*dy;
      const t=squared===0?0:clamp(((x-a.x)*dx+(y-a.y)*dy)/squared,0,1),px=a.x+dx*t,py=a.y+dy*t,offset=Math.hypot(x-px,y-py);
      if(offset<best.offset)best={x:px,y:py,distance:distance+this.segments[i]*t,offset};distance+=this.segments[i];
    }
    return best;
  }
  getTowerPosition(tower:Tower):Point {const point=tower.position||this.pads.find(pad=>pad.id===tower.padId);return point?{x:point.x,y:point.y}:{x:0,y:0};}
  build(padId:number,kind:TowerKind):boolean {
    const def=TOWER_DEFS[kind],pad=this.pads.find(p=>p.id===padId);
    if(kind==='trap'&&pad){const road=this.nearestPathPoint(pad.x,pad.y);return this.buildTrap(road.x,road.y);}
    if(!this.actionable||!def||!pad||!this.isUnlocked(kind)||this.towers.some(t=>t.padId===padId)||this.gold<def.cost)return false;
    const tower:Tower={id:this.nextId++,padId,kind,level:1,cooldown:0,spent:def.cost,targeting:'first',builtAfterClear:this.clearedWaves};
    if(kind==='trap'){const road=this.nearestPathPoint(pad.x,pad.y);tower.position={x:road.x,y:road.y};tower.uses=tower.maxUses=def.effects.trapUses||4;}
    if(kind==='barracks'){const road=this.nearestPathPoint(pad.x,pad.y);tower.rally={x:road.x,y:road.y};}
    this.gold-=def.cost;this.towers.push(tower);this.syncTroops();return true;
  }
  buildTrap(x:number,y:number):boolean {
    if(!this.actionable||!Number.isFinite(x)||!Number.isFinite(y)||this.gold<TOWER_DEFS.trap.cost||this.towers.filter(t=>t.kind==='trap').length>=8)return false;
    const road=this.nearestPathPoint(x,y);
    if(road.offset>45||road.distance<15||road.distance>this.pathLength-20||this.towers.some(t=>t.kind==='trap'&&Math.hypot(this.getTowerPosition(t).x-road.x,this.getTowerPosition(t).y-road.y)<24))return false;
    const id=this.nextId++,uses=TOWER_DEFS.trap.effects.trapUses||4;
    this.gold-=TOWER_DEFS.trap.cost;
    this.towers.push({id,padId:-id,kind:'trap',position:{x:road.x,y:road.y},uses,maxUses:uses,level:1,cooldown:0,spent:TOWER_DEFS.trap.cost,targeting:'first',builtAfterClear:this.clearedWaves});return true;
  }
  rearmCost(tower:Tower){return Math.ceil(TOWER_DEFS[tower.kind].cost*.45);}
  rearmTrap(id:number):boolean {const tower=this.towers.find(t=>t.id===id);if(!this.actionable||!tower||tower.kind!=='trap'||tower.uses===tower.maxUses||this.gold<this.rearmCost(tower))return false;this.gold-=this.rearmCost(tower);tower.uses=tower.maxUses;return true;}
  setTargeting(id:number,mode:TowerTargetMode):boolean {const tower=this.towers.find(t=>t.id===id);if(!this.actionable||!tower||!TARGET_MODES.includes(mode))return false;tower.targeting=mode;return true;}
  setRally(id:number,x:number,y:number):boolean {
    const tower=this.towers.find(t=>t.id===id);
    if(!this.actionable||!tower||tower.kind!=='barracks'||!Number.isFinite(x)||!Number.isFinite(y))return false;
    const road=this.nearestPathPoint(x,y),home=this.getTowerPosition(tower);
    if(road.offset>80||Math.hypot(road.x-home.x,road.y-home.y)>this.getTowerStats(tower).range+60)return false;
    tower.rally={x:road.x,y:road.y};this.syncTroops();return true;
  }
  /** Research persists across runs; a researched tier can be bought whenever gold is available. */
  getUpgradeGate(tower:Tower,branch:TowerBranchKey='A'):UpgradeGate {
    const cleared=this.clearedWaves;
    const researchKey:TowerResearchKey=tower.level===1?'II':branch,xp=this.towerMastery[tower.kind]||0,requiredXP=TOWER_RESEARCH_XP[researchKey],researched=xp>=requiredXP;
    if(tower.level>=3)return{allowed:false,requiredClears:0,cleared,reason:'Fully specialized',researchKey,xp,requiredXP,researched};
    const allowed=this.actionable&&researched&&(tower.level!==2||branch!=='D'||this.difficulty==='hell');
    const reason=!this.actionable?'Defense is complete':!researched?`${TOWER_DEFS[tower.kind].name} XP ${xp}/${requiredXP} — use this family in combat.`:tower.level===2&&branch==='D'&&this.difficulty!=='hell'?'Hell specialization':allowed?'Research complete — buy with gold at any time.':'Upgrade unavailable';
    return{allowed,requiredClears:0,cleared,reason,researchKey,xp,requiredXP,researched};
  }
  upgradeLockReason(tower:Tower,branch:TowerBranchKey='A'):string{return this.getUpgradeGate(tower,branch).reason;}
  upgradeCost(tower:Tower,branch:TowerBranchKey='A'){return tower.level===1?TOWER_DEFS[tower.kind].tier2Cost:TOWER_DEFS[tower.kind].branches[branch]?.cost??Infinity;}
  upgrade(id:number,branch:TowerBranchKey='A'):boolean {
    const tower=this.towers.find(t=>t.id===id);
    if(!this.actionable||!tower||!BRANCH_KEYS.includes(branch)||!this.getUpgradeGate(tower,branch).allowed||tower.level>=3)return false;
    const cost=this.upgradeCost(tower,branch);if(this.gold<cost)return false;
    this.gold-=cost;tower.spent+=cost;tower.level++;tower.upgradedAfterClear=this.clearedWaves;
    if(tower.level===3){tower.branch=branch;tower.shieldCharges=this.getTowerStats(tower).effects.shield||0;}
    if(tower.kind==='trap'){
      const max=this.getTowerStats(tower).effects.trapUses||4;
      // An upgrade can add capacity; already spent charges remain spent.
      tower.uses=(tower.uses||0)+Math.max(0,max-(tower.maxUses||4));tower.maxUses=max;
    }
    this.syncTroops();return true;
  }
  sell(id:number):boolean {
    const tower=this.towers.find(t=>t.id===id);if(!this.actionable||!tower)return false;
    const refund=Math.floor(tower.spent*.7),point=this.getTowerPosition(tower);this.gold+=refund;this.float(point.x,point.y-30,'+'+refund,'#e8c981');
    this.towers=this.towers.filter(t=>t.id!==id);this.troops=this.troops.filter(t=>t.towerId!==id);return true;
  }
  private effectsFor(tower:Tower):TowerEffects{const def=TOWER_DEFS[tower.kind];return{...def.effects,...(tower.level>=2?def.tier2Effects:{}),...(tower.branch?def.branches[tower.branch].effects:{})};}
  getTowerStats(tower:Tower):TowerStats {
    const def=TOWER_DEFS[tower.kind],branch=tower.branch?def.branches[tower.branch]:undefined,effects=this.effectsFor(tower),tier=tower.level>1?1:0;
    let auraDamage=0,auraHaste=0;
    const point=this.getTowerPosition(tower);
    for(const other of this.towers){if(other.id===tower.id||(other.disabledUntil||0)>this.time)continue;const e=this.effectsFor(other),p=this.getTowerPosition(other),r=(other.branch?TOWER_DEFS[other.kind].branches[other.branch].range:undefined)??TOWER_DEFS[other.kind].range;if(Math.hypot(p.x-point.x,p.y-point.y)<=r){auraDamage=Math.max(auraDamage,e.auraDamage||0);auraHaste=Math.max(auraHaste,e.auraHaste||0);}}
    const damage=(branch?.damage??def.damage*(1+tier*.55))*(1+this.bonuses.damage+auraDamage)*(def.damageType==='physical'?1:1+this.bonuses.elemental);
    const range=(branch?.range??def.range+tier*16)*(1+this.bonuses.range);
    const interval=(branch?.interval??def.interval/(1+tier*.12))/(1+this.bonuses.haste+auraHaste);
    const scaled={...effects};
    if(tower.kind==='barracks'&&tower.level===2){scaled.troopHp=(scaled.troopHp||105)*1.35;scaled.troopDamage=(scaled.troopDamage||13)*1.35;}
    for(const key of ['splash','knockback','pull'] as const)if(scaled[key])scaled[key]=scaled[key]!*(1+this.bonuses.area);
    for(const key of ['stun','root','slowDuration'] as const)if(scaled[key])scaled[key]=scaled[key]!*(1+this.bonuses.control);
    for(const key of ['burnDps','poisonDps','zoneDps'] as const)if(scaled[key])scaled[key]=scaled[key]!*(1+this.bonuses.damage)*(1+this.bonuses.elemental);
    return{damage:Math.round(damage),range,interval,damageType:def.damageType,effects:scaled};
  }
  nextWave():WaveDef|undefined{return this.waves[this.wave];}
  wavePreview(){const groups:Partial<Record<EnemyKind,number>>={};for(const entry of this.nextWave()?.enemies||[])groups[entry.kind]=(groups[entry.kind]||0)+1;return Object.entries(groups).map(([kind,count])=>({kind:kind as EnemyKind,name:ENEMY_DEFS[kind as EnemyKind].name,count:count!,counters:enemyCounterInfo(kind as EnemyKind)}));}
  /** Preview affordable ordinary counters; premium unlocks never gate campaign detection. */
  stealthBriefing():StealthBriefing|null {
    const index=this.waves.findIndex((wave,index)=>index>=this.wave&&wave.enemies.some(entry=>ENEMY_DEFS[entry.kind].stealth));
    if(index<0)return null;
    const counts:Partial<Record<EnemyKind,number>>={};
    for(const entry of this.waves[index].enemies)if(ENEMY_DEFS[entry.kind].stealth)counts[entry.kind]=(counts[entry.kind]||0)+1;
    const options:DetectionOption[]=[],hasSite=this.pads.some(pad=>!this.towers.some(tower=>tower.padId===pad.id));
    for(const kind of ['archer','frost'] as const){
      const def=TOWER_DEFS[kind],owned=this.towers.filter(tower=>tower.kind===kind&&tower.level===1);
      for(const tower of owned){const gate=this.getUpgradeGate(tower);options.push({kind,towerId:tower.id,action:'upgrade',name:def.tier2Name!,cost:def.tier2Cost,totalCost:def.cost+def.tier2Cost,affordable:this.gold>=def.tier2Cost,available:gate.allowed,unlocked:this.isUnlocked(kind),reason:gate.reason});}
      if(!owned.length){const xp=this.getTowerMasteryXP(kind),researched=xp>=TOWER_RESEARCH_XP.II;options.push({kind,action:'build-upgrade',name:def.tier2Name!,cost:def.cost+def.tier2Cost,totalCost:def.cost+def.tier2Cost,affordable:this.gold>=def.cost+def.tier2Cost,available:this.actionable&&researched&&hasSite,unlocked:this.isUnlocked(kind),reason:!hasSite?'Requires a free foundation.':researched?'Research complete: build and upgrade immediately.':`Earn permanent family XP ${xp}/${TOWER_RESEARCH_XP.II}, then buy with gold. Base Magic detects immediately.`});}
    }
    for(const kind of ['arcane','prism'] as const){const def=TOWER_DEFS[kind],unlocked=this.isUnlocked(kind),hasSite=this.pads.some(pad=>!this.towers.some(tower=>tower.padId===pad.id));options.push({kind,action:'build',name:def.name,cost:def.cost,totalCost:def.cost,affordable:this.gold>=def.cost,available:this.actionable&&hasSite&&unlocked,unlocked,reason:hasSite?'Detects hidden enemies immediately.':'Requires a free foundation.'});}
    return{wave:index+1,imminent:index===this.wave,groups:Object.entries(counts).map(([kind,count])=>({kind:kind as EnemyKind,name:ENEMY_DEFS[kind as EnemyKind].name,count:count!})),hasDetector:this.towers.some(tower=>this.effectsFor(tower).reveal),options:options.sort((a,b)=>Number(b.available)-Number(a.available)||a.cost-b.cost)};
  }
  startWave():boolean {const next=this.nextWave();if(this.status!=='building'||this.paused||!next)return false;this.gold+=this.earlyBonus;this.wave++;this.waveTime=0;this.practicedThisWave.clear();this.pending=next.enemies.map(e=>({...e})).sort((a,b)=>a.delay-b.delay);this.status='wave';return true;}
  meteor(x:number,y:number):boolean {
    if(this.status!=='wave'||this.paused||this.meteorCooldown>0||!Number.isFinite(x)||!Number.isFinite(y))return false;
    this.meteorCooldown=25/(1+this.bonuses.haste*.5);
    for(const enemy of [...this.enemies])if(Math.hypot(enemy.x-x,enemy.y-y)<=120*(1+this.bonuses.area)){this.damage(enemy,145*(1+this.bonuses.damage)*(1+this.bonuses.elemental),'fire',false,false);if(enemy.hp>0)this.applyEffects(enemy,{burnDps:10,burnDuration:2},1);}
    this.enemies=this.enemies.filter(e=>e.hp>0);this.float(x,y-20,'STARFALL','#ffd9a1');return true;
  }
  private spawn(kind:EnemyKind,distance=0,miniBoss=false,summoned=false):Enemy {
    const progress=Math.max(0,this.wave-1),healthGrowth=1+Math.min(progress,24)*.035+Math.max(0,progress-24)*.012;
    const def=ENEMY_DEFS[kind],scale=healthGrowth*this.level.enemyMultiplier*DIFFICULTIES[this.difficulty].health*(miniBoss?1.8:1);
    const hp=Math.round(def.hp*scale),enemy:Enemy={id:this.nextId++,kind,...positionAlong(distance,this.path,this.segments),hp,maxHp:hp,distance,speed:def.speed*DIFFICULTIES[this.difficulty].speed*(1+Math.min(.2,progress*.003)),slowUntil:0,miniBoss,summoned,flying:!!def.flying,ghost:!!def.ghost,stealth:!!def.stealth,nextAbilityAt:this.time+4,nextTeleportAt:this.time+(def.teleportInterval||1e9)};
    this.enemies.push(enemy);return enemy;
  }
  private abilityActive(enemy:Enemy){return(enemy.disabledUntil||0)<=this.time&&(enemy.stunUntil||0)<=this.time;}
  private revealEnemies(delta:number){for(const tower of this.towers){const stats=this.getTowerStats(tower);if(!stats.effects.reveal||(tower.disabledUntil||0)>this.time)continue;const point=this.getTowerPosition(tower);for(const enemy of this.enemies)if(enemy.hp>0&&Math.hypot(point.x-enemy.x,point.y-enemy.y)<=stats.range){enemy.revealedUntil=this.time+.3;if(ENEMY_DEFS[enemy.kind].stealth)this.engage(tower,delta);}}}
  private eligible(tower:Tower,enemy:Enemy,origin:Point,checkSight=true):boolean {
    if(enemy.hp<=0)return false;const def=ENEMY_DEFS[enemy.kind],fx=this.effectsFor(tower);
    if(def.flying&&['cannon','mortar','earth','trap','barracks'].includes(tower.kind))return false;
    const revealed=(enemy.revealedUntil||0)>this.time||fx.reveal||enemy.distance>this.pathLength*.82;
    if(def.stealth&&!revealed)return false;
    if(def.ghost&&!revealed&&TOWER_DEFS[tower.kind].damageType==='physical')return false;
    return!checkSight||['mortar','earth','sonic','barracks','trap'].includes(tower.kind)||!lineBlocked(origin,enemy,this.trees);
  }
  private movementSpeed(enemy:Enemy){
    if((enemy.stunUntil||0)>this.time||(enemy.rootUntil||0)>this.time)return 0;
    const slowed=enemy.slowUntil>this.time?1-(enemy.slowStrength??.45):1;
    const leader=this.enemies.some(e=>e.kind==='warlord'&&e.hp>0&&e.id!==enemy.id&&this.abilityActive(e)&&Math.hypot(e.x-enemy.x,e.y-enemy.y)<140)?1.15:1;
    return enemy.speed*slowed*leader;
  }
  private movementDistance(enemy:Enemy,previous:number):number {
    const begins=Math.max(previous,Math.min(this.time,Math.max(enemy.stunUntil||0,enemy.rootUntil||0)));
    const moving=Math.max(0,this.time-begins),slowed=Math.max(0,Math.min(this.time,enemy.slowUntil)-begins);
    const leader=this.enemies.some(e=>e.kind==='warlord'&&e.hp>0&&e.id!==enemy.id&&this.abilityActive(e)&&Math.hypot(e.x-enemy.x,e.y-enemy.y)<140)?1.15:1;
    return enemy.speed*leader*(moving-Math.min(moving,slowed)*(enemy.slowStrength??.45));
  }
  update(deltaSeconds:number):void {
    if(this.paused||!this.actionable||!Number.isFinite(deltaSeconds)||deltaSeconds<=0)return;
    const delta=Math.min(deltaSeconds,.1)*([1,2,3].includes(this.speed)?this.speed:1),previous=this.time;this.time+=delta;
    this.engagedThisUpdate.clear();
    this.meteorCooldown=Math.max(0,this.meteorCooldown-delta);
    for(const shot of this.shots)shot.life-=delta;this.shots=this.shots.filter(s=>s.life>0);
    for(const text of this.floats){text.life-=delta;text.y-=delta*19;}this.floats=this.floats.filter(f=>f.life>0);
    this.syncTroops();
    if(this.status!=='wave'){this.zones=this.zones.filter(zone=>zone.expiresAt>this.time);this.updateTroops(delta,false);if(this.autoWave&&this.wave>0&&this.time-this.clearedAt>=3)this.startWave();return;}
    this.waveTime+=delta;
    while(this.pending.length&&this.pending[0].delay<=this.waveTime){const entry=this.pending.shift()!;this.spawn(entry.kind,0,!!entry.miniBoss);}
    this.revealEnemies(delta);
    for(const enemy of [...this.enemies]){
      if(enemy.hp<=0)continue;
      for(const [until,dps,type] of [[enemy.poisonUntil,enemy.poisonDps,'poison'],[enemy.burnUntil,enemy.burnDps,'fire']] as const){const duration=Math.max(0,Math.min(this.time,until||0)-previous);if(duration>0)this.damage(enemy,(dps||0)*duration,type,false,false);}
      if(enemy.hp<=0)continue;
      this.updateEnemyAbility(enemy,delta);
      const blocker=this.troops.filter(t=>t.hp>0&&!(t.stealth&&t.state!=='fighting')&&Math.hypot(t.x-enemy.x,t.y-enemy.y)<18).sort((a,b)=>a.id-b.id)[0];
      const def=ENEMY_DEFS[enemy.kind];
      if(blocker&&!def.flying&&!def.ghost){enemy.blockedBy=blocker.id;}
      else {delete enemy.blockedBy;enemy.distance+=this.movementDistance(enemy,previous);}
      const point=positionAlong(enemy.distance,this.path,this.segments);enemy.x=point.x;enemy.y=point.y;
      if(enemy.distance>=this.pathLength){this.lives=Math.max(0,this.lives-def.leak);enemy.hp=0;enemy.rewardGranted=true;const exit=this.path[this.path.length-1];this.float(Math.min(this.level.world.width-40,exit.x),Math.min(this.level.world.height-20,exit.y),'−'+def.leak+' ♥','#ef9a8d');}
    }
    this.enemies=this.enemies.filter(e=>e.hp>0);if(this.lives<=0){this.status='lost';return;}
    this.updateTroops(delta,true);
    for(const zone of this.zones){const activeFor=Math.max(0,Math.min(this.time,zone.expiresAt)-previous);if(activeFor<=0)continue;for(const enemy of [...this.enemies])if(enemy.hp>0&&Math.hypot(enemy.x-zone.x,enemy.y-zone.y)<=zone.radius&&!(ENEMY_DEFS[enemy.kind].flying&&['earth','trap'].includes(zone.kind))){this.damage(enemy,zone.damage*activeFor,zone.damageType,!!zone.effects.ignoreArmor,false);if(enemy.hp>0)this.applyEffects(enemy,{slow:zone.effects.slow,slowDuration:Math.min(.3,zone.effects.slowDuration||.3),poisonDps:zone.effects.poisonDps,poisonDuration:zone.effects.poisonDuration,burnDps:zone.effects.burnDps,burnDuration:zone.effects.burnDuration,armorShred:zone.effects.armorShred,curse:zone.effects.curse,reveal:zone.effects.reveal,disableAbilities:zone.effects.disableAbilities,spread:zone.effects.spread},1);}}
    this.zones=this.zones.filter(z=>z.expiresAt>this.time);
    for(const tower of this.towers){
      tower.cooldown=Math.max(0,tower.cooldown-delta);
      if(tower.kind==='barracks'||(tower.disabledUntil||0)>this.time||(tower.kind==='trap'&&(tower.uses||0)<=0))continue;
      const point=this.getTowerPosition(tower),stats=this.getTowerStats(tower);
      const priority=(e:Enemy)=>tower.targeting==='last'?-e.distance:tower.targeting==='strongest'?e.hp:tower.targeting==='fastest'?this.movementSpeed(e):e.distance;
      const targets=this.enemies.filter(e=>this.eligible(tower,e,point)&&Math.hypot(e.x-point.x,e.y-point.y)<=stats.range).sort((a,b)=>priority(b)-priority(a)||a.id-b.id);
      if(!targets.length)continue;
      this.engage(tower,delta);if(tower.cooldown>0)continue;
      tower.cooldown=stats.interval;if(tower.kind==='trap')tower.uses=Math.max(0,(tower.uses||0)-1);
      this.practice(tower.kind,1);
      this.fire(tower,targets,stats);
    }
    // An aura trains by helping an ally in combat, including when its own weapon has no target.
    const beneficiaries=new Set(this.engagedThisUpdate);
    for(const tower of this.towers){const fx=this.effectsFor(tower);if(!(fx.auraDamage||fx.auraHaste)||(tower.disabledUntil||0)>this.time)continue;const point=this.getTowerPosition(tower),range=(tower.branch?TOWER_DEFS[tower.kind].branches[tower.branch].range:undefined)??TOWER_DEFS[tower.kind].range;if(this.towers.some(ally=>ally.id!==tower.id&&beneficiaries.has(ally.id)&&Math.hypot(this.getTowerPosition(ally).x-point.x,this.getTowerPosition(ally).y-point.y)<=range))this.engage(tower,delta);}
    this.enemies=this.enemies.filter(e=>e.hp>0);
    if(this.waveRemaining===0){for(const kind of this.practicedThisWave)this.practice(kind,8);this.gold+=Math.round((35+this.wave*7)*(1+(this.bonuses.gold||this.bonuses.economy))*DIFFICULTIES[this.difficulty].gold);this.clearedAt=this.time;this.status=this.wave===this.waves.length?'won':'building';}
  }
  private updateEnemyAbility(enemy:Enemy,delta:number){
    const def=ENEMY_DEFS[enemy.kind];if(!this.abilityActive(enemy))return;
    if(def.regen&&(enemy.burnUntil||0)<=this.time)enemy.hp=Math.min(enemy.maxHp,enemy.hp+def.regen*delta);
    if(def.teleportInterval&&this.time>=(enemy.nextTeleportAt??this.time+def.teleportInterval)){enemy.nextTeleportAt=this.time+def.teleportInterval;if(!enemy.blockedBy)enemy.distance=Math.min(this.pathLength-1,enemy.distance+65);}
    if(this.time<(enemy.nextAbilityAt??0))return;
    enemy.nextAbilityAt=this.time+5;
    if(def.heal)for(const ally of this.enemies)if(ally.hp>0&&Math.hypot(ally.x-enemy.x,ally.y-enemy.y)<=115)ally.hp=Math.min(ally.maxHp,ally.hp+def.heal*2);
    if(def.summon&&this.enemies.length<180)for(let i=0;i<(enemy.kind==='bonedragon'?2:1);i++)this.spawn(def.summon,Math.max(0,enemy.distance-i*14),false,true);
    if(enemy.kind==='stormconduit'||enemy.kind==='hellwarden'||enemy.kind==='bonedragon'){
      const victim=this.towers.filter(t=>t.kind!=='trap'&&Math.hypot(this.getTowerPosition(t).x-enemy.x,this.getTowerPosition(t).y-enemy.y)<=190).sort((a,b)=>a.id-b.id)[0];
      if(victim){if((victim.shieldCharges||0)>0){victim.shieldCharges!--;const p=this.getTowerPosition(victim);this.float(p.x,p.y-36,'WARD','#f4e5af');}else victim.disabledUntil=this.time+(enemy.kind==='hellwarden'?2.5:1.3);}
    }
    if(enemy.kind==='frostwight')for(const troop of this.troops)if(troop.hp>0&&!troop.stealth&&Math.hypot(troop.x-enemy.x,troop.y-enemy.y)<110)troop.slowUntil=this.time+2.5;
  }
  private fire(tower:Tower,targets:Enemy[],stats:TowerStats){
    const point=this.getTowerPosition(tower),fx=stats.effects,hit=new Set<number>(),primary=targets[0],primaryImpact={x:primary.x,y:primary.y};
    const strike=(enemy:Enemy,multiplier=1,direct=true)=>{
      if(enemy.hp<=0||hit.has(enemy.id)||!this.eligible(tower,enemy,point,false))return;
      hit.add(enemy.id);let damage=stats.damage*multiplier;
      if(ENEMY_DEFS[enemy.kind].ghost&&fx.executeGhosts)damage*=fx.executeGhosts;
      this.hitSequence++;
      if(((this.hitSequence*37+enemy.id*17)%1000)/1000<Math.min(.6,this.bonuses.criticalChance||this.bonuses.critical))damage*=1+this.bonuses.criticalDamage;
      const landed=this.damage(enemy,damage,stats.damageType,!!fx.ignoreArmor,direct,fx);
      if(landed&&enemy.hp>0){this.applyEffects(enemy,fx,1);if(fx.pull&&!ENEMY_DEFS[enemy.kind].ccImmune){const destination=this.nearestPathPoint(primary.x,primary.y).distance;enemy.distance+=clamp(destination-enemy.distance,-fx.pull,fx.pull);const p=positionAlong(enemy.distance,this.path,this.segments);enemy.x=p.x;enemy.y=p.y;}}
    };
    const chosen=targets.slice(0,Math.max(1,fx.targets||1));
    for(const target of chosen){
      const impact={x:target.x,y:target.y};
      if(!(fx.splash&&(fx.clusters||1)>1))strike(target,1,!fx.splash);
      if((fx.pierce||0)>1){const dx=impact.x-point.x,dy=impact.y-point.y,len=Math.hypot(dx,dy)||1;const line=this.enemies.filter(e=>e.hp>0&&!hit.has(e.id)&&this.eligible(tower,e,point)&&Math.hypot(e.x-point.x,e.y-point.y)<=stats.range).map(e=>({e,along:((e.x-point.x)*dx+(e.y-point.y)*dy)/len,side:Math.abs((e.x-point.x)*dy-(e.y-point.y)*dx)/len})).filter(v=>v.along>=0&&v.side<=18).sort((a,b)=>a.along-b.along||a.e.id-b.e.id);for(const {e}of line.slice(0,(fx.pierce||1)-1))strike(e);}
      if((fx.splash||0)>0){const count=fx.clusters||1;for(let cluster=0;cluster<count;cluster++){const angle=cluster*Math.PI*2/count,offset=count>1?fx.splash!*.45:0,cx=impact.x+Math.cos(angle)*offset,cy=impact.y+Math.sin(angle)*offset;for(const enemy of [...this.enemies])if(enemy.hp>0&&Math.hypot(enemy.x-cx,enemy.y-cy)<=fx.splash!){if(count>1)hit.delete(enemy.id);strike(enemy,1,false);}}}
      if((fx.chain||0)>1){let previous=target;for(let jump=1;jump<fx.chain!;jump++){const next=this.enemies.filter(e=>e.hp>0&&!hit.has(e.id)&&this.eligible(tower,e,previous,true)&&Math.hypot(e.x-previous.x,e.y-previous.y)<=(fx.chainRange||90)).sort((a,b)=>Math.hypot(a.x-previous.x,a.y-previous.y)-Math.hypot(b.x-previous.x,b.y-previous.y)||a.id-b.id)[0];if(!next)break;this.shot(tower.kind,previous,next,[next.id]);strike(next,.8**jump);previous=next;}}
      if(fx.lingerDuration){this.zones.push({id:this.nextId++,towerId:tower.id,kind:tower.kind,x:impact.x,y:impact.y,radius:fx.splash||60,damage:fx.zoneDps||0,damageType:stats.damageType,expiresAt:this.time+fx.lingerDuration,effects:{...fx}});if(this.zones.length>80)this.zones.shift();}
    }
    this.shot(tower.kind,{x:point.x,y:point.y-22},primaryImpact,[...hit]);
  }
  private shot(kind:TowerKind,from:Point,to:Point,hitIds:number[]){const life=kind==='mortar'?.5:kind==='cannon'?.32:['arcane','tesla','prism','truesight','void','nexus'].includes(kind)?.2:.18;this.shots.push({id:this.nextId++,kind,from:{x:from.x,y:from.y},to:{x:to.x,y:to.y},life,maxLife:life,hitIds});}
  private applyEffects(enemy:Enemy,fx:TowerEffects,strength:number){
    if(enemy.hp<=0)return;const immune=ENEMY_DEFS[enemy.kind].ccImmune;
    if(!immune){
      if(fx.slow){enemy.slowStrength=Math.max(enemy.slowUntil>this.time?enemy.slowStrength||0:0,clamp(fx.slow*strength,0,.95));enemy.slowUntil=Math.max(enemy.slowUntil,this.time+(fx.slowDuration||1.5));}
      if(fx.stun)enemy.stunUntil=Math.max(enemy.stunUntil||0,this.time+fx.stun);
      if(fx.root)enemy.rootUntil=Math.max(enemy.rootUntil||0,this.time+fx.root);
      if(fx.knockback){enemy.distance=Math.max(0,enemy.distance-fx.knockback);const p=positionAlong(enemy.distance,this.path,this.segments);enemy.x=p.x;enemy.y=p.y;}
    }
    if(fx.poisonDps){const active=(enemy.poisonUntil||0)>this.time;enemy.poisonDps=Math.max(active?enemy.poisonDps||0:0,fx.poisonDps);enemy.poisonUntil=Math.max(enemy.poisonUntil||0,this.time+(fx.poisonDuration||4));enemy.poisonSpread=!!fx.spread||(active&&!!enemy.poisonSpread);}
    if(fx.burnDps){enemy.burnDps=Math.max((enemy.burnUntil||0)>this.time?enemy.burnDps||0:0,fx.burnDps);enemy.burnUntil=Math.max(enemy.burnUntil||0,this.time+(fx.burnDuration||3));}
    if(fx.armorShred){enemy.armorShred=Math.max((enemy.armorShredUntil||0)>this.time?enemy.armorShred||0:0,clamp(fx.armorShred,0,1));enemy.armorShredUntil=this.time+5;}
    if(fx.curse){enemy.curse=Math.max((enemy.curseUntil||0)>this.time?enemy.curse||0:0,fx.curse);enemy.curseUntil=this.time+4;}
    if(fx.reveal)enemy.revealedUntil=this.time+2;
    if(fx.disableAbilities)enemy.disabledUntil=Math.max(enemy.disabledUntil||0,this.time+fx.disableAbilities);
  }
  private damage(enemy:Enemy,amount:number,type:DamageType='physical',ignoreArmor=false,canDodge=true,fatalEffects?:TowerEffects):boolean {
    if(enemy.hp<=0||!Number.isFinite(amount)||amount<=0)return false;
    const def=ENEMY_DEFS[enemy.kind];
    if(canDodge&&def.dodge){const roll=((this.hitSequence*73+enemy.id*19)%1000)/1000;if(roll<def.dodge){this.float(enemy.x,enemy.y-25,'DODGE','#b9d4d8');return false;}}
    const multiplier=enemyDamageMultiplier(enemy.kind,type,(enemy.armorShredUntil||0)>this.time?enemy.armorShred||0:0,ignoreArmor),curse=(enemy.curseUntil||0)>this.time?enemy.curse||0:0;
    // Silence is part of the landed hit, so a fatal sonic hit can prevent a split.
    if(fatalEffects?.disableAbilities)enemy.disabledUntil=Math.max(enemy.disabledUntil||0,this.time+fatalEffects.disableAbilities);
    enemy.hp=Math.max(0,enemy.hp-amount*multiplier*(1+curse));
    if(enemy.hp===0&&!enemy.rewardGranted){
      enemy.rewardGranted=true;this.kills++;const reward=enemy.summoned?0:Math.max(1,Math.round(def.reward*(1+(this.bonuses.gold||this.bonuses.economy))*DIFFICULTIES[this.difficulty].gold));this.gold+=reward;
      if(reward)this.float(enemy.x,enemy.y-15,'+'+reward,'#e8c981');
      if(enemy.poisonSpread&&(enemy.poisonUntil||0)>this.time)for(const nearby of this.enemies)if(nearby.hp>0&&Math.hypot(nearby.x-enemy.x,nearby.y-enemy.y)<=80)this.applyEffects(nearby,{poisonDps:enemy.poisonDps,poisonDuration:Math.max(.1,(enemy.poisonUntil||0)-this.time),spread:true},1);
      if(def.splitInto&&(enemy.disabledUntil||0)<=this.time&&this.enemies.length<180)for(let i=0;i<(def.splitCount||2);i++)this.spawn(def.splitInto,Math.max(0,enemy.distance-i*10),false,!!enemy.summoned);
    }
    return true;
  }
  private syncTroops(){
    this.troops=this.troops.filter(t=>this.towers.some(tower=>tower.id===t.towerId&&tower.kind==='barracks'));
    for(const tower of this.towers){if(tower.kind!=='barracks')continue;const stats=this.getTowerStats(tower),fx=stats.effects,owned=this.troops.filter(t=>t.towerId===tower.id),count=fx.troops||2,home=this.getTowerPosition(tower),rally=tower.rally||this.nearestPathPoint(home.x,home.y);
      while(owned.length>count){const last=owned.pop()!;this.troops=this.troops.filter(t=>t.id!==last.id);}
      for(let i=0;i<count;i++){
        const maxHp=Math.round((fx.troopHp||105)*(1+this.bonuses.fortify)),damage=Math.round((fx.troopDamage||13)*(1+this.bonuses.damage)),speed=fx.troopSpeed||62;
        if(!owned[i]){const troop:Troop={id:this.nextId++,towerId:tower.id,x:home.x,y:home.y,hp:maxHp,maxHp,damage,speed,cooldown:0,respawnAt:0,rally:{x:rally.x+(i-(count-1)/2)*9,y:rally.y},targetId:null,state:'moving',stealth:!!fx.troopStealth};this.troops.push(troop);owned.push(troop);}
        else {const troop=owned[i],oldMax=troop.maxHp;troop.maxHp=maxHp;if(troop.hp>0)troop.hp=Math.min(maxHp,troop.hp+Math.max(0,maxHp-oldMax));troop.damage=damage;troop.speed=speed;troop.rally={x:rally.x+(i-(count-1)/2)*9,y:rally.y};if(troop.state!=='fighting')troop.stealth=!!fx.troopStealth;}
      }
    }
  }
  private updateTroops(delta:number,fighting:boolean){
    for(const troop of this.troops){
      const tower=this.towers.find(t=>t.id===troop.towerId)!;
      if(troop.hp<=0){troop.state='fallen';troop.targetId=null;if(this.time>=troop.respawnAt){const home=this.getTowerPosition(tower);troop.x=home.x;troop.y=home.y;troop.hp=troop.maxHp;troop.state='moving';}else continue;}
      const candidates=fighting?this.enemies.filter(enemy=>enemy.hp>0&&!ENEMY_DEFS[enemy.kind].flying&&!ENEMY_DEFS[enemy.kind].ghost&&(!ENEMY_DEFS[enemy.kind].stealth||(enemy.revealedUntil||0)>this.time||enemy.distance>this.pathLength*.82)&&Math.hypot(enemy.x-troop.rally.x,enemy.y-troop.rally.y)<85).sort((a,b)=>Math.hypot(a.x-troop.x,a.y-troop.y)-Math.hypot(b.x-troop.x,b.y-troop.y)||a.id-b.id):[];
      const target=candidates[0];troop.targetId=target?.id??null;const destination=target||troop.rally,distance=Math.hypot(destination.x-troop.x,destination.y-troop.y);
      if(target)this.engage(tower,delta);
      if(distance>(target?14:2)){const step=Math.min(distance,troop.speed*delta);troop.x+=(destination.x-troop.x)/distance*step;troop.y+=(destination.y-troop.y)/distance*step;troop.state=target?'moving':'returning';}
      else if(target){troop.state='fighting';troop.stealth=false;troop.cooldown=Math.max(0,troop.cooldown-delta);if(troop.cooldown<=0&&(tower.disabledUntil||0)<=this.time){this.hitSequence++;this.damage(target,troop.damage,'physical',false,true);troop.cooldown=((troop.slowUntil||0)>this.time?1.65:.9)*this.getTowerStats(tower).interval;}
        if(target.hp>0&&(target.stunUntil||0)<=this.time)troop.hp=Math.max(0,troop.hp-(6+Math.sqrt(target.maxHp)*.65)*delta/(1+this.bonuses.fortify));
        if(troop.hp<=0){troop.respawnAt=this.time+8;troop.state='fallen';troop.targetId=null;}
      }else troop.state='guarding';
    }
  }
  private float(x:number,y:number,text:string,color:string){this.floats.push({id:this.nextId++,x,y,text,color,life:1.1});if(this.floats.length>120)this.floats.shift();}
  reset():void {
    this.campaignWaves=generateWaves(this.level,this.difficulty);
    // Reconcile the report before resetting. Carry mastery forward for standalone simulations too.
    this.savedMastery=this.towerMastery;this.practiceXP={};this.acknowledgedPractice={};this.practiceSession=practiceSessionId();this.practicedThisWave.clear();this.engagedThisUpdate.clear();
    this.gold=this.startingGold();this.maxLives=this.startingLives();this.lives=this.maxLives;this.wave=0;this.status='building';this.paused=false;this.speed=1;this.time=0;this.kills=0;
    this.towers=[];this.enemies=[];this.troops=[];this.shots=[];this.floats=[];this.zones=[];this.meteorCooldown=0;this.nextId=1;this.pending=[];this.waveTime=0;this.clearedAt=0;this.hitSequence=0;
  }
  snapshot(){return{
    levelIndex:this.levelIndex,levelId:this.level.id,levelName:this.level.name,mapKey:this.level.mapKey,wavesTotal:this.waves.length,difficulty:this.difficulty,maxLives:this.maxLives,stars:this.stars,
    path:this.path.map(p=>({...p})),pads:this.pads.map(p=>({...p})),trees:this.trees.map(t=>({...t})),
    gold:this.gold,lives:this.lives,wave:this.wave,status:this.status,paused:this.paused,speed:this.speed,time:this.time,kills:this.kills,
    meteorCooldown:this.meteorCooldown,waveRemaining:this.waveRemaining,clearedWaves:this.clearedWaves,earlyBonus:this.earlyBonus,autoWave:this.autoWave,autoWaveIn:this.autoWaveIn,wavePreview:this.wavePreview(),stealthBriefing:this.stealthBriefing(),
    unlockedTowers:[...this.unlockedTowers],towerMastery:this.towerMastery,towerXPReport:this.towerXPReport,towers:this.towers.map(t=>({...t,upgradeGate:this.getUpgradeGate(t),position:t.position?{...t.position}:undefined,rally:t.rally?{...t.rally}:undefined})),
    traps:this.towers.filter(t=>t.kind==='trap').map(t=>({...t,position:{...this.getTowerPosition(t)}})),
    enemies:this.enemies.map(e=>({...e})),troops:this.troops.map(t=>({...t,rally:{...t.rally}})),zones:this.zones.map(z=>({...z,effects:{...z.effects}})),
  };}
}
