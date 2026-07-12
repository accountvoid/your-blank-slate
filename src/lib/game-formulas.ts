// Shared pure math for game formulas. No React, no side effects.
// Every function here was moved verbatim from a page/hook — do not change math.

// ---------------- XP / Level ----------------

export const MAX_LEVEL = 100;
export const BASE_XP_PER_LEVEL = 100;
export const XP_GROWTH_RATE = 1.22;

export const getXpRequiredForLevel = (level: number): number => {
  if (level >= MAX_LEVEL) return 999999999;
  return Math.floor(BASE_XP_PER_LEVEL * Math.pow(XP_GROWTH_RATE, level - 1));
};

export const calculateLevel = (xp: number): number => {
  let level = 1;
  let accumulated = 0;
  while (level < MAX_LEVEL) {
    const required = getXpRequiredForLevel(level);
    if (xp < accumulated + required) break;
    accumulated += required;
    level++;
  }
  return level;
};

export const getXpProgress = (xp: number): number => {
  let level = 1;
  let accumulated = 0;
  while (level < MAX_LEVEL) {
    const required = getXpRequiredForLevel(level);
    if (xp < accumulated + required) {
      return ((xp - accumulated) / required) * 100;
    }
    accumulated += required;
    level++;
  }
  return 100;
};

// ---------------- Combat ----------------
// Formula shared by Battle.tsx and Abilities.tsx (identical prior copies).
// NOTE: MonsterBattle.tsx has a *different* getBaseDamage formula — left in
// place pending user decision; do not import this there yet.
export const getBaseDamage = (strengthLevel: number): number => {
  if (strengthLevel <= 1) return 1;
  if (strengthLevel <= 10) return Math.max(1, Math.floor(Math.pow(1000, (strengthLevel - 1) / 9)));
  return Math.floor(1000 + Math.pow(strengthLevel - 10, 0.7) * 100);
};

export const getAgilityDodge = (agiLevel: number): number => Math.min(0.5, 0.02 * agiLevel);
export const getAgilitySpeedBonus = (agiLevel: number): number => Math.min(0.5, 0.01 * agiLevel);
export const getIntCounterChance = (intLevel: number): number => Math.min(0.4, 0.015 * intLevel);
export const getSpiritHitBonus = (spiLevel: number): number => Math.min(0.3, 0.01 * spiLevel);
export const getSpiritDmgBonus = (spiLevel: number): number => 1 + Math.min(0.5, 0.01 * spiLevel);
export const getSpiritReveal = (spiLevel: number): boolean => spiLevel >= 5;