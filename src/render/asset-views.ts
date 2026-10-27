import Phaser from 'phaser';
import { TOWER_DEFS, ENEMY_DEFS, type GameModel, type Enemy, type TowerKind } from '../game/model';
import { suppliedAtlas, TOWER_ATLAS_URL, ENEMY_ATLAS_URL, TOWER_TEXTURE, ENEMY_TEXTURE, getTowerTexture, getTowerFrameKey, getTowerRecoilKind } from '../asset-art';
import { towerRecoil } from './animation-pose';
import { sampleWalkCycle, ANIMATION_FPS, animationTick } from './walk-cycle';
import { UNIT_KINDS, getWalkingAsset, walkFrameName, type VisualUnitKind } from '../walking-assets';

export function preloadAssetSheets(scene: Phaser.Scene): void {
  scene.load.image(TOWER_TEXTURE, TOWER_ATLAS_URL);
  scene.load.image(ENEMY_TEXTURE, ENEMY_ATLAS_URL);
  for (const kind of UNIT_KINDS) { const asset = getWalkingAsset(kind); scene.load.image(asset.texture, asset.url); }
}
export function prepareAssetFrames(scene: Phaser.Scene): void {
  for (const kind of UNIT_KINDS) {
    const asset = getWalkingAsset(kind), texture = scene.textures.get(asset.texture);
    for (let index = 0; index < asset.frameCount; index++) {
      const name = walkFrameName(kind, index);
      if (!texture.has(name)) texture.add(name, 0, index * asset.frameWidth, 0, asset.frameWidth, asset.frameHeight);
    }
  }
  for (const [name, frame] of Object.entries(suppliedAtlas.frames)) {
    const key = frame.sheet === 'enemy-roster' ? ENEMY_TEXTURE : TOWER_TEXTURE;
    if (!scene.textures.exists(key)) throw new Error(`Missing supplied asset texture: ${key}`);
    const texture = scene.textures.get(key);
    if (!texture.has(name)) texture.add(name, 0, frame.x, frame.y, frame.width, frame.height);
  }
}
interface TowerView { image: Phaser.GameObjects.Image; badge:Phaser.GameObjects.Text; born: number; upgrade: number; level: number; fired: number; fireSequence: number; state: string; }
interface EnemyView { image: Phaser.GameObjects.Image; badge:Phaser.GameObjects.Text; visualKind:VisualUnitKind; enemy: Enemy; lastX: number; hp: number; hit: number; hitSequence: number; state: string; walkFrame: number; walkPhase: number; lastPoseTick: number; }
interface TroopView { image:Phaser.GameObjects.Image; x:number;y:number;distance:number;state:string;lastPoseTick:number;walkFrame:number; }
interface Particle { x: number; y: number; vx: number; vy: number; born: number; life: number; color: number; size: number; }
interface Ghost { image: Phaser.GameObjects.Image; born: number; scale: number; x: number; y: number; }
const enemyHeights: Record<VisualUnitKind, number> = { grunt: 36, runner: 34, brute: 48, boss: 70 };
const towerMarks:Record<string,string>={archer:'AR',cannon:'CA',mortar:'MO',frost:'IC',earth:'EA',arcane:'MA',tesla:'TE',venom:'PO',prism:'PR',trap:'TR',sonic:'SO',barracks:'BA',void:'VO',solar:'SU',chrono:'CH',truesight:'TS',nexus:'NX'};
const enemyMarks:Record<string,string>={scout:'SC',raider:'RA',bat:'BAT',brute:'HV',shieldbearer:'SH',ogre:'OG',troll:'TR',stonegolem:'GO',juggernaut:'JG',ironsentinel:'IR',shaman:'SA',necromancer:'NC',stormconduit:'ST',frostwight:'FW',voidling:'VO',skeleton:'SK',darkknight:'DK',shadowwraith:'WR',warlord:'WL',boss:'HK',bonedragon:'BD',hellwarden:'HW'};

/** Combat uses real limb poses from the walking atlases; tower and hit effects remain separate. */
export class AssetViews {
  private readonly towers = new Map<number, TowerView>();
  private readonly enemies = new Map<number, EnemyView>();
  private readonly troops = new Map<number,TroopView>();
  private readonly weaponOutlets = new Map<string,{x:number;y:number}>();
  private readonly shadows: Phaser.GameObjects.Graphics;
  private readonly effects: Phaser.GameObjects.Graphics;
  private particles: Particle[] = [];
  private ghosts: Ghost[] = [];
  private lastShot = 0;
  private lastTime = -1;
  private clock = 0;
  private presentationTime = 0;
  private poseTick = 0;
  private reduced = false;
  private deaths = 0;
  constructor(private readonly scene: Phaser.Scene) {
    this.shadows = scene.add.graphics().setDepth(5.8);
    this.effects = scene.add.graphics().setDepth(8);
  }
  private burst(x: number, y: number, color: number, count: number, time: number): void {
    if (this.reduced) return;
    for (let i = 0; i < count && this.particles.length < 160; i++) {
      const angle = i * 2.39996 + time, speed = 15 + (i % 5) * 9;
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 25, born: time, life: .35 + (i % 4) * .12, color, size: 1.5 + i % 3 });
    }
  }
  private clear(): void {
    for (const view of this.towers.values()) {view.image.destroy();view.badge.destroy();}
    for (const view of this.enemies.values()) {view.image.destroy();view.badge.destroy();}
    for (const view of this.troops.values()) view.image.destroy();
    for (const view of this.ghosts) view.image.destroy();
    this.towers.clear(); this.enemies.clear(); this.troops.clear(); this.weaponOutlets.clear(); this.ghosts = []; this.particles = []; this.lastShot = 0; this.deaths = 0;
  }
  reset(): void { this.clear(); this.lastTime = -1; }
  sync(model: GameModel, time: number, reduced = false, presentationTime = time): void {
    if (model.time < this.lastTime) this.clear();
    this.lastTime = model.time; this.clock = time; this.reduced = reduced; this.presentationTime = presentationTime; this.poseTick = animationTick(presentationTime);
    const fx = this.effects.clear(); this.shadows.clear();
    this.weaponOutlets.clear();
    if (reduced) { this.particles = []; for (const ghost of this.ghosts) ghost.image.destroy(); this.ghosts = []; }
    const towerIds = new Set(model.towers.map(t => t.id)), enemyIds = new Set(model.enemies.map(e => e.id));
    for (const [id, view] of this.towers) if (!towerIds.has(id)) { view.image.destroy(); view.badge.destroy(); this.towers.delete(id); }
    for (const [id, view] of this.enemies) if (!enemyIds.has(id)) {
      if (view.enemy.hp <= 0 && view.enemy.distance < model.pathLength) {
        this.deaths++;
        if (!reduced && this.ghosts.length < 30) {
          this.ghosts.push({ image: view.image, born: time, scale: view.image.scaleX, x: view.enemy.x, y: view.enemy.y + 6 });
          this.burst(view.enemy.x, view.enemy.y - 12, 0xb3d39d, 9, time);
        } else view.image.destroy();
      } else view.image.destroy();
      view.badge.destroy();this.enemies.delete(id);
    }
    // Only the originating shot belongs to a tower; chain jumps do not repeat its recoil.
    for (const shot of model.shots) if (shot.id > this.lastShot) {
      for (const tower of model.towers) {
        const pad = model.getTowerPosition(tower);
        if (Math.abs(shot.from.x - pad.x) < 1 && Math.abs(shot.from.y - (pad.y - 22)) < 1) {
          const view = this.towers.get(tower.id);
          if (view) { view.fired = time; view.fireSequence++; }
        }
      }
      this.burst(shot.to.x, shot.to.y - 12, TOWER_DEFS[shot.kind].color, shot.kind === 'cannon' ? 10 : 4, time);
      this.lastShot = Math.max(this.lastShot, shot.id);
    }
    for (const tower of model.towers) {
      const pad = model.getTowerPosition(tower), key = getTowerFrameKey(tower.kind,tower.level), frame = suppliedAtlas.frames[key];
      let view = this.towers.get(tower.id);
      if (!view) {
        const badge=this.scene.add.text(pad.x,pad.y+22,'',{fontFamily:'DM Sans',fontSize:'9px',fontStyle:'bold',color:'#e8dec1',backgroundColor:'#071923',padding:{x:4,y:2}}).setOrigin(.5).setDepth(9);
        view = { image: this.scene.add.image(pad.x, pad.y + 16, getTowerTexture(tower.kind), key).setOrigin(frame.originX, frame.originY), badge, born: time, upgrade: -10, level: tower.level, fired: -10, fireSequence: 0, state: 'building' };
        this.towers.set(tower.id, view); this.burst(pad.x, pad.y + 4, 0xe8cd8a, 15, time);
      }
      if (view.level !== tower.level) { view.level = tower.level; view.upgrade = time; this.burst(pad.x, pad.y - 40, 0xffe6a5, 22, time); }
      const image = view.image;
      if (image.frame.name !== key) image.setFrame(key);
      const base = Math.min(([84, 100, 116][tower.level - 1] ?? 116) / frame.height, (tower.kind==='trap'?82:105) / frame.width);
      const buildAge = time - view.born, upgradeAge = time - view.upgrade, fireAge = time - view.fired;
      const recoil = towerRecoil(getTowerRecoilKind(tower.kind), fireAge, reduced);
      const build = reduced ? 1 : 1 - (1 - Math.min(1, buildAge / .34)) ** 3;
      const lift = !reduced && upgradeAge < .5 ? Math.sin(upgradeAge * Math.PI / .5) * 3 : 0;
      image.setOrigin(frame.originX,frame.originY).setScale(base * recoil.scaleX * (.85 + .15 * build), base * recoil.scaleY * (.35 + .65 * build));
      const anchorX = pad.x, anchorY = pad.y + 16;
      image.setPosition(anchorX + recoil.offsetX, anchorY + recoil.offsetY - lift).setRotation(recoil.rotation).setAlpha(reduced ? 1 : .5 + .5 * build);
      image.setDepth(6 + (pad.y + 16) / 1000).setName(`asset-tower-${tower.id}-${key}`);
      view.badge.setText(`${towerMarks[tower.kind]??'TW'}${tower.branch?` · ${tower.branch}`:''}${tower.kind==='trap'?` ${'•'.repeat(Math.max(0,tower.uses??0))}`:''}`).setPosition(anchorX,anchorY+9);
      const badgeColor=`#${TOWER_DEFS[tower.kind].color.toString(16).padStart(6,'0')}`;if(view.badge.style.color!==badgeColor)view.badge.setColor(badgeColor);
      if((tower.disabledUntil??0)>model.time){image.setAlpha(.45);view.badge.setText(`${towerMarks[tower.kind]} ×`);}
      if((tower.shieldCharges??0)>0)fx.lineStyle(1.5,0xe9eeff,.6).strokeEllipse(anchorX,anchorY-22,64,74);
      view.state = buildAge < .34 ? 'building' : upgradeAge < .5 ? 'upgrading' : fireAge < .36 ? 'firing' : 'idle';
      this.shadows.fillStyle(0x04101b, .25).fillEllipse(anchorX + 2, anchorY - 2, Math.min(66, image.displayWidth * .8), 22);
      const muzzleX=anchorX+((frame.muzzleX??.5)-frame.originX)*frame.width*base;
      const muzzleY=anchorY+((frame.muzzleY??.25)-frame.originY)*frame.height*base;
      this.weaponOutlets.set(`${pad.x.toFixed(1)}:${(pad.y-22).toFixed(1)}`,{x:muzzleX,y:muzzleY});
      if(recoil.flash>0)this.weaponFlash(fx,tower.kind,muzzleX,muzzleY,recoil.flash);
      if(!reduced)this.magic(fx,tower.kind,muzzleX,muzzleY,time,tower.id);
      if (!reduced && upgradeAge < .6) { fx.lineStyle(2, 0xffdf9d, 1 - upgradeAge / .6).strokeEllipse(pad.x, pad.y + 9, 40 + upgradeAge * 110, 18 + upgradeAge * 50); }
    }
    for (const enemy of model.enemies) {
      const definition=ENEMY_DEFS[enemy.kind],visualKind=definition.visual;
      const asset = getWalkingAsset(visualKind);
      let view = this.enemies.get(enemy.id);
      const walk = !view || reduced || view.lastPoseTick !== this.poseTick ? sampleWalkCycle(visualKind, enemy.distance, enemy.id, reduced) : { frame: view.walkFrame, phase: view.walkPhase };
      const frameName = walkFrameName(visualKind, walk.frame);
      if (!view) {
        const badge=this.scene.add.text(enemy.x,enemy.y-40,'',{fontFamily:'DM Sans',fontSize:'8px',fontStyle:'bold',color:'#e5e1ce',backgroundColor:'#071923dd',padding:{x:3,y:1}}).setOrigin(.5).setDepth(8.6);
        view = { image: this.scene.add.image(enemy.x, enemy.y + 6, asset.texture, frameName).setOrigin(asset.origin.x, asset.origin.y), badge, visualKind, enemy, lastX: enemy.x, hp: enemy.hp, hit: -10, hitSequence: 0, state: 'walking', walkFrame: walk.frame, walkPhase: walk.phase, lastPoseTick: this.poseTick };
        this.enemies.set(enemy.id, view);
      }
      if (enemy.hp < view.hp) { view.hit = time; view.hitSequence++; this.burst(enemy.x, enemy.y - 16, 0xf6d798, 4, time); }
      const dx = enemy.x - view.lastX;
      if (Math.abs(dx) > .03) view.image.setFlipX(dx < 0);
      const slow = enemy.slowUntil > model.time, height=enemyHeights[visualKind]*(enemy.miniBoss?1.18:1),base = height / asset.bodyHeight;
      const flying=definition.flying===true,lift=flying?17:0,hidden=(definition.stealth||definition.ghost)&&!((enemy.revealedUntil??0)>model.time)&&enemy.distance<model.pathLength*.82;
      // Feet, knees, arms, and equipment move inside each frame. Keep the whole sprite stable.
      view.image.setFrame(frameName).setScale(base).setRotation(0);
      view.image.setPosition(enemy.x, enemy.y + 6-lift).setDepth(6 + (enemy.y + 6) / 1000).setName(`asset-enemy-${enemy.id}-${enemy.kind}`);
      view.image.setAlpha((time - view.hit < .12 ? .58 + .42 * Math.max(0,(time - view.hit) / .12) : 1)*(hidden?.42:1));
      view.state = (enemy.stunUntil??0)>model.time?'stunned':(enemy.rootUntil??0)>model.time?'rooted':enemy.blockedBy?'blocked':time - view.hit < .18 ? 'hit' : slow ? 'slowed' : 'walking';
      view.hp = enemy.hp; view.enemy = enemy; view.lastX = enemy.x; view.walkFrame = walk.frame; view.walkPhase = walk.phase; view.lastPoseTick = this.poseTick;
      const mark=`${enemy.miniBoss?'★ ':''}${enemyMarks[enemy.kind]??''}`;
      view.badge.setText(mark).setPosition(enemy.x,enemy.y-height-lift-12).setVisible(Boolean(mark));
      const badgeColor=definition.ccImmune?'#e7bb87':definition.flying?'#c4e7ff':definition.ghost?'#d1adff':'#e5e1ce';if(view.badge.style.color!==badgeColor)view.badge.setColor(badgeColor);
      this.shadows.fillStyle(0x04101b, flying?.14:.28).fillEllipse(enemy.x + 1, enemy.y + 5, height * .65, height * .17);
      if ((enemy.poisonUntil ?? 0) > model.time) { fx.fillStyle(0xa7dc72,.24).fillCircle(enemy.x,enemy.y-16,10); }
      if (slow) { fx.lineStyle(1.5, 0x9fe9ff, .75).strokeEllipse(enemy.x, enemy.y + 4, height * .75, height * .23); }
      if((enemy.burnUntil??0)>model.time){fx.fillStyle(0xffa55e,.22).fillCircle(enemy.x,enemy.y-12-lift,12);fx.lineStyle(1.5,0xffbf78,.85).lineBetween(enemy.x-4,enemy.y-6-lift,enemy.x-2,enemy.y-16-lift).lineBetween(enemy.x+3,enemy.y-8-lift,enemy.x+5,enemy.y-20-lift);}
      if((enemy.stunUntil??0)>model.time){fx.lineStyle(1.5,0xffef9a,.9).strokeEllipse(enemy.x,enemy.y-height-lift+4,18,6);fx.fillStyle(0xffef9a,.9).fillCircle(enemy.x+8,enemy.y-height-lift+2,2);}
      if((enemy.rootUntil??0)>model.time){fx.lineStyle(2,0xb4d989,.9).lineBetween(enemy.x-10,enemy.y+3,enemy.x+9,enemy.y+1).lineBetween(enemy.x-8,enemy.y-2,enemy.x+5,enemy.y+7);}
      if(enemy.blockedBy)fx.lineStyle(1.4,0x8fcaff,.75).strokeEllipse(enemy.x,enemy.y+4,23,10);
      if(flying){fx.lineStyle(2,0xc3ddf1,.8).lineBetween(enemy.x-7,enemy.y-20-lift,enemy.x-17,enemy.y-27-lift).lineBetween(enemy.x+7,enemy.y-20-lift,enemy.x+17,enemy.y-27-lift);}
      if((enemy.curseUntil??0)>model.time)fx.lineStyle(1.3,0xcb94f9,.75).strokeCircle(enemy.x,enemy.y-15-lift,12);
    }
    this.syncTroops(model,time,reduced);
    this.ghosts = this.ghosts.filter(ghost => {
      const age = time - ghost.born, p = age / .42;
      if (p >= 1) { ghost.image.destroy(); return false; }
      ghost.image.setAlpha((1 - p) * .8).setRotation(p * .8).setPosition(ghost.x, ghost.y + p * 8).setScale(ghost.scale * (1 - p * .35));
      return true;
    });
    this.particles = this.particles.filter(particle => {
      const age = time - particle.born;
      if (age >= particle.life) return false;
      fx.fillStyle(particle.color, (1 - age / particle.life) * .85).fillCircle(particle.x + particle.vx * age, particle.y + particle.vy * age + 35 * age * age, particle.size * (1 - age / particle.life * .6));
      return true;
    });
  }
  private syncTroops(model:GameModel,_time:number,reduced:boolean):void{
    const live=new Set(model.troops.map(troop=>troop.id));
    for(const [id,view]of this.troops)if(!live.has(id)){view.image.destroy();this.troops.delete(id);}
    const asset=getWalkingAsset('brute'),fx=this.effects;
    for(const troop of model.troops){
      let view=this.troops.get(troop.id);
      if(!view){view={image:this.scene.add.image(troop.x,troop.y+4,asset.texture,walkFrameName('brute',0)).setOrigin(asset.origin.x,asset.origin.y),x:troop.x,y:troop.y,distance:0,state:troop.state,lastPoseTick:-1,walkFrame:0};this.troops.set(troop.id,view);}
      const dx=troop.x-view.x,dy=troop.y-view.y;
      view.distance+=Math.hypot(dx,dy);
      if(view.lastPoseTick!==this.poseTick||reduced){view.walkFrame=sampleWalkCycle('brute',view.distance,troop.id,reduced).frame;view.lastPoseTick=this.poseTick;}
      view.image.setVisible(troop.state!=='fallen'&&troop.hp>0).setFrame(walkFrameName('brute',view.walkFrame)).setScale(30/asset.bodyHeight).setPosition(troop.x,troop.y+4).setDepth(6+(troop.y+5)/1000).setName(`ally-troop-${troop.id}`);
      if(Math.abs(dx)>.03)view.image.setFlipX(dx<0);
      view.x=troop.x;view.y=troop.y;view.state=troop.state;
      if(troop.state==='fallen'||troop.hp<=0)continue;
      this.shadows.fillStyle(0x5eabdf,.22).fillEllipse(troop.x,troop.y+4,25,10);
      fx.lineStyle(1.5,0x8fd5ff,.8).strokeEllipse(troop.x,troop.y+4,25,10);
      // A blue shield makes allied silhouettes unmistakable among reused armored art.
      fx.fillStyle(0x2274a4,.98).fillTriangle(troop.x-7,troop.y-18,troop.x+2,troop.y-18,troop.x-2,troop.y-7);
      fx.lineStyle(1,0xc5ebff,1).lineBetween(troop.x-3,troop.y-16,troop.x-3,troop.y-10);
      fx.fillStyle(0x061421,.95).fillRect(troop.x-12,troop.y-34,24,4);
      fx.fillStyle(0x87c9ef,1).fillRect(troop.x-12,troop.y-34,24*Math.max(0,troop.hp/troop.maxHp),4);
      if(troop.state==='fighting')fx.lineStyle(1.5,0xe9dcae,.9).lineBetween(troop.x+8,troop.y-18,troop.x+13,troop.y-24);
    }
  }
  /** Secondary chain jumps retain their source on the enemy; primary shots leave the weapon. */
  getShotOrigin(from:{x:number;y:number}):{x:number;y:number}{
    return this.weaponOutlets.get(`${from.x.toFixed(1)}:${from.y.toFixed(1)}`)??{x:from.x,y:from.y-8};
  }
  /** Brief feedback originates at the actual weapon, rather than the top of a reused tower. */
  private weaponFlash(fx:Phaser.GameObjects.Graphics,kind:TowerKind,x:number,y:number,flash:number):void {
    const color=TOWER_DEFS[kind].color,alpha=flash*.85;
    if(kind==='archer'){fx.lineStyle(1.5,0xf4e4bd,alpha).lineBetween(x-8,y+3,x+8,y+3);return;}
    if(kind==='cannon'||kind==='mortar'){
      fx.fillStyle(0xffe5a1,alpha).fillTriangle(x-4,y+4,x+2,y-18*flash,x+11,y-4);
      fx.fillStyle(0xe9a15b,alpha*.35).fillCircle(x,y-3,12*flash);
      fx.lineStyle(2,0xc4b6a1,alpha*.65).strokeEllipse(x-4,y+2,16+10*(1-flash),8+5*(1-flash));return;
    }
    if(kind==='trap'){
      fx.lineStyle(2,0xe6cba3,alpha).strokeEllipse(x,y,31+flash*13,12+flash*5);
      for(let i=0;i<4;i++)fx.lineBetween(x-15+i*10,y+4,x-10+i*10,y-8*flash);return;
    }
    if(kind==='sonic'){
      for(let i=0;i<3;i++)fx.lineStyle(1.5,0xe6c7ef,alpha/(i+1)).strokeEllipse(x,y,10+i*10+(1-flash)*28,7+i*7+(1-flash)*18);return;
    }
    if(kind==='venom'){
      fx.fillStyle(0xd0ee97,alpha).fillCircle(x-4,y-6,3).fillCircle(x+4,y-12,2).fillCircle(x+7,y-3,2.5);return;
    }
    if(kind==='void'){
      fx.fillStyle(0x080f21,alpha).fillCircle(x,y,9*flash+2);
      fx.lineStyle(2,0xc2a1ed,alpha).strokeEllipse(x,y,17*flash+3,23*flash+3);return;
    }
    if(kind==='prism'){
      fx.fillStyle(0xffffe8,alpha).fillCircle(x,y,4+4*flash);
      fx.lineStyle(1.5,0xe5faff,alpha).lineBetween(x-12,y,x+12,y).lineBetween(x,y-13,x,y+13);return;
    }
    if(kind==='solar'){
      fx.fillStyle(0xffde88,alpha).fillTriangle(x-7,y+6,x-2,y-23*flash,x+8,y+6);
      fx.lineStyle(2,0xffba70,alpha*.7).strokeCircle(x,y,10+8*(1-flash));return;
    }
    if(kind==='earth'){
      fx.lineStyle(2,0xd9d5b0,alpha).lineBetween(x-14,y+7,x-6,y-4).lineBetween(x-6,y-4,x+5,y+1).lineBetween(x+5,y+1,x+13,y-8);return;
    }
    if(kind==='frost'){
      fx.lineStyle(1.8,0xd8fbff,alpha);
      for(let i=0;i<3;i++){const a=i*Math.PI/3;fx.lineBetween(x-Math.cos(a)*12,y-Math.sin(a)*12,x+Math.cos(a)*12,y+Math.sin(a)*12);}return;
    }
    if(kind==='chrono'){
      fx.lineStyle(1.5,0xe5dcc0,alpha).strokeCircle(x,y,12+5*(1-flash)).lineBetween(x,y,x,y-9).lineBetween(x,y,x+6,y+3);return;
    }
    if(kind==='tesla'){
      fx.lineStyle(2,0xd7f5ff,alpha).lineBetween(x-12,y-1,x-4,y-10).lineBetween(x-4,y-10,x+2,y-2).lineBetween(x+2,y-2,x+12,y-15);return;
    }
    if(kind==='barracks')return;
    fx.lineStyle(1.5,color,alpha).strokeCircle(x,y,7+8*(1-flash));
    fx.fillStyle(0xf1e1ff,alpha*.7).fillCircle(x,y,4*flash);
  }
  private magic(fx:Phaser.GameObjects.Graphics,kind:TowerKind,x:number,y:number,time:number,id:number):void {
    const phase=time*1.8+id,color=TOWER_DEFS[kind].color;
    if(kind==='venom'){
      for(let i=0;i<2;i++){const age=(time*.45+i*.5+id*.1)%1;fx.fillStyle(0xbfe38a,(1-age)*.55).fillCircle(x-9+i*11,y-age*17,1.4+age*1.4);}return;
    }
    if(kind==='tesla'){
      const jitter=Math.sin(Math.floor(time*9)+id)*4;
      fx.lineStyle(1,0xaadef5,.5).lineBetween(x-9,y,x-3,y-5-jitter).lineBetween(x-3,y-5-jitter,x+2,y-1).lineBetween(x+2,y-1,x+10,y-7);return;
    }
    if(kind==='void'){
      fx.lineStyle(1,0xbd96e7,.45).strokeEllipse(x,y,14+Math.sin(phase)*2,22);
      fx.fillStyle(0xc1a2ed,.7).fillCircle(x+Math.cos(phase)*14,y+Math.sin(phase)*21,1.6);return;
    }
    if(kind==='solar'){
      fx.fillStyle(0xffd794,.08+(Math.sin(phase)+1)*.025).fillCircle(x,y,18);
      for(let i=0;i<2;i++){const age=(time*.65+i*.5)%1;fx.fillStyle(0xffd79b,(1-age)*.6).fillCircle(x+Math.sin(phase+i)*4,y-age*20,1.3);}return;
    }
    if(kind==='chrono'){
      const a=phase*.8;fx.lineStyle(1.1,0xe6d7aa,.65).strokeCircle(x,y,10).lineBetween(x,y,x+Math.cos(a)*8,y+Math.sin(a)*8);return;
    }
    if(kind==='truesight'){
      fx.lineStyle(1,0xe3e8b8,.4).strokeEllipse(x,y,14,8);
      fx.fillStyle(0xf8f4d5,.6).fillCircle(x+Math.sin(phase*.45)*5,y,1.8);return;
    }
    if(kind==='prism'){
      fx.lineStyle(1,0xe7fae7,.35).lineBetween(x-7,y-4,x+7,y+4);
      fx.fillStyle(0xf7fff4,.5+Math.sin(phase)*.2).fillCircle(x-4,y-4,1.8);return;
    }
    if(kind==='nexus'){
      for(let i=0;i<3;i++){const a=phase*.5+i*Math.PI*2/3;fx.fillStyle([0xd6b0f0,0x9adbe7,0xe4ce90][i],.7).fillCircle(x+Math.cos(a)*17,y+Math.sin(a)*10,1.8);}return;
    }
    if(kind==='arcane'){
      fx.fillStyle(color,.05+(Math.sin(phase)+1)*.025).fillCircle(x,y,12);
      fx.lineStyle(1,0xd3b4ef,.5).strokeEllipse(x,y+6,12,5);return;
    }
    if(kind==='frost')fx.fillStyle(0xd0faff,.65).fillCircle(x+Math.sin(phase*.7)*8,y-5,1.5);
  }
  getSnapshot() {
    const pose = (image: Phaser.GameObjects.Image) => ({ x: image.x, y: image.y, scaleX: image.scaleX, scaleY: image.scaleY, rotation: image.rotation, alpha: image.alpha });
    return { fps: ANIMATION_FPS, poseTick: this.poseTick, presentationTime: this.presentationTime, time: this.clock, reduced: this.reduced, deaths: this.deaths, particles: this.particles.length, ghosts: this.ghosts.length,
      towers: [...this.towers].map(([id, v]) => ({ id, state: v.state, fireSequence: v.fireSequence, level: v.level, textureKey:v.image.texture.key, frameName:v.image.frame.name, displayWidth:v.image.displayWidth, displayHeight:v.image.displayHeight, originX:v.image.originX,originY:v.image.originY,...pose(v.image) })),
      enemies: [...this.enemies].map(([id, v]) => ({ id, state: v.state, hitSequence: v.hitSequence, kind: v.enemy.kind, visualKind:v.visualKind, walkFrame: v.walkFrame, walkPhase: v.walkPhase, textureKey: v.image.texture.key, frameName: v.image.frame.name, ...pose(v.image) })),
      troops:[...this.troops].map(([id,v])=>({id,state:v.state,walkFrame:v.walkFrame,...pose(v.image)})) };
  }
  destroy(): void { this.clear(); this.shadows.destroy(); this.effects.destroy(); }
}
