import { TOWER_DEFS, TOWER_KINDS, type TowerBranchKey, type TowerKind } from './catalog';

/** Tower practice is independent of the account XP spent on the skill tree. */
export type TowerMastery = Partial<Record<TowerKind, number>>;
export type TowerResearchKey = 'II' | TowerBranchKey;
export interface TowerXPReport { sessionId: string; totals: TowerMastery; }
export interface TowerResearch {
  key: TowerResearchKey; name: string; requiredXP: number; xp: number;
  unlocked: boolean; remaining: number; progress: number;
}
export const TOWER_XP_LIMIT = 1_000_000_000;
export const TOWER_RESEARCH_XP: Readonly<Record<TowerResearchKey, number>> = { II: 12, A: 75, B: 105, C: 135, D: 180 };
export const TOWER_RESEARCH_KEYS: readonly TowerResearchKey[] = ['II', 'A', 'B', 'C', 'D'];
export function normalizedTowerMastery(value: unknown): TowerMastery {
  const next: TowerMastery = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return next;
  for (const kind of TOWER_KINDS) {
    const amount = (value as Record<string, unknown>)[kind];
    if (typeof amount === 'number' && Number.isFinite(amount) && amount >= 1) next[kind] = Math.min(TOWER_XP_LIMIT, Math.floor(amount));
  }
  return next;
}
export function towerResearch(kind: TowerKind, mastery: TowerMastery): TowerResearch[] {
  const xp = normalizedTowerMastery(mastery)[kind] || 0, definition = TOWER_DEFS[kind];
  return TOWER_RESEARCH_KEYS.map(key => {
    const requiredXP = TOWER_RESEARCH_XP[key];
    return { key, name: key === 'II' ? definition.tier2Name || `${definition.name} II` : definition.branches[key].name,
      requiredXP, xp, unlocked: xp >= requiredXP, remaining: Math.max(0, requiredXP - xp), progress: Math.min(1, xp / requiredXP) };
  });
}
export function validTowerXPSession(value: unknown): value is string {
  return typeof value === 'string' && !['__proto__', 'constructor', 'prototype'].includes(value) && /^[a-zA-Z0-9][a-zA-Z0-9/_:.-]{0,159}$/.test(value);
}
