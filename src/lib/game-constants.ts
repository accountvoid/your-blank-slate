/**
 * Shared visual constants: rank colors and rarity color/border maps.
 * Extracted from Battle.tsx, Dungeon.tsx, Gates.tsx, MonsterBattle.tsx,
 * and GateLootModal.tsx to remove duplication. Values are unchanged.
 *
 * NOTE: `RARITY_BORDER_CLASSES` includes an `uncommon` tier that only
 * GateLootModal.tsx uses; the Battle.tsx rarity space does not have it.
 * NOTE: Gates.tsx historically maps C rank to cyan-500 Tailwind classes,
 * while Battle/Dungeon/MonsterBattle map C to hex #3b82f6 (blue-500).
 * Both are preserved verbatim — see summary.
 */

export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** Solid hex color per rank — used by Battle bosses, Dungeon theme, Monster encounters. */
export const RANK_HEX_COLORS: Record<Rank, string> = {
  E: '#6b7280',
  D: '#22c55e',
  C: '#3b82f6',
  B: '#a855f7',
  A: '#f59e0b',
  S: '#ef4444',
};

/** Dungeon theme (primary/secondary/shadow) per rank. */
export const RANK_THEMES: Record<Rank, { primary: string; secondary: string; shadow: string }> = {
  E: { primary: '#6b7280', secondary: '#4b5563', shadow: 'rgba(107,114,128,0.2)' },
  D: { primary: '#22c55e', secondary: '#16a34a', shadow: 'rgba(34,197,94,0.2)' },
  C: { primary: '#3b82f6', secondary: '#2563eb', shadow: 'rgba(59,130,246,0.2)' },
  B: { primary: '#a855f7', secondary: '#9333ea', shadow: 'rgba(168,85,247,0.2)' },
  A: { primary: '#f59e0b', secondary: '#d97706', shadow: 'rgba(245,158,11,0.2)' },
  S: { primary: '#ef4444', secondary: '#dc2626', shadow: 'rgba(239,68,68,0.2)' },
};

/** Gates.tsx: Tailwind gradient classes per rank (NOTE: C uses cyan, not blue). */
export const RANK_GATE_GRADIENT: Record<Rank, string> = {
  S: 'from-red-500 to-red-700',
  A: 'from-purple-500 to-purple-700',
  B: 'from-blue-500 to-blue-700',
  C: 'from-cyan-500 to-cyan-700',
  D: 'from-green-500 to-green-700',
  E: 'from-gray-500 to-gray-700',
};
export const RANK_GATE_GRADIENT_DEFAULT = 'from-blue-500 to-blue-700';

/** Gates.tsx: Tailwind border classes per rank. */
export const RANK_GATE_BORDER: Record<Rank, string> = {
  S: 'border-red-500/50',
  A: 'border-purple-500/50',
  B: 'border-blue-500/50',
  C: 'border-cyan-500/50',
  D: 'border-green-500/50',
  E: 'border-gray-500/50',
};
export const RANK_GATE_BORDER_DEFAULT = 'border-blue-500/50';

/** Gates.tsx: box-shadow glow per rank. */
export const RANK_GATE_GLOW: Record<Rank, string> = {
  S: '0 0 80px rgba(239, 68, 68, 0.7)',
  A: '0 0 80px rgba(168, 85, 247, 0.6)',
  B: '0 0 60px rgba(59, 130, 246, 0.5)',
  C: '0 0 50px rgba(6, 182, 212, 0.4)',
  D: '0 0 50px rgba(34, 197, 94, 0.4)',
  E: '0 0 40px rgba(156, 163, 175, 0.3)',
};
export const RANK_GATE_GLOW_DEFAULT = '0 0 50px rgba(59, 130, 246, 0.5)';

/** Battle.tsx rarity → hex color (no `uncommon` tier). */
export const RARITY_HEX_COLORS: Record<Exclude<Rarity, 'uncommon'>, string> = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

/** GateLootModal.tsx rarity → Tailwind border classes (includes `uncommon`). */
export const RARITY_BORDER_CLASSES: Record<Rarity, string> = {
  common: 'border-slate-600',
  uncommon: 'border-green-500/50',
  rare: 'border-blue-500/50',
  epic: 'border-purple-500/50',
  legendary: 'border-yellow-500/50',
};