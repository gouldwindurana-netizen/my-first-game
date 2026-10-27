import Phaser from 'phaser';
import { LEVEL_ART } from '../level-art';
import { GameModel, TOWER_DEFS, ENEMY_DEFS, type TowerKind } from '../game/model';
import { preloadAssetSheets, prepareAssetFrames, AssetViews } from './asset-views';
import { EnvironmentViews } from './environment';

export interface SceneBridge {
 model: GameModel;
 selectedPad: number | null;
 selectedKind: string | null;
 meteorArmed: boolean;
 trapArmed?: boolean;
 rallyTowerId?: number | null;
 tactical: boolean;
 reduceMotion: boolean;
 onPad: (id:number)=>void;
 onGround: (x:number,y:number)=>void;
 onTick: ()=>void;
}
export class GroveScene extends Phaser.Scene {
 private paint!: Phaser.GameObjects.Graphics;
 private assetViews!: AssetViews;
 private environmentViews!: EnvironmentViews;
 private mapImage!: Phaser.GameObjects.Image;
 private currentMap='';
 private floatLabels = new Map<number, Phaser.GameObjects.Text>();
 private lastHudTime = 0;
 private hover: {x:number,y:number}|null=null;
 private viewZoom=1;
 private center={x:550,y:260};
 private animationTime=0;
 private presentationTime=0;
 private lastModelTime=0;
 private drag: {startX:number,startY:number,lastX:number,lastY:number,moved:boolean}|null=null;
 constructor(private bridge: SceneBridge) {super('grove');}
 private get canPan(){return this.viewZoom>1;}
 private get viewScale(){
  const {width,height}=this.bridge.model.level.world;
  // Odd camera dimensions can shift the projection by half a backing pixel.
  // Keep a pixel at each edge so the default fit never trims the artwork.
  return Math.min(Math.max(1,this.scale.gameSize.width-2)/width,Math.max(1,this.scale.gameSize.height-2)/height);
 }
 private get renderScale(){return this.scale.gameSize.width/1100;}
 preload(){for(const [key,url] of Object.entries(LEVEL_ART))this.load.image(`level-${key}`,url);preloadAssetSheets(this);}
 create(){
  const {width,height}=this.bridge.model.level.world;
  this.mapImage=this.add.image(0,0,`level-${this.bridge.model.level.mapKey}`).setOrigin(0).setDisplaySize(width,height).setDepth(-1);
  this.currentMap=this.bridge.model.level.mapKey;
  prepareAssetFrames(this);
  this.assetViews=new AssetViews(this);
  this.environmentViews=new EnvironmentViews(this);
  this.paint=this.add.graphics().setDepth(7);
  this.applyView();
  this.scale.on(Phaser.Scale.Events.RESIZE,this.applyView,this);
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.scale.off(Phaser.Scale.Events.RESIZE,this.applyView,this);this.assetViews.destroy();this.environmentViews.destroy();});
  this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{
   this.drag={startX:p.x,startY:p.y,lastX:p.x,lastY:p.y,moved:false};
   this.hover=this.cameras.main.getWorldPoint(p.x,p.y);
  });
  this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{
   const drag=this.drag;
   if(drag&&p.isDown&&this.canPan){
    const cssScale=this.game.canvas.getBoundingClientRect().width/this.scale.gameSize.width;
    if(Math.hypot(p.x-drag.startX,p.y-drag.startY)*cssScale>6)drag.moved=true;
    if(drag.moved){
     const camera=this.cameras.main;
     camera.setScroll(camera.scrollX-(p.x-drag.lastX)/camera.zoom,camera.scrollY-(p.y-drag.lastY)/camera.zoom);
     camera.preRender();this.center={x:camera.midPoint.x,y:camera.midPoint.y};
    }
    drag.lastX=p.x;drag.lastY=p.y;
   }
   this.hover=this.cameras.main.getWorldPoint(p.x,p.y);
  });
  this.input.on('pointerup',(p:Phaser.Input.Pointer)=>{
   const moved=this.drag?.moved;
   const hadDown=!!this.drag;
   this.drag=null;
   if(moved||!hadDown)return;
   const point=this.cameras.main.getWorldPoint(p.x,p.y);
   if(this.bridge.meteorArmed||this.bridge.trapArmed||this.bridge.rallyTowerId!=null){this.bridge.onGround(point.x,point.y);return;}
   const trap=this.bridge.model.towers.find(t=>t.kind==='trap'&&Math.hypot(this.bridge.model.getTowerPosition(t).x-point.x,this.bridge.model.getTowerPosition(t).y-point.y)<25);
   if(trap){this.bridge.onPad(trap.padId);return;}
   const pad=this.bridge.model.pads.find(t=>Phaser.Math.Distance.Between(t.x,t.y,point.x,point.y)<39);
   if(pad)this.bridge.onPad(pad.id);else this.bridge.onGround(point.x,point.y);
  });
  this.input.on('gameout',()=>{this.hover=null;this.drag=null;});
  this.input.on('pointerupoutside',()=>{this.drag=null;});
  document.getElementById('battlefield')?.setAttribute('data-ready','true');
 }
 private applyView(){
  if(!this.cameras?.main)return;
  const camera=this.cameras.main;
  const {width,height}=this.bridge.model.level.world;
  camera.setViewport(0,0,this.scale.gameSize.width,this.scale.gameSize.height);
  const zoom=this.viewScale*this.viewZoom;
  const marginX=Math.max(0,(this.scale.gameSize.width/zoom-width)/2),marginY=Math.max(0,(this.scale.gameSize.height/zoom-height)/2);
  camera.setZoom(zoom).setBounds(-marginX,-marginY,width+marginX*2,height+marginY*2).centerOn(this.center.x,this.center.y);
  camera.preRender();
  for(const label of this.floatLabels.values())label.setResolution(this.renderScale);
 }
 setViewZoom(value:number):number{
  if(!Number.isFinite(value))return this.viewZoom;
  this.viewZoom=Phaser.Math.Clamp(value,1,2.5);this.drag=null;this.applyView();return this.viewZoom;
 }
 changeViewZoom(delta:number):number{return this.setViewZoom(this.viewZoom+delta);}
 resetView():void{this.viewZoom=1;this.center={...this.bridge.model.level.camera};this.drag=null;this.applyView();}
 focusSite(padId:number):void{const tower=this.bridge.model.towers.find(t=>t.padId===padId),pad=tower?this.bridge.model.getTowerPosition(tower):this.bridge.model.pads.find(p=>p.id===padId);if(pad&&this.canPan){this.center={x:pad.x,y:pad.y};this.applyView();}}
 getView(){
  const camera=this.cameras.main;camera.preRender();
  // Expose the visible top-left world position, not Phaser's unzoomed scroll offset.
  const topLeft=camera.getWorldPoint(0,0);
  const {width,height}=this.bridge.model.level.world;
  const source=this.mapImage.texture.getSourceImage() as HTMLImageElement;
  return{mapKey:this.mapImage.texture.key.replace(/^level-/,''),zoom:this.viewZoom,renderScale:this.viewScale,backingScale:this.renderScale,scrollX:topLeft.x,scrollY:topLeft.y,worldWidth:width,worldHeight:height,sourceWidth:source.width,sourceHeight:source.height,visibleWidth:camera.displayWidth,visibleHeight:camera.displayHeight,canPan:this.canPan};
 }
 resetLevel():void{
  if(!this.mapImage)return;
  const level=this.bridge.model.level;this.currentMap=level.mapKey;
  this.mapImage.setTexture(`level-${level.mapKey}`).setDisplaySize(level.world.width,level.world.height).setName(`level-map-${level.mapKey}`);
  this.assetViews.reset();this.animationTime=0;this.presentationTime=0;this.lastModelTime=0;this.hover=null;this.drag=null;
  for(const label of this.floatLabels.values())label.destroy();this.floatLabels.clear();
  this.resetView();
 }
 getAnimationSnapshot(){const units=this.assetViews?.getSnapshot();return units?{...units,environment:this.environmentViews?.getSnapshot()||null}:null;}
 update(time:number,delta:number) {
  const m=this.bridge.model;
  if(this.currentMap!==m.level.mapKey)this.resetLevel();
  if(m.time<this.lastModelTime){this.animationTime=0;this.presentationTime=0;}
  const before=m.time;
  m.update(delta/1000);
  if(!m.paused){this.animationTime+=m.status==='won'||m.status==='lost'?Math.min(delta/1000,.1)*m.speed:m.time-before;this.presentationTime+=Math.min(delta/1000,.1);}
  this.lastModelTime=m.time;
  if(time-this.lastHudTime>80){this.bridge.onTick();this.lastHudTime=time;}
  const g=this.paint;g.clear();
  this.environmentViews.sync(m.level,this.presentationTime,this.bridge.reduceMotion,m.level.world.height);
  this.assetViews.sync(m,this.animationTime,this.bridge.reduceMotion,this.presentationTime);
  const cursor=this.bridge.meteorArmed||this.bridge.trapArmed||this.bridge.rallyTowerId!=null?'crosshair':this.canPan?(this.drag?.moved?'grabbing':'grab'):'default';
  this.game.canvas.style.cursor=cursor;
  for(const zone of m.zones){const color=TOWER_DEFS[zone.kind].color;g.fillStyle(color,.07).fillCircle(zone.x,zone.y,zone.radius);g.lineStyle(1.2,color,.36).strokeCircle(zone.x,zone.y,zone.radius);}
  if(this.bridge.tactical){
   g.lineStyle(3,0xf8de9e,.75);g.strokePoints(m.path,false);
   for(const tower of m.towers){const pad=m.getTowerPosition(tower);g.fillStyle(TOWER_DEFS[tower.kind].color,.05);g.fillCircle(pad.x,pad.y,m.getTowerStats(tower).range);g.lineStyle(1,TOWER_DEFS[tower.kind].color,.5);g.strokeCircle(pad.x,pad.y,m.getTowerStats(tower).range);}
   for(const tree of m.level.trees){g.fillStyle(0x88ad73,.12).fillCircle(tree.x,tree.y,tree.radius);g.lineStyle(1.4,0xb0ce8b,.7).strokeCircle(tree.x,tree.y,tree.radius);}
  }
  if(this.bridge.selectedKind&&this.hover&&!this.bridge.trapArmed){const pad=this.bridge.model.pads.find(p=>Phaser.Math.Distance.Between(p.x,p.y,this.hover!.x,this.hover!.y)<39);if(pad&&!m.towers.some(t=>t.padId===pad.id)){const def=TOWER_DEFS[this.bridge.selectedKind as TowerKind];g.fillStyle(def.color,.07);g.fillCircle(pad.x,pad.y,def.range);g.lineStyle(1.5,def.color,.65);g.strokeCircle(pad.x,pad.y,def.range);}}

  const selected=m.towers.find(t=>t.padId===this.bridge.selectedPad);
  if(selected) {
   const pad=m.getTowerPosition(selected);
   const r=m.getTowerStats(selected).range;
   g.fillStyle(0xa4c184,.055);g.fillCircle(pad.x,pad.y,r);
   g.lineStyle(1.2,0xc6daa4,.35);g.strokeCircle(pad.x,pad.y,r);
   if(selected.kind==='barracks'&&selected.rally){const rally=selected.rally;g.lineStyle(1.3,0x9fd5ff,.7).lineBetween(pad.x,pad.y,rally.x,rally.y).strokeEllipse(rally.x,rally.y,30,12);g.lineStyle(2,0xade5ff,.9).lineBetween(rally.x,rally.y,rally.x,rally.y-25);g.fillStyle(0x418cc7,.95).fillTriangle(rally.x,rally.y-25,rally.x+13,rally.y-21,rally.x,rally.y-16);}
  }
  for(const pad of m.pads) {
   const tower=m.towers.find(t=>t.padId===pad.id);
   const hover=this.hover&&Phaser.Math.Distance.Between(pad.x,pad.y,this.hover.x,this.hover.y)<39;
   const active=pad.id===this.bridge.selectedPad;
   if(!tower) {
    g.fillStyle(0x102b3b,hover||active?.22:.06);g.fillEllipse(pad.x,pad.y+2,65,37);
    g.lineStyle(active||hover?2:1.2,active||hover?0xf6d38c:0xa1d0de,active||hover?.95:.45);g.strokeEllipse(pad.x,pad.y+1,65,37);
    if(active||hover){g.lineStyle(1,0xf6d38c,.35);g.strokeEllipse(pad.x,pad.y+1,73,44);}

   } else {
    if(active){g.lineStyle(2,0xe0c788,.9);g.strokeEllipse(pad.x,pad.y+8,70,38);}

    for(let i=0;i<tower.level;i++){g.fillStyle(0xe9cc88);g.fillCircle(pad.x-((tower.level-1)*5)+i*10,pad.y+30,2.8);}
   }
  }
  // The supplied sprite bodies are separate images; health and spell effects stay above them.
  for(const e of m.enemies){
   const visual=ENEMY_DEFS[e.kind].visual,height={grunt:36,runner:34,brute:48,boss:70}[visual]*(e.miniBoss?1.18:1);
   const width=visual==='boss'?40:visual==='brute'?32:25;
   const y=e.y-height-4-(ENEMY_DEFS[e.kind].flying?17:0);
   g.fillStyle(0x10202b,.95);g.fillRoundedRect(e.x-width/2,y,width,5,2);
   g.fillStyle((e.poisonUntil??0)>m.time?0xb6df7e:e.slowUntil>m.time?0x9be8fb:0xe3c384);g.fillRoundedRect(e.x-width/2,y,width*Math.max(0,e.hp/e.maxHp),5,2);
  }
  // Role-specific projectiles leave the measured weapon outlet of the dedicated sprite.
  for(const shot of m.shots){
   const from=this.assetViews.getShotOrigin(shot.from),to={x:shot.to.x,y:shot.to.y-8};
   const p=Phaser.Math.Clamp(1-shot.life/shot.maxLife,0,1),alpha=1-p,c=TOWER_DEFS[shot.kind].color;
   const dx=to.x-from.x,dy=to.y-from.y,length=Math.max(1,Math.hypot(dx,dy)),ux=dx/length,uy=dy/length;
   if(shot.kind==='tesla'){
    const points=Array.from({length:7},(_,i)=>{const t=i/6,j=i===0||i===6?0:Math.sin(shot.id*13+i*7)*7;return{x:Phaser.Math.Linear(from.x,to.x,t)+j,y:Phaser.Math.Linear(from.y,to.y,t)-j};});
    g.lineStyle(6,0x75bff1,alpha*.25).strokePoints(points,false);g.lineStyle(1.8,0xe0f6ff,alpha).strokePoints(points,false);g.fillStyle(0xb9eaff,alpha*.6).fillCircle(to.x,to.y,5);continue;
   }
   if(shot.kind==='prism'){
    for(const[offset,color]of[[-2,0xf2d18e],[0,0xf7fff0],[2,0x9adbec]] as const)g.lineStyle(offset===0?2:1,color,alpha*(offset===0?.95:.55)).lineBetween(from.x-uy*offset,from.y+ux*offset,to.x-uy*offset,to.y+ux*offset);
    g.lineStyle(1,0xf6ffe4,alpha).lineBetween(to.x-8,to.y,to.x+8,to.y).lineBetween(to.x,to.y-8,to.x,to.y+8);continue;
   }
   if(shot.kind==='truesight'){
    g.lineStyle(3,0xddebc2,alpha*.2).lineBetween(from.x,from.y,to.x,to.y);g.lineStyle(1.3,0xf1f5d3,alpha).lineBetween(from.x,from.y,to.x,to.y);
    g.lineStyle(1.2,0xe7efc3,alpha).strokeEllipse(to.x,to.y,18,9);g.fillStyle(0xf5f9dc,alpha).fillCircle(to.x,to.y,2.5);continue;
   }
   if(shot.kind==='void'){
    const radius=5+alpha*25;g.fillStyle(0x100f2b,alpha*.55).fillCircle(to.x,to.y,radius*.7);g.lineStyle(2,0xbd9cde,alpha*.7).strokeEllipse(to.x,to.y,radius,radius*1.25);
    for(let i=0;i<4;i++){const a=shot.id+i*Math.PI/2;g.lineStyle(1.2,0xc0a2e4,alpha*.7).lineBetween(to.x+Math.cos(a)*radius,to.y+Math.sin(a)*radius,to.x+Math.cos(a)*radius*.4,to.y+Math.sin(a)*radius*.4);}continue;
   }
   if(shot.kind==='chrono'){
    g.lineStyle(1,0xbbbfae,alpha*.35).lineBetween(from.x,from.y,to.x,to.y);
    const r=10+p*18;g.lineStyle(1.5,0xe7d7a5,alpha).strokeCircle(to.x,to.y,r).lineBetween(to.x,to.y,to.x+Math.cos(p*5)*r*.6,to.y+Math.sin(p*5)*r*.6);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;g.lineStyle(1,0xb7dfd6,alpha*.7).lineBetween(to.x+Math.cos(a)*(r-3),to.y+Math.sin(a)*(r-3),to.x+Math.cos(a)*r,to.y+Math.sin(a)*r);}continue;
   }
   if(shot.kind==='trap'){
    g.lineStyle(2,0xe5c994,alpha).strokeEllipse(to.x,to.y,15+p*26,7+p*13);
    for(let i=0;i<4;i++){const x=to.x-15+i*10;g.fillStyle(0xdde5de,alpha).fillTriangle(x-3,to.y+4,x,to.y-10*alpha,x+3,to.y+4);}continue;
   }
   if(shot.kind==='barracks'){
    g.lineStyle(2,0xf2e3bc,alpha).lineBetween(to.x-8,to.y-8,to.x+8,to.y+5).lineBetween(to.x+8,to.y-8,to.x-8,to.y+5);continue;
   }
   if(shot.kind==='sonic'){
    const x=Phaser.Math.Linear(from.x,to.x,p),y=Phaser.Math.Linear(from.y,to.y,p);
    for(let i=0;i<3;i++)g.lineStyle(1.6,0xd8bce2,(1-i*.23)*.75).strokeEllipse(x-ux*i*9,y-uy*i*9,10+i*3,7+i*2);continue;
   }
   const arc=shot.kind==='mortar'?145:shot.kind==='cannon'?32:shot.kind==='venom'?32:shot.kind==='earth'?48:shot.kind==='arcane'?15:10;
   const x=Phaser.Math.Linear(from.x,to.x,p),y=Phaser.Math.Linear(from.y,to.y,p)-Math.sin(p*Math.PI)*arc;
   if(shot.kind==='archer'){
    g.lineStyle(1.8,0xc1ae7c,.95).lineBetween(x-ux*11,y-uy*11,x+ux*6,y+uy*6);g.fillStyle(0xe9e4c9,.95).fillTriangle(x+ux*9,y+uy*9,x+ux*3-uy*3,y+uy*3+ux*3,x+ux*3+uy*3,y+uy*3-ux*3);
    g.lineStyle(1.3,0xd5dccb,.8).lineBetween(x-ux*9,y-uy*9,x-ux*13-uy*3,y-uy*13+ux*3);continue;
   }
   if(shot.kind==='cannon'||shot.kind==='mortar'){
    g.lineStyle(4,0xa6a08d,.28).lineBetween(x-ux*12,y-uy*12+3,x,y);g.fillStyle(0x253d48).fillCircle(x,y,shot.kind==='mortar'?5:4);g.fillStyle(0xb5b7a1).fillCircle(x-1.3,y-1.4,1.4);
    if(shot.kind==='mortar')g.lineStyle(1.5,0xffd998,.95).lineBetween(x+2,y-4,x+4,y-9);
    if(p>.72){const impact=(p-.72)/.28,r=impact*(shot.kind==='mortar'?70:33);g.lineStyle(2,0xdbc99e,(1-impact)*.8).strokeEllipse(to.x,to.y,r,r*.65);g.fillStyle(0xe5b06a,(1-impact)*.3).fillCircle(to.x,to.y,12+impact*12);}continue;
   }
   if(shot.kind==='earth'){
    const pts=[{x:x-6,y:y-2},{x:x-3,y:y-7},{x:x+4,y:y-6},{x:x+7,y:y+1},{x:x+2,y:y+6},{x:x-5,y:y+4}];g.fillStyle(0x8d9376).fillPoints(pts,true);g.lineStyle(1,0xd4d3a8,.8).lineBetween(x-3,y-4,x+3,y-1);if(p>.7)g.lineStyle(2,0xa9ba88,(1-p)*2).strokeEllipse(to.x,to.y,(p-.7)*130,(p-.7)*65);continue;
   }
   if(shot.kind==='frost'){
    g.fillStyle(0xd8f9ff,.95).fillTriangle(x-4,y+4,x,y-7,x+4,y+4);g.lineStyle(1,0x83c9e8,.65).lineBetween(x,y+4,x,y-4);g.fillStyle(0xbfeaf3,.35).fillCircle(x-ux*8,y-uy*8,2);continue;
   }
   if(shot.kind==='venom'){
    g.fillStyle(0xaed476,.95).fillEllipse(x,y,8,10);g.fillStyle(0xdbedaf,.65).fillCircle(x-1,y-2,1.8);g.fillStyle(0x82b95b,.5).fillCircle(x-ux*9,y-uy*9,2.5);if(p>.7)g.lineStyle(1.5,0xa5d47b,(1-p)*2).strokeEllipse(to.x,to.y,9+(p-.7)*55,5+(p-.7)*23);continue;
   }
   if(shot.kind==='solar'){
    g.fillStyle(0xf28e42,.6).fillTriangle(x-uy*5,y+ux*5,x-ux*19,y-uy*19-3,x+uy*5,y-ux*5);g.fillStyle(0xffdc8d,.95).fillCircle(x,y,5);g.fillStyle(0xfff1b9,.8).fillCircle(x+1,y-1,2.5);if(p>.74)g.lineStyle(2,0xffbb6b,(1-p)*3).strokeCircle(to.x,to.y,(p-.74)*140);continue;
   }
   if(shot.kind==='nexus'){
    for(let i=0;i<3;i++){const a=p*8+i*Math.PI*2/3;g.fillStyle([0xc5a2e6,0xa0d6e8,0xe6d18f][i],.8).fillCircle(x+Math.cos(a)*8,y+Math.sin(a)*5,2);}g.fillStyle(0xf0e9ef,.95).fillCircle(x,y,4.5);if(p>.7)g.lineStyle(1.5,0xe4ccf2,(1-p)*2).strokeCircle(to.x,to.y,(p-.7)*90);continue;
   }
   // Mage attacks are deliberate runic orbs; lightning belongs exclusively to the coil.
   g.fillStyle(c,.16).fillCircle(x,y,10);g.fillStyle(0xc5a0e9,.9).fillCircle(x,y,4.5);g.fillStyle(0xf0d9ff,.95).fillCircle(x-1,y-1,1.7);g.lineStyle(1,0xcbb0ea,.6).strokeEllipse(x,y,7,4);
  }
  if(this.bridge.meteorArmed&&this.hover) {
   g.fillStyle(0xe7a965,.12);g.fillCircle(this.hover.x,this.hover.y,120);g.lineStyle(2,0xf3c480,.8);g.strokeCircle(this.hover.x,this.hover.y,120);g.lineBetween(this.hover.x-12,this.hover.y,this.hover.x+12,this.hover.y);g.lineBetween(this.hover.x,this.hover.y-12,this.hover.x,this.hover.y+12);
  }
  if(this.bridge.trapArmed&&this.hover){
   const point=this.pathPoint(this.hover.x,this.hover.y),valid=point.distance<=45;
   g.fillStyle(valid?0xd7b878:0xe88e87,.16).fillCircle(point.x,point.y,32);g.lineStyle(2,valid?0xf1d69a:0xf6a09a,.9).strokeEllipse(point.x,point.y,42,23);
   g.lineBetween(point.x-8,point.y-5,point.x+8,point.y+5).lineBetween(point.x-8,point.y+5,point.x+8,point.y-5);
  }
  if(this.bridge.rallyTowerId!=null&&this.hover){const point=this.pathPoint(this.hover.x,this.hover.y);g.lineStyle(2,0x9fdcff,.85).strokeEllipse(point.x,point.y,30,12).lineBetween(point.x,point.y,point.x,point.y-28);g.fillStyle(0x76b8e7,.8).fillTriangle(point.x,point.y-28,point.x+14,point.y-23,point.x,point.y-18);}
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
   if(!label){label=this.add.text(f.x,f.y,f.text,{fontFamily:'DM Sans',fontSize:f.text==='STARFALL'?'16px':'13px',fontStyle:'bold',color:f.color,stroke:'#1a3529',strokeThickness:3}).setResolution(this.renderScale).setOrigin(.5).setDepth(15);this.floatLabels.set(f.id,label);}
   label.setPosition(f.x,f.y).setAlpha(Math.min(1,f.life*2));
  }
 }
 private pathPoint(x:number,y:number):{x:number;y:number;distance:number}{
  let best={x,y,distance:Infinity};const path=this.bridge.model.path;
  for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy,t=length?Phaser.Math.Clamp(((x-a.x)*dx+(y-a.y)*dy)/length,0,1):0,px=a.x+dx*t,py=a.y+dy*t,distance=Math.hypot(x-px,y-py);if(distance<best.distance)best={x:px,y:py,distance};}
  return best;
 }
}
