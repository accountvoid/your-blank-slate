import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type GateItem = Database['public']['Tables']['gate_items']['Row'];

/**
 * Database-driven gate reward pool. Completely independent from shop_items.
 * Auto-refreshes via Supabase Realtime.
 */
export const useGateItems = (opts: { includeInactive?: boolean } = {}) => {
  const [items, setItems] = useState<GateItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('gate_items').select('*').order('sort_order', { ascending: true });
    if (!opts.includeInactive) q = q.eq('is_active', true);
    const { data } = await q;
    setItems(data ?? []);
    setLoading(false);
  }, [opts.includeInactive]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel('gate_items_catalog')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gate_items' },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  /**
   * Roll a bonus-loot drop set for a gate rank. Filters gate_items to
   * ALL + the specific rank, then rolls each independently by drop_rate.
   */
  const rollDropsForRank = useCallback(
    (rank: string) => {
      return items.filter((it) => it.gate_rank === 'ALL' || it.gate_rank === rank)
        .filter((it) => Math.random() < Number(it.drop_rate));
    },
    [items],
  );

  return { items, loading, refresh: load, rollDropsForRank };
};
