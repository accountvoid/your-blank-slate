import { useState, useEffect, useCallback } from 'react';
import { X, Gift, Sparkles, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { GATE_GOLD_BY_RANK } from '@/lib/marketItems';
import { useGateItems } from '@/hooks/useGateItems';
import { RARITY_BORDER_CLASSES } from '@/lib/game-constants';

export interface LootItem {
  id: string;
  i18nKey?: string;
  icon: string;
  quantity: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  type: 'gold' | 'item';
}

interface GateLootModalProps {
  show: boolean;
  rank: string;
  loot: LootItem[];
  onClose: () => void;
  onCollect: () => void;
}

const RARITY_BORDER = RARITY_BORDER_CLASSES;

export const GateLootModal = ({ show, rank, loot, onClose, onCollect }: GateLootModalProps) => {
  const { t } = useTranslation();
  const [revealedItems, setRevealedItems] = useState<number[]>([]);
  const [allRevealed, setAllRevealed] = useState(false);

  useEffect(() => {
    if (!show) return;
    setRevealedItems([]);
    setAllRevealed(false);
    loot.forEach((_, index) => {
      setTimeout(() => {
        setRevealedItems(prev => [...prev, index]);
        if (index === loot.length - 1) {
          setTimeout(() => setAllRevealed(true), 400);
        }
      }, 400 + index * 350);
    });
  }, [show, loot]);

  if (!show) return null;

  const labelFor = (item: LootItem) => {
    if (item.type === 'gold') return t('common.gold');
    if (item.i18nKey) return t(`${item.i18nKey}.name`);
    return item.id;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative max-w-md w-full bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-yellow-500/30 animate-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          aria-label={t('common.close')}
          className="absolute top-2 right-2 p-2 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-4 border-b border-yellow-500/30 bg-gradient-to-r from-yellow-900/20 via-transparent to-yellow-900/20">
          <div className="flex items-center justify-center gap-3">
            <Gift className="w-6 h-6 text-yellow-400 animate-bounce" />
            <h2 className="text-xl font-bold text-yellow-400 tracking-wider">
              {t('gateRewards.title')}
            </h2>
            <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
          </div>
          <p className="text-center text-xs text-slate-400 mt-1">
            {t('common.rank')}: {rank}
          </p>
        </div>

        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {loot.map((item, index) => {
            const isRevealed = revealedItems.includes(index);
            return (
              <div
                key={`${item.id}-${index}`}
                className={cn(
                  'relative p-3 border rounded transition-all duration-500',
                  RARITY_BORDER[item.rarity],
                  'bg-black/40',
                  isRevealed ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
                )}
              >
                {!isRevealed && (
                  <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center rounded">
                    <Package className="w-8 h-8 text-slate-600 animate-pulse" />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-12 h-12 aspect-square rounded border flex items-center justify-center text-2xl bg-black/50 shrink-0',
                      RARITY_BORDER[item.rarity]
                    )}
                  >
                    <span aria-hidden>{item.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{labelFor(item)}</p>
                    <p className="text-xs text-slate-400">×{item.quantity}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-yellow-500/30">
          <button
            onClick={() => {
              onCollect();
              onClose();
            }}
            disabled={!allRevealed}
            className={cn(
              'w-full py-3 font-bold text-sm uppercase tracking-wider transition-all',
              allRevealed
                ? 'bg-gradient-to-r from-yellow-600 to-amber-600 text-black active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-wait'
            )}
          >
            {allRevealed ? t('gateRewards.collect') : t('gateRewards.revealing')}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook that returns a stable `generate(rank)` function producing gate loot
 * from the DB-driven `gate_items` catalog.
 *  - GOLD is ALWAYS granted (mandatory, scales by rank).
 *  - Every gate_item whose gate_rank matches (or ALL) rolls independently
 *    against its own drop_rate.
 */
export const useGateLootGenerator = () => {
  const { items, rollDropsForRank } = useGateItems();

  const generate = useCallback((rank: string): LootItem[] => {
    const loot: LootItem[] = [];
    const gold = GATE_GOLD_BY_RANK[rank] ?? GATE_GOLD_BY_RANK.E;
    loot.push({ id: 'gold', icon: '💰', quantity: gold, rarity: 'common', type: 'gold' });
    for (const it of rollDropsForRank(rank)) {
      const rarity = (['common', 'uncommon', 'rare', 'epic', 'legendary'] as const).includes(it.rarity as any)
        ? (it.rarity as LootItem['rarity'])
        : 'common';
      loot.push({
        id: it.item_key,
        i18nKey: `items.${it.item_key}`,
        icon: it.icon,
        quantity: it.quantity,
        rarity,
        type: 'item',
      });
    }
    return loot;
  }, [items, rollDropsForRank]);

  return { generate, ready: items.length > 0 };
};

/**
 * @deprecated Kept for backward-compat with callers that don't yet use
 * `useGateLootGenerator`. Returns only mandatory gold; DB-driven bonus drops
 * are only available through the hook.
 */
export const generateGateLoot = (rank: string): LootItem[] => {
  const gold = GATE_GOLD_BY_RANK[rank] ?? GATE_GOLD_BY_RANK.E;
  return [{ id: 'gold', icon: '💰', quantity: gold, rarity: 'common', type: 'gold' }];
};
