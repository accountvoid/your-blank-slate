import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PunishmentSnapshot {
  active: boolean;
  endAt: string | null;
  hp: number;
  maxHp: number;
  remainingMs: number;
}

/**
 * Server-side punishment + HP source of truth.
 * Calls `apply_punishment_drain(uid)` on focus and every 30s.
 * HP drains 1 per 30s server-side; persists across logout/close.
 */
export const usePunishment = () => {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<PunishmentSnapshot>({
    active: false,
    endAt: null,
    hp: 100,
    maxHp: 100,
    remainingMs: 0,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    // Cast required until generated types include the new RPCs.
    const { data, error } = await (supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
    }).rpc('apply_punishment_drain', { uid: user.id });
    if (error || !data) return;
    const row = data as {
      punishment_active: boolean;
      punishment_end_at: string | null;
      hp_player: number;
      hp_max: number | null;
    };
    const endAt = row.punishment_end_at;
    setSnapshot({
      active: row.punishment_active,
      endAt,
      hp: row.hp_player ?? 0,
      maxHp: row.hp_max ?? 100,
      remainingMs: endAt ? Math.max(0, new Date(endAt).getTime() - Date.now()) : 0,
    });
    setLoading(false);
  }, [user]);

  const start = useCallback(
    async (hours = 4) => {
      if (!user) return;
      await (supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
      }).rpc('start_punishment', { uid: user.id, hours });
      await refresh();
    },
    [user, refresh],
  );

  useEffect(() => {
    if (!user) return;
    refresh();
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    const id = window.setInterval(refresh, 30_000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(id);
    };
  }, [user, refresh]);

  return { ...snapshot, loading, refresh, start };
};
