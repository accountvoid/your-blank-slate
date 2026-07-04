import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type ShopItem = Database['public']['Tables']['shop_items']['Row'];

/**
 * Database-driven shop catalog. Automatically reflects inserts / edits
 * via Supabase Realtime. No hardcoded items.
 */
export const useShopItems = (opts: { includeInactive?: boolean } = {}) => {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('shop_items').select('*').order('sort_order', { ascending: true });
    if (!opts.includeInactive) q = q.eq('is_active', true);
    const { data, error } = await q;
    if (error) setError(error.message);
    else setItems(data ?? []);
    setLoading(false);
  }, [opts.includeInactive]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel('shop_items_catalog')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shop_items' },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  return { items, loading, error, refresh: load };
};
