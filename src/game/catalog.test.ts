import { describe,it,expect } from 'vitest';
import { BRANCH_KEYS,DAMAGE_TYPES,ENEMY_DEFS,ENEMY_KINDS,TOWER_DEFS,TOWER_KINDS } from './catalog';

describe('expansion content integrity',()=>{
  it('ships seventeen distinct families and four usable specializations per family',()=>{
    expect(TOWER_KINDS).toHaveLength(17);
    const names=new Set<string>();
    for(const kind of TOWER_KINDS){
      const tower=TOWER_DEFS[kind];
      expect(tower.cost).toBeGreaterThan(0);expect(tower.tier2Cost).toBeGreaterThan(0);
      expect(tower.range).toBeGreaterThan(0);expect(tower.interval).toBeGreaterThan(0);
      expect(DAMAGE_TYPES).toContain(tower.damageType);
      expect(Object.keys(tower.branches)).toEqual([...BRANCH_KEYS]);
      for(const key of BRANCH_KEYS){
        const specialization=tower.branches[key];
        expect(specialization.cost).toBeGreaterThan(0);
        expect(specialization.description.trim().length).toBeGreaterThan(15);
        expect(names.has(specialization.name)).toBe(false);names.add(specialization.name);
        if(specialization.interval!==undefined)expect(specialization.interval).toBeGreaterThan(0);
      }
    }
    expect(names.size).toBe(68);
  });

  it('keeps the five gem unlocks separate from spendable battle gold',()=>{
    const premium=TOWER_KINDS.filter(kind=>TOWER_DEFS[kind].premiumCost!==undefined);
    expect(premium).toEqual(['void','solar','chrono','truesight','nexus']);
    for(const kind of premium){
      expect(Number.isInteger(TOWER_DEFS[kind].premiumCost)).toBe(true);
      expect(TOWER_DEFS[kind].premiumCost).toBeGreaterThan(0);
      expect(TOWER_DEFS[kind].cost).toBeGreaterThan(0);
    }
  });

  it('keeps enemy mechanics linked to valid content with bounded armor and resistance',()=>{
    expect(ENEMY_KINDS).toHaveLength(40);
    const names=new Set<string>();
    for(const kind of ENEMY_KINDS){
      const enemy=ENEMY_DEFS[kind];names.add(enemy.name);
      expect(enemy.hp).toBeGreaterThan(0);expect(enemy.speed).toBeGreaterThan(0);
      expect(enemy.armor).toBeGreaterThanOrEqual(0);expect(enemy.armor).toBeLessThan(1);
      expect(['grunt','runner','brute','boss']).toContain(enemy.visual);
      for(const [type,resistance]of Object.entries(enemy.resistances)){
        expect(DAMAGE_TYPES).toContain(type);expect(resistance).toBeGreaterThan(-1);expect(resistance).toBeLessThan(1);
      }
      if(enemy.splitInto){expect(ENEMY_KINDS).toContain(enemy.splitInto);expect(enemy.splitCount).toBeGreaterThan(0);}
      if(enemy.summon)expect(ENEMY_KINDS).toContain(enemy.summon);
      if(enemy.teleportInterval)expect(enemy.teleportInterval).toBeGreaterThan(0);
    }
    expect(names.size).toBe(40);
    expect(ENEMY_KINDS.some(kind=>ENEMY_DEFS[kind].flying)).toBe(true);
    expect(ENEMY_KINDS.some(kind=>ENEMY_DEFS[kind].ghost)).toBe(true);
    expect(ENEMY_KINDS.some(kind=>ENEMY_DEFS[kind].ccImmune)).toBe(true);
  });
});
