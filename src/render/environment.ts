import Phaser from 'phaser';
import { FLOW_ANCHORS, ENVIRONMENT_FPS, ENVIRONMENT_LOOP_SECONDS, sampleEnvironment, type EnvironmentKind } from './environment-motion';

/** Scenery lives below units and foundations. Local feathered texture movement never moves terrain. */
export class EnvironmentViews {
  private readonly paint: Phaser.GameObjects.Graphics;
  private images: Phaser.GameObjects.Image[]=[];
  private textureKeys:string[]=[];
  private level:EnvironmentKind|null=null;
  private snapshot:ReturnType<typeof sampleEnvironment>|null=null;
  private reduced=false;
  constructor(private readonly scene:Phaser.Scene){this.paint=scene.add.graphics().setDepth(.2);}
  private clearTextures(){
    for(const image of this.images)image.destroy();this.images=[];
    for(const key of this.textureKeys)this.scene.textures.remove(key);this.textureKeys=[];
  }
  private prepare(kind:EnvironmentKind){
    this.clearTextures();this.level=kind;
    const source=this.scene.textures.get(`level-${kind}`).getSourceImage() as HTMLImageElement;
    const sourceWidth=source.naturalWidth||source.width,sourceHeight=source.naturalHeight||source.height;
    FLOW_ANCHORS[kind].forEach((anchor,index)=>{
      const key=`environment-flow-${kind}-${index}`,width=64,height=Math.round(Math.min(256,64*anchor.height/anchor.width));
      const texture=this.scene.textures.createCanvas(key,width,height);
      if(!texture)return;
      const context=texture.getContext();
      const left=(anchor.x-anchor.width/2)/1100*sourceWidth,top=(anchor.y-anchor.height/2)/680*sourceHeight;
      context.drawImage(source,left,top,anchor.width/1100*sourceWidth,anchor.height/680*sourceHeight,0,0,width,height);
      // Both axes fade to transparent, so moving the crop cannot expose a rectangular edge.
      context.globalCompositeOperation='destination-in';
      const horizontal=context.createLinearGradient(0,0,width,0);
      horizontal.addColorStop(0,'transparent');horizontal.addColorStop(.3,'white');horizontal.addColorStop(.7,'white');horizontal.addColorStop(1,'transparent');
      context.fillStyle=horizontal;context.fillRect(0,0,width,height);
      const vertical=context.createLinearGradient(0,0,0,height);
      vertical.addColorStop(0,'transparent');vertical.addColorStop(.2,'white');vertical.addColorStop(.8,'white');vertical.addColorStop(1,'transparent');
      context.fillStyle=vertical;context.fillRect(0,0,width,height);context.globalCompositeOperation='source-over';texture.refresh();
      this.textureKeys.push(key);this.images[index]=this.scene.add.image(anchor.x,anchor.y,key).setDepth(.1);
    });
  }
  sync(level:{id:string;mapKey:string},time:number,reduced=false,worldHeight=680):void {
    const kind=(level.mapKey in FLOW_ANCHORS?level.mapKey:'eldervale') as EnvironmentKind;
    if(kind!==this.level)this.prepare(kind);
    this.reduced=reduced;this.snapshot=sampleEnvironment(kind,time,worldHeight,reduced);
    const g=this.paint.clear();
    for(const item of this.snapshot.items){
      if(item.shape==='texture'){
        const image=this.images[Number(item.id.split('-')[1])];
        image?.setPosition(item.x,item.y).setDisplaySize(item.width,item.height).setAlpha(item.alpha).setVisible(!reduced);
        continue;
      }
      if(item.alpha<=.001)continue;
      const {x,y,width:w,height:h,alpha:a,color:c}=item;
      switch(item.shape){
        case 'flow':
          g.lineStyle(w+2,c,a*.17).lineBetween(x,y-h*.5,x-.7,y+h*.5);
          g.lineStyle(w,c,a).lineBetween(x,y-h*.5,x-.7,y+h*.5);
          break;
        case 'ripple':g.lineStyle(.8,c,a).strokeEllipse(x,y,w,h);break;
        case 'mote':g.fillStyle(c,a*.11).fillCircle(x,y,w*3);g.fillStyle(c,a).fillCircle(x,y,w);break;
        case 'mist':
          g.fillStyle(c,a*.2).fillEllipse(x,y,w*1.25,h*1.5);
          g.fillStyle(c,a).fillEllipse(x,y,w,h);
          break;
        case 'glint':
          g.fillStyle(c,a*.09).fillCircle(x,y,h*1.5);
          g.lineStyle(1,c,a).lineBetween(x-w,y,x+w,y).lineBetween(x,y-h*.5,x,y+h*.5);
          g.fillStyle(0xf5fbff,a*.8).fillCircle(x,y,1.1);
          break;
        case 'flame':
          g.fillStyle(c,a*.1).fillCircle(x,y,w*3.2);
          g.fillStyle(0xff9a3d,a).fillTriangle(x-w,y+h*.4,x+Math.sin(item.angle)*2,y-h*.6,x+w,y+h*.4);
          g.fillStyle(0xffecad,a).fillEllipse(x,y+h*.14,w*.8,h*.65);
          break;
        case 'reed':{
          const sway=Math.sin(item.angle)*h;
          g.lineStyle(1,c,a).lineBetween(x,y,x+sway,y-h).lineBetween(x-3,y,x-4+sway*.65,y-h*.72).lineBetween(x+3,y,x+5+sway*.8,y-h*.85);
          g.lineStyle(2,0xb2ac6b,a*.75).lineBetween(x+sway,y-h,x+sway*.8,y-h*.8);
          break;
        }
      }
    }
  }
  getSnapshot(){
    return this.snapshot?{
      levelId:this.level,fps:ENVIRONMENT_FPS,loopSeconds:ENVIRONMENT_LOOP_SECONDS,
      phase:this.snapshot.phase,frame:this.snapshot.frame,blend:this.snapshot.blend,reduced:this.reduced,
      imageCount:this.images.filter(Boolean).length,textureCount:this.textureKeys.length,
      items:this.snapshot.items.map(item=>({...item})),
    }:null;
  }
  destroy(){this.clearTextures();this.paint.destroy();}
}
