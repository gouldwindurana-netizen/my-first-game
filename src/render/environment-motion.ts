/** Authored 24 Hz scenery tracks, interpolated at render refresh. No random state or timers. */
export const ENVIRONMENT_FPS = 24;
export const ENVIRONMENT_LOOP_SECONDS = 12;
export const ENVIRONMENT_FRAME_COUNT = ENVIRONMENT_FPS * ENVIRONMENT_LOOP_SECONDS;
export type EnvironmentKind = 'eldervale' | 'frostbound' | 'ember' | 'mirewood' | 'crystal';
export type SceneryShape = 'flow' | 'ripple' | 'mote' | 'flame' | 'mist' | 'glint' | 'reed' | 'texture';
export interface SceneryPose {
  id: string; shape: SceneryShape; x: number; y: number; width: number; height: number;
  alpha: number; angle: number; color: number;
}
interface Anchor { x: number; y: number; width: number; height: number; }
export const FLOW_ANCHORS: Record<EnvironmentKind, Anchor[]> = {
  eldervale: [
    {x:47,y:260,width:28,height:68}, {x:101,y:412,width:28,height:70},
    {x:411,y:515,width:30,height:69}, {x:698,y:548,width:26,height:76},
    {x:803,y:477,width:29,height:75}, {x:778,y:77,width:19,height:53},
  ],
  frostbound: [
    {x:190,y:384,width:26,height:119}, {x:224,y:394,width:21,height:115},
    {x:717,y:541,width:24,height:118}, {x:766,y:532,width:24,height:138},
    {x:790,y:544,width:22,height:117},
  ],
  ember: [
    {x:489,y:254,width:32,height:69}, {x:614,y:379,width:33,height:101},
    {x:326,y:604,width:20,height:70}, {x:176,y:434,width:20,height:110},
    {x:941,y:565,width:28,height:74},
  ],
  mirewood: [
    {x:345,y:80,width:19,height:65}, {x:174,y:506,width:24,height:106},
    {x:970,y:408,width:28,height:123}, {x:552,y:563,width:20,height:88},
  ],
  crystal: [
    {x:504,y:236,width:24,height:98}, {x:646,y:265,width:24,height:104},
    {x:88,y:541,width:25,height:100}, {x:425,y:562,width:25,height:102},
  ],
};
const TAU = Math.PI * 2;
const lerp = (a:number,b:number,t:number) => a + (b-a)*t;
const clamp = (v:number) => Math.min(1,Math.max(0,v));
const smooth = (v:number) => {const t=clamp(v);return t*t*(3-2*t);};
const unit = (value:number) => ((value%1)+1)%1;
function envelope(u:number):number {
  // A transparent interval on both ends hides every particle's wrap, including interpolation.
  return smooth((u-.06)/.16) * smooth((.94-u)/.16);
}
function authored(kind:EnvironmentKind, frame:number):SceneryPose[] {
  const p=frame/ENVIRONMENT_FRAME_COUNT, theta=TAU*p, result:SceneryPose[]=[];
  const add=(id:string,shape:SceneryShape,x:number,y:number,width:number,height:number,alpha:number,color:number,angle=0)=>result.push({id,shape,x,y,width,height,alpha,color,angle});
  const hot=kind==='ember',color=hot?0xffc363:kind==='mirewood'?0x8eeacb:0xc8f5ff;
  FLOW_ANCHORS[kind].forEach((a,index)=>{
    // Feathered pieces of the actual map artwork move locally; the terrain never shifts.
    const wave=theta*8+index*1.7;
    add(`texture-${index}`,'texture',a.x+Math.sin(theta*4+index)*.7,a.y+Math.sin(wave)*5,a.width,a.height,.16+.07*Math.cos(wave),0xffffff);
    for(let i=0;i<3;i++){
      const u=unit(p*8+i/3+index*.13);
      add(`flow-${index}-${i}`,'flow',a.x+(i-1)*a.width*.19+Math.sin(theta*8+i)*.5,a.y-a.height*.36+u*a.height*.72,1.2,hot?11:15,envelope(u)*(hot?.43:.39),color);
    }
    const u=unit(p*4+index*.19);
    add(`ripple-${index}`,'ripple',a.x,a.y+a.height*.48,10+u*27,3+u*7,envelope(u)*(hot?.23:.26),color);
  });
  if(kind==='frostbound'){
    for(let i=0;i<15;i++){
      const u=unit(p*2+i/15), x=45+((i*167)%1010)+Math.sin(theta*2+i)*14;
      add(`snow-${i}`,'mote',x,22+u*630,1.1+(i%3)*.35,1,envelope(u)*.53,0xecf8ff);
    }
  } else if(hot){
    for(let i=0;i<14;i++){
      const u=unit(p*4+i/14);
      add(`ember-${i}`,'mote',60+(i*197)%990+Math.sin(theta*4+i)*12,646-u*(65+(i%3)*20),1.1+(i%2)*.4,1,envelope(u)*.7,i%2?0xffd77c:0xff9b3c);
    }
    // The painted lava pools breathe gently rather than flashing over the road.
    [[86,559],[531,628],[1009,606]].forEach(([x,y],i)=>add(`lava-light-${i}`,'mist',x+Math.sin(theta*2+i)*5,y,58,13,.025+.025*(.5+.5*Math.sin(theta*4+i)),0xff8b33));
  } else if(kind==='mirewood'){
    [[89,412],[407,533],[890,347],[931,568]].forEach(([x,y],i)=>add(`mist-${i}`,'mist',x+Math.sin(theta+i*1.9)*19,y+Math.cos(theta*2+i)*3,90+i*8,10,.07+.025*Math.sin(theta*2+i),0xb4e8cc));
    [[127,441],[410,582],[650,587],[903,561]].forEach(([x,y],i)=>add(`reed-${i}`,'reed',x,y,7,19,.65,0x769b5c,Math.sin(theta*2+i)*.12));
    for(let i=0;i<9;i++)add(`mirelight-${i}`,'mote',55+(i*131)%1000+Math.sin(theta+i)*10,390+(i*71)%240+Math.cos(theta*2+i)*6,1.5,1,.17+.27*(.5+.5*Math.sin(theta*3+i)),0xc7ed91);
  } else if(kind==='crystal'){
    // Positions measured on the supplied cyan and amethyst crystal clusters, outside roads/sites.
    [[233,98],[273,118],[398,49],[736,67],[939,205],[1017,528],[792,614],[386,560],[38,333]].forEach(([x,y],i)=>{
      const pulse=Math.pow(.5+.5*Math.sin(theta*(2+i%3)+i*1.8),4);
      add(`crystal-${i}`,'glint',x,y,3+pulse*3,5+pulse*6,.12+pulse*.7,i%2?0xc68aff:0x97f3ff);
      add(`crystal-light-${i}`,'mist',x,y+5,20,12,.015+pulse*.035,i%2?0xa66bff:0x66cfff);
    });
  } else {
    for(let i=0;i<11;i++)add(`firefly-${i}`,'mote',30+(i*147)%1040+Math.sin(theta+i)*12,55+(i*113)%590+Math.cos(theta*2+i)*7,1.4,1,.1+.32*(.5+.5*Math.sin(theta*3+i)),0xf2df96);
  }
  const flames:Record<EnvironmentKind,number[][]>={
    eldervale:[[998,112],[1006,323],[990,368]],
    frostbound:[[162,88],[494,475],[641,474],[1049,456]],
    ember:[[167,222],[517,499],[680,490],[857,477]],
    mirewood:[[120,218],[735,102],[842,28],[993,278]],
    crystal:[[446,182],[727,171],[752,415],[621,455]],
  };
  flames[kind].forEach(([x,y],i)=>add(`torch-${i}`,'flame',x+Math.sin(theta*12+i)*.6,y,3.4+Math.sin(theta*8+i)*.6,7+Math.sin(theta*12+i)*1.4,.62+.12*Math.sin(theta*8+i),0xffce73));
  return result;
}
// Two neighboring keyframes per region are enough for continuous playback. This keeps
// trigonometry at the authored cadence without retaining a large full-loop frame atlas.
const keyframeCache=new Map<EnvironmentKind,{frame:number;items:SceneryPose[]}[]>();
function keyframe(kind:EnvironmentKind,frame:number):SceneryPose[]{
  let cache=keyframeCache.get(kind);
  if(!cache){cache=[];keyframeCache.set(kind,cache);}
  const found=cache.find(entry=>entry.frame===frame);if(found)return found.items;
  const items=authored(kind,frame);cache.push({frame,items});if(cache.length>2)cache.shift();
  return items;
}
export function environmentClock(seconds:number,reduced=false){
  const time=!reduced&&Number.isFinite(seconds)?Math.max(0,seconds):0;
  const phase=unit(time/ENVIRONMENT_LOOP_SECONDS),position=phase*ENVIRONMENT_FRAME_COUNT;
  const frame=Math.floor(position),blend=position-frame;
  return {phase,frame,nextFrame:(frame+1)%ENVIRONMENT_FRAME_COUNT,blend};
}
export function sampleEnvironment(kind:EnvironmentKind,seconds:number,worldHeight=680,reduced=false){
  const clock=environmentClock(seconds,reduced),a=keyframe(kind,clock.frame),b=keyframe(kind,clock.nextFrame),sy=worldHeight/680;
  const items=a.map((v,i)=>({...v,x:lerp(v.x,b[i].x,clock.blend),y:lerp(v.y,b[i].y,clock.blend)*sy,width:lerp(v.width,b[i].width,clock.blend),height:lerp(v.height,b[i].height,clock.blend)*sy,alpha:reduced?0:lerp(v.alpha,b[i].alpha,clock.blend),angle:lerp(v.angle,b[i].angle,clock.blend)}));
  return {...clock,items};
}
