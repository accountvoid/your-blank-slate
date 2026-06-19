import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PunishmentSnapshot {
  active: boolean;
  endAt: string | null;
  startedAt: string | null;
  reason: string | null;
  count: number;
  hp: number;
  maxHp: number;
  remainingMs: number;
}

const rpc = (fn: string, args: Record<string, unknown>) =>
  (supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  }).rpc(fn, args);

/**
 * Server-side punishment + HP source of truth.
 * - On mount / focus / interval: drains HP (apply_punishment_drain)
 *   and enforces daily deadline (check_and_apply_punishment).
 */
export const usePunishment = () => {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<PunishmentSnapshot>({
    active: false,
    endAt: null,
    startedAt: null,
    reason: null,
    count: 0,
    hp: 100,
    maxHp: 100,
    remainingMs: 0,
  });
  const [loading, setLoading] = useState(true);

  const ingest = useCallback((row: any) => {
    if (!row) return;
    const endAt: string | null = row.punishment_end_at ?? null;
    setSnapshot({
      active: !!row.punishment_active,
      endAt,
      startedAt: row.punishment_started_at ?? null,
      reason: row.punishment_reason ?? null,
      count: row.punishment_count ?? 0,
      hp: row.hp_player ?? 0,
      maxHp: row.hp_max ?? 100,
      remainingMs: endAt ? Math.max(0, new Date(endAt).getTime() - Date.now()) : 0,
    });
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    // Drain HP and auto-clear if expired.
    const drain = await rpc('apply_punishment_drain', { uid: user.id });
    if (!drain.error && drain.data) ingest(drain.data);
  }, [user, ingest]);

  // One-shot deadline enforcement (called from App on startup + on focus).
  const enforceDeadline = useCallback(async () => {
    if (!user) return;
    const res = await rpc('check_and_apply_punishment', { uid: user.id });
    if (!res.error && res.data) ingest(res.data);
  }, [user, ingest]);

  const start = useCallback(
    async (hours = 4, reason = 'Manual') => {
      if (!user) return;
      const res = await rpc('start_punishment', { uid: user.id, hours, reason });
      if (!res.error && res.data) ingest(res.data);
    },
    [user, ingest],
  );

  useEffect(() => {
    if (!user) return;
    enforceDeadline().then(refresh);
    const onFocus = () => {
      enforceDeadline().then(refresh);
    };
    window.addEventListener('focus', onFocus);
    const id = window.setInterval(refresh, 30_000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(id);
    };
  }, [user, refresh, enforceDeadline]);

  return { ...snapshot, loading, refresh, enforceDeadline, start };
};
