import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type InventoryRow = Database['public']['Tables']['user_inventory']['Row'];
export type InventorySource = 'SHOP' | 'GATE' | 'SYSTEM' | 'EVENT' | 'QUEST';

/**
 * Normalized per-user inventory backed by Supabase (`user_inventory`).
 * Stores quantity, source (SHOP / GATE / …), acquired_at, expires_at.
 * All CRUD is scoped by RLS to the current user.
 */
export const useUserInventory = () => {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (uid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('user_inventory')
      .select('*')
      .eq('user_id', uid)
      .order('acquired_at', { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let ch: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? null;
      setUserId(uid);
      if (!uid) {
        setLoading(false);
        return;
      }
      await load(uid);
      ch = supabase
        .channel(`user_inventory_${uid}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_inventory', filter: `user_id=eq.${uid}` },
          () => load(uid),
        )
        .subscribe();
    })();
    return () => {
      if (ch) supabase.removeChannel(ch);
    };
  }, [load]);

  /** Add `quantity` of `item_key` from a given source (stacks on the same source row). */
  const addItem = useCallback(
    async (item_key: string, source: InventorySource, quantity = 1, expires_at?: string | null) => {
      if (!userId) return { error: 'not authenticated' };
      const existing = rows.find((r) => r.item_key === item_key && r.source === source);
      if (existing) {
        const { error } = await supabase
          .from('user_inventory')
          .update({ quantity: existing.quantity + quantity })
          .eq('id', existing.id);
        return { error: error?.message };
      }
      const { error } = await supabase.from('user_inventory').insert({
        user_id: userId,
        item_key,
        source,
        quantity,
        expires_at: expires_at ?? null,
      });
      return { error: error?.message };
    },
    [userId, rows],
  );

  const removeItem = useCallback(
    async (item_key: string, quantity = 1) => {
      if (!userId) return { error: 'not authenticated' };
      const row = rows.find((r) => r.item_key === item_key && r.quantity > 0);
      if (!row) return { error: 'not_found' };
      const next = row.quantity - quantity;
      if (next <= 0) {
        const { error } = await supabase.from('user_inventory').delete().eq('id', row.id);
        return { error: error?.message };
      }
      const { error } = await supabase
        .from('user_inventory')
        .update({ quantity: next })
        .eq('id', row.id);
      return { error: error?.message };
    },
    [userId, rows],
  );

  return { rows, loading, addItem, removeItem, refresh: () => userId && load(userId) };
};
