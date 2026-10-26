import { describe,it,expect } from 'vitest';
import { ENVIRONMENT_FPS,ENVIRONMENT_FRAME_COUNT,environmentClock,sampleEnvironment,type EnvironmentKind } from './environment-motion';
const kinds:EnvironmentKind[]=['eldervale','frostbound','ember','mirewood','crystal'];
describe('periodic interpolated environment tracks',()=>{
  it('closes all five loops, including texture position, alpha and particle travel',()=>{
    for(const kind of kinds){
      expect(sampleEnvironment(kind,0)).toEqual(sampleEnvironment(kind,12));
      const a=sampleEnvironment(kind,3.125),b=sampleEnvironment(kind,15.125);
      a.items.forEach((item,i)=>{
        expect(item.id).toBe(b.items[i].id);
        for(const key of ['x','y','width','height','alpha','angle'] as const)expect(item[key]).toBeCloseTo(b.items[i][key],9);
      });
    }
  });
  it('interpolates between authored 24 fps samples rather than stepping at display refresh',()=>{
    expect(ENVIRONMENT_FPS).toBe(24);expect(ENVIRONMENT_FRAME_COUNT).toBe(288);
    const a=sampleEnvironment('mirewood',1),b=sampleEnvironment('mirewood',1+1/24),mid=sampleEnvironment('mirewood',1+1/48);
    expect(mid.blend).toBeCloseTo(.5,8);
    a.items.forEach((item,i)=>{
      expect(mid.items[i].x).toBeCloseTo((item.x+b.items[i].x)/2,8);
      expect(mid.items[i].y).toBeCloseTo((item.y+b.items[i].y)/2,8);
      expect(mid.items[i].alpha).toBeCloseTo((item.alpha+b.items[i].alpha)/2,8);
    });
  });
  it('interpolates the final sample back into the first with no visible seam',()=>{
    for(const kind of kinds){
      const a=sampleEnvironment(kind,12-1/10000),b=sampleEnvironment(kind,1/10000);
      a.items.forEach((item,i)=>{
        // Wrap travel is transparent at the boundary; visible effects have continuous positions.
        expect(Math.abs(item.alpha-b.items[i].alpha)).toBeLessThan(.003);
        if(item.alpha>.001){expect(Math.abs(item.x-b.items[i].x)).toBeLessThan(.1);expect(Math.abs(item.y-b.items[i].y)).toBeLessThan(.2);}
      });
    }
  });
  it('honors natural map height and holds neutral, invisible scenery with reduced motion',()=>{
    const full=sampleEnvironment('frostbound',2,680),wide=sampleEnvironment('frostbound',2,470.8);
    full.items.forEach((item,i)=>{expect(wide.items[i].x).toBe(item.x);expect(wide.items[i].y).toBeCloseTo(item.y*470.8/680);});
    for(const kind of kinds){
      expect(sampleEnvironment(kind,2,680,true)).toEqual(sampleEnvironment(kind,9,680,true));
      expect(sampleEnvironment(kind,2,680,true).items.every(item=>item.alpha===0)).toBe(true);
    }
  });
  it('bounds scenery count and sanitizes a bad clock',()=>{
    for(const kind of kinds)expect(sampleEnvironment(kind,4).items.length).toBeLessThan(100);
    expect(environmentClock(NaN)).toEqual(environmentClock(0));
    expect(environmentClock(-5)).toEqual(environmentClock(0));
  });
});
