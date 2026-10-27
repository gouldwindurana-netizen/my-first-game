import { describe, expect, it } from 'vitest';
import { TOWER_KINDS } from '../game/catalog';
import { getTowerFrameKey, getTowerTexture, getTowerVisualKind, suppliedAtlas, towerArt, TOWER_TEXTURE } from '../asset-art';
import svgSource from '../assets/towers/role-towers.svg?raw';

describe('role-specific tower atlas integrity', () => {
  const keys=TOWER_KINDS.flatMap(kind=>[1,2,3].map(tier=>`${kind}-${tier}`));

  it('resolves every family and tier to its own source frame without aliases', () => {
    expect(keys).toHaveLength(51);
    expect(Object.keys(suppliedAtlas.frames).filter(key=>suppliedAtlas.frames[key].sheet==='role-towers').sort()).toEqual([...keys].sort());
    for(const kind of TOWER_KINDS){
      expect(getTowerVisualKind(kind)).toBe(kind);
      expect(getTowerTexture(kind)).toBe(TOWER_TEXTURE);
      for(const tier of [1,2,3])expect(getTowerFrameKey(kind,tier)).toBe(`${kind}-${tier}`);
    }
  });

  it('keeps source crops separate and anchors and weapon outlets inside each crop', () => {
    const sheet=suppliedAtlas.sheets['role-towers'];
    expect(svgSource).toContain(`viewBox="0 0 ${sheet.width} ${sheet.height}"`);
    for(let index=0;index<keys.length;index++){
      const frame=suppliedAtlas.frames[keys[index]];
      expect(frame.width).toBeGreaterThan(0);expect(frame.height).toBeGreaterThan(0);
      expect(frame.x).toBeGreaterThanOrEqual(0);expect(frame.y).toBeGreaterThanOrEqual(0);
      expect(frame.x+frame.width).toBeLessThanOrEqual(sheet.width);expect(frame.y+frame.height).toBeLessThanOrEqual(sheet.height);
      for(const value of [frame.originX,frame.originY,frame.muzzleX,frame.muzzleY]){
        expect(value).toBeTypeOf('number');expect(value).toBeGreaterThanOrEqual(0);expect(value).toBeLessThanOrEqual(1);
      }
      for(const otherKey of keys.slice(index+1)){
        const other=suppliedAtlas.frames[otherKey];
        const overlap=frame.x<other.x+other.width&&frame.x+frame.width>other.x&&frame.y<other.y+other.height&&frame.y+frame.height>other.y;
        expect(overlap,`${keys[index]} must not sample ${otherKey}`).toBe(false);
      }
    }
  });

  it('ships distinct drawings for all three tiers of every tower family', () => {
    const drawings=[...svgSource.matchAll(/<g transform="translate\(\d+ \d+\)">([\s\S]*?)<\/g>/g)].map(match=>match[1]);
    expect(drawings).toHaveLength(51);
    expect(new Set(drawings).size).toBe(51);
  });

  it('clips repeated portraits independently without nested SVG sizing', () => {
    const markup=towerArt('frost',1),repeat=towerArt('frost',1),frame=suppliedAtlas.frames['frost-1'];
    // Nested SVG viewports inherited responsive icon dimensions and exposed adjacent atlas pixels.
    expect(markup.match(/<svg\b/g)).toHaveLength(1);
    const clip=markup.match(/<clipPath id="([^"]+)" clipPathUnits="userSpaceOnUse"/);
    const otherClip=repeat.match(/<clipPath id="([^"]+)"/);
    expect(clip).not.toBeNull();expect(otherClip).not.toBeNull();
    expect(otherClip![1]).not.toBe(clip![1]);
    expect(markup).toContain(`<rect x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}"/>`);
    expect(markup).toContain(`clip-path="url(#${clip![1]})"`);
  });
});
