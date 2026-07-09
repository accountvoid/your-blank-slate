import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type Profile = Database['public']['Tables']['profiles']['Row'];

/**
 * ProfileService — the profiles table is the central gameplay table.
 * Every player-level read/write goes through here.
 */
export const ProfileService = {
  async get(userId: string): Promise<Profile | null> {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
    return (data as Profile | null) ?? null;
  },

  async update(userId: string, patch: Partial<Profile>): Promise<Profile | null> {
    const { data } = await supabase.from('profiles').update(patch as any).eq('user_id', userId).select('*').maybeSingle();
    return (data as Profile | null) ?? null;
  },

  async addGold(userId: string, amount: number) {
    const p = await ProfileService.get(userId);
    if (!p) return null;
    return ProfileService.update(userId, { gold_player: (p.gold_player ?? 0) + amount });
  },

  async addXpToCategory(userId: string, category: string, xp: number) {
    const p = await ProfileService.get(userId);
    if (!p) return null;
    const stats = (p.stats_player as any) ?? {};
    stats[category] = (stats[category] ?? 0) + xp;
    return ProfileService.update(userId, { stats_player: stats });
  },

  /** Real-time subscription for a single player's profile row. */
  subscribe(userId: string, onChange: (row: Profile) => void) {
    const ch = supabase
      .channel(`profile:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.new) onChange(payload.new as Profile);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  },
};