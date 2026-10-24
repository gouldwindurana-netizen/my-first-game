import Phaser from 'phaser';
import mapUrl from '../assets/eldervale.webp?url';
import { GameModel, PADS, PATH, TOWER_DEFS, type TowerKind } from '../game/model';
import { drawForest, drawTower } from './forest';

export interface SceneBridge {
 model: GameModel;
 selectedPad: number | null;
 selectedKind: string | null;
 meteorArmed: boolean;
 tactical: boolean;
 reduceMotion: boolean;
 onPad: (id:number)=>void;
 onGround: (x:number,y:number)=>void;
 onTick: ()=>void;
}
export class GroveScene extends Phaser.Scene {
 private paint!: Phaser.GameObjects.Graphics;
 private labels: Phaser.GameObjects.Text[]=[];
 private floatLabels = new Map<number, Phaser.GameObjects.Text>();
 private lastHudTime = 0;
 private hover: {x:number,y:number}|null=null;
 constructor(private bridge: SceneBridge) {super('grove');}
 preload(){this.load.image('eldervale',mapUrl);}
 create() {
  if(this.textures.exists('eldervale')){
   this.add.image(0,0,'eldervale').setOrigin(0).setDisplaySize(1100,680).setDepth(-1);
  }else{
   drawForest(this);
   const terrain = [...this.children.list] as Phaser.GameObjects.Graphics[];
   terrain.sort((a,b)=>a.depth-b.depth);
   const map = this.add.renderTexture(0,0,1100,680).setOrigin(0,0).setDepth(-1);
   map.draw(terrain);
   terrain.forEach(object=>object.destroy());
  }
  document.getElementById('battlefield')?.setAttribute('data-ready','true');
  this.paint=this.add.graphics().setDepth(5);
  this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{this.hover={x:p.x,y:p.y};});
  this.input.on('gameout',()=>{this.hover=null;});
  this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{
   if(this.bridge.meteorArmed){this.bridge.onGround(p.x,p.y);return;}
   const pad=PADS.find(t=>Phaser.Math.Distance.Between(t.x,t.y,p.x,p.y)<39);
   if(pad)this.bridge.onPad(pad.id);
   else this.bridge.onGround(p.x,p.y);
  });
  this.labels=PADS.map(p=>this.add.text(p.x,p.y+1,'+', {fontFamily:'Georgia',fontSize:'23px',color:'#f2d49a',stroke:'#152330',strokeThickness:3}).setOrigin(.5).setDepth(7));
 }
 update(time:number,delta:number) {
  const m=this.bridge.model;
  m.update(delta/1000);
  if(time-this.lastHudTime>80){this.bridge.onTick();this.lastHudTime=time;}
  const g=this.paint;g.clear();
  const visualTime=this.bridge.reduceMotion?0:m.time*1000;
  if(this.bridge.tactical){
   g.lineStyle(3,0xf8de9e,.75);g.strokePoints(PATH,false);
   for(const tower of m.towers){const pad=PADS.find(p=>p.id===tower.padId)!;g.fillStyle(TOWER_DEFS[tower.kind].color,.05);g.fillCircle(pad.x,pad.y,m.getTowerStats(tower).range);g.lineStyle(1,TOWER_DEFS[tower.kind].color,.5);g.strokeCircle(pad.x,pad.y,m.getTowerStats(tower).range);}
  }
  if(this.bridge.selectedKind&&this.hover){const pad=PADS.find(p=>Phaser.Math.Distance.Between(p.x,p.y,this.hover!.x,this.hover!.y)<39);if(pad&&!m.towers.some(t=>t.padId===pad.id)){const def=TOWER_DEFS[this.bridge.selectedKind as TowerKind];g.fillStyle(def.color,.07);g.fillCircle(pad.x,pad.y,def.range);g.lineStyle(1.5,def.color,.65);g.strokeCircle(pad.x,pad.y,def.range);}}

  const selected=m.towers.find(t=>t.padId===this.bridge.selectedPad);
  if(selected) {
   const pad=PADS.find(p=>p.id===selected.padId)!;
   const r=m.getTowerStats(selected).range;
   g.fillStyle(0xa4c184,.055);g.fillCircle(pad.x,pad.y,r);
   g.lineStyle(1.2,0xc6daa4,.35);g.strokeCircle(pad.x,pad.y,r);
  }
  for(const pad of PADS) {
   const tower=m.towers.find(t=>t.padId===pad.id);
   this.labels[pad.id]?.setVisible(!tower);
   const hover=this.hover&&Phaser.Math.Distance.Between(pad.x,pad.y,this.hover.x,this.hover.y)<39;
   const active=pad.id===this.bridge.selectedPad;
   if(!tower) {
    g.fillStyle(0x102b3b,hover||active?.22:.06);g.fillEllipse(pad.x,pad.y+2,65,37);
    g.lineStyle(active||hover?2:1.2,active||hover?0xf6d38c:0xa1d0de,active||hover?.95:.45);g.strokeEllipse(pad.x,pad.y+1,65,37);
    if(active||hover){g.lineStyle(1,0xf6d38c,.35);g.strokeEllipse(pad.x,pad.y+1,73,44);}

   } else {
    if(active){g.lineStyle(2,0xe0c788,.9);g.strokeEllipse(pad.x,pad.y+8,70,38);}
    drawTower(g,pad.x,pad.y,tower.kind,tower.level,visualTime/1000);
    for(let i=0;i<tower.level;i++){g.fillStyle(0xe9cc88);g.fillCircle(pad.x-((tower.level-1)*5)+i*10,pad.y+30,2.8);}
   }
  }
  // Enemies are depth-sorted for a grounded, miniature-world look.
  for(const e of [...m.enemies].sort((a,b)=>a.y-b.y)) {
   const bob=Math.sin(visualTime/95+e.id)*2;
   const boss=e.kind==='boss', brute=e.kind==='brute';
   const r=boss?19:brute?14:e.kind==='runner'?9:11;
   const icy=e.slowUntil>m.time;
   g.fillStyle(0x08140f,.32);g.fillEllipse(e.x,e.y+7,r*2.3,r);
   g.lineStyle(brute?5:3,0x273c33);g.lineBetween(e.x-5,e.y,e.x-6,e.y+10+bob);g.lineBetween(e.x+5,e.y,e.x+7,e.y+10-bob);
   g.fillStyle(icy?0x87c6c4:boss?0x9a6585:brute?0x65766a:e.kind==='runner'?0xb38a69:0x89906b);
   g.fillEllipse(e.x,e.y-5+bob,r*1.8,r*2);
   g.fillStyle(icy?0xb2ebe2:boss?0xcba0a4:0xb4b08b);g.fillCircle(e.x,e.y-r+1+bob,r*.68);
   // Hood, ears, malicious amber eyes.
   g.fillStyle(boss?0x744d6e:brute?0x41594c:0x536647);g.fillTriangle(e.x-r,e.y-r+2+bob,e.x-r*.6,e.y-r*2+bob,e.x,e.y-r+2+bob);
   g.fillTriangle(e.x+r,e.y-r+2+bob,e.x+r*.6,e.y-r*2+bob,e.x,e.y-r+2+bob);
   g.fillStyle(0x27352d);g.fillRoundedRect(e.x-r*.55,e.y-r-2+bob,r*1.1,7,3);
   g.fillStyle(0xf7d383);g.fillCircle(e.x-3,e.y-r+1+bob,1.5);g.fillCircle(e.x+3,e.y-r+1+bob,1.5);
   if(brute||boss) {g.lineStyle(3,boss?0xcbad72:0x9a9d8a);g.strokeEllipse(e.x,e.y-4+bob,r*1.6,r*1.1);}
   if(boss){g.fillStyle(0xdbc17a);g.fillTriangle(e.x-10,e.y-28,e.x-8,e.y-39,e.x-1,e.y-27);g.fillTriangle(e.x+10,e.y-28,e.x+8,e.y-39,e.x+1,e.y-27);}
   const bar=r*2.3;g.fillStyle(0x15261e,.95);g.fillRoundedRect(e.x-bar/2,e.y-r*2-10,bar,4,2);g.fillStyle(icy?0x96dadd:0xc5b66e);g.fillRoundedRect(e.x-bar/2,e.y-r*2-10,bar*Math.max(0,e.hp/e.maxHp),4,2);
  }
  for(const shot of m.shots) {
   if(shot.kind==='arcane'){
    const points=Array.from({length:7},(_,i)=>{const t=i/6,jitter=i===0||i===6?0:Math.sin(shot.id*13+i*7)*8;return{x:Phaser.Math.Linear(shot.from.x,shot.to.x,t)+jitter,y:Phaser.Math.Linear(shot.from.y-16,shot.to.y-8,t)-jitter};});
    const alpha=shot.life/shot.maxLife;
    g.lineStyle(7,0x9c58ef,alpha*.28);g.strokePoints(points,false);g.lineStyle(2,0xe7baff,alpha);g.strokePoints(points,false);g.fillStyle(0xeed5ff,alpha*.45);g.fillCircle(shot.to.x,shot.to.y-8,8);
    continue;
   }
   const p=1-shot.life/shot.maxLife;
   const x=Phaser.Math.Linear(shot.from.x,shot.to.x,p),y=Phaser.Math.Linear(shot.from.y-24,shot.to.y,p)-Math.sin(p*Math.PI)*(shot.kind==='cannon'?55:15);
   const c=shot.kind==='frost'?0xabe4dc:shot.kind==='cannon'?0xe9b26e:0xe7dbae;
   g.lineStyle(shot.kind==='cannon'?4:2,c,.8);g.lineBetween(x,y,x-(shot.to.x-shot.from.x)*.05,y-(shot.to.y-shot.from.y)*.05);g.fillStyle(c);g.fillCircle(x,y,shot.kind==='cannon'?4:2.5);
   if(p>.75){g.lineStyle(2,c,(1-p)*3);g.strokeCircle(shot.to.x,shot.to.y,shot.kind==='cannon'?(p-.75)*150:12*p);}
  }
  if(this.bridge.meteorArmed&&this.hover) {
   g.fillStyle(0xe7a965,.12);g.fillCircle(this.hover.x,this.hover.y,120);g.lineStyle(2,0xf3c480,.8);g.strokeCircle(this.hover.x,this.hover.y,120);g.lineBetween(this.hover.x-12,this.hover.y,this.hover.x+12,this.hover.y);g.lineBetween(this.hover.x,this.hover.y-12,this.hover.x,this.hover.y+12);
  }
  const activeFloats = new Set(m.floats.map(f=>f.id));
  for(const [id,label] of this.floatLabels){if(!activeFloats.has(id)){label.destroy();this.floatLabels.delete(id);}}
  for(const f of m.floats){
   if(f.text==='STARFALL'){
    const progress=1-f.life/1.1;
    g.fillStyle(0xffcd7c,.18*(1-progress));g.fillCircle(f.x,f.y+20,120);
    g.lineStyle(4,0xffdf9f,1-progress);g.strokeCircle(f.x,f.y+20,120*progress);
    g.fillStyle(0xffebc3,Math.max(0,1-progress*3));g.fillCircle(f.x,f.y+20,50*progress);
   }
   let label=this.floatLabels.get(f.id);
   if(!label){label=this.add.text(f.x,f.y,f.text,{fontFamily:'DM Sans',fontSize:f.text==='STARFALL'?'16px':'13px',fontStyle:'bold',color:f.color,stroke:'#1a3529',strokeThickness:3}).setOrigin(.5).setDepth(15);this.floatLabels.set(f.id,label);}
   label.setPosition(f.x,f.y).setAlpha(Math.min(1,f.life*2));
  }
  // A low-cost shimmer follows the painted waterfalls without hiding the road.
  if(!this.bridge.reduceMotion){for(const [x,y] of [[54,310],[403,524],[697,548],[806,462]]){for(let i=0;i<5;i++){const v=(m.time*30+i*17)%70;g.lineStyle(1,0xc4f2fc,.15*(1-v/70));g.lineBetween(x+i*4,y+v,x+i*4-1,y+v+9);}}}
  // Fireflies animate the margins without obscuring the action.
  for(let i=0;i<22;i++){
   const x=(i*177.13+Math.sin(visualTime/2600+i)*18)%1100,y=(i*91.7+Math.cos(visualTime/3200+i)*16)%680;
   g.fillStyle(0xe9d895,.13+Math.max(0,Math.sin(visualTime/1300+i))*.4);g.fillCircle(x,y,1.4);
  }
 }
}
