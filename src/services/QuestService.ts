import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type QuestKind = 'main' | 'side' | 'grand';
export type MainQuestRow = Database['public']['Tables']['main_quests']['Row'];
export type SideQuestRow = Database['public']['Tables']['side_quests']['Row'];
export type GrandQuestRow = Database['public']['Tables']['grand_quests']['Row'];
export type QuestRunRow = Database['public']['Tables']['user_quest_runs']['Row'];

const todayKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const QuestService = {
  todayKey,

  async listMain(): Promise<MainQuestRow[]> {
    const { data } = await supabase.from('main_quests').select('*').eq('is_active', true);
    return (data ?? []) as MainQuestRow[];
  },

  async listSide(): Promise<SideQuestRow[]> {
    const { data } = await supabase.from('side_quests').select('*').eq('is_active', true);
    return (data ?? []) as SideQuestRow[];
  },

  /** Seasonal / grand quests: currently active and inside their date window. */
  async listGrand(): Promise<GrandQuestRow[]> {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('grand_quests')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', now)
      .gte('end_date', now)
      .order('priority', { ascending: false });
    return (data ?? []) as GrandQuestRow[];
  },

  async listRunsSince(userId: string, sinceDate: string): Promise<QuestRunRow[]> {
    const { data } = await supabase
      .from('user_quest_runs')
      .select('*')
      .eq('user_id', userId)
      .gte('run_date', sinceDate);
    return (data ?? []) as QuestRunRow[];
  },

  async startRun(userId: string, questId: string, kind: QuestKind): Promise<QuestRunRow | null> {
    const runDate = todayKey();
    const { data, error } = await supabase
      .from('user_quest_runs')
      .insert({
        user_id: userId,
        quest_id: questId,
        quest_kind: kind,
        status: 'active',
        step_progress: {},
        progress_percent: 0,
        run_date: runDate,
      } as any)
      .select('*')
      .single();
    if (error) {
      if ((error as any).code === '23505') {
        const { data: existing } = await supabase
          .from('user_quest_runs')
          .select('*')
          .eq('user_id', userId)
          .eq('quest_id', questId)
          .eq('run_date', runDate)
          .maybeSingle();
        return (existing as QuestRunRow) ?? null;
      }
      return null;
    }
    return data as QuestRunRow;
  },

  async updateProgress(runId: string, stepProgress: Record<string, boolean>, totalSteps: number) {
    const done = Object.values(stepProgress).filter(Boolean).length;
    const percent = totalSteps ? Math.min(100, Math.round((done / totalSteps) * 100)) : 0;
    await supabase
      .from('user_quest_runs')
      .update({ step_progress: stepProgress, progress_percent: percent } as any)
      .eq('id', runId);
  },

  async completeRun(runId: string) {
    await supabase
      .from('user_quest_runs')
      .update({ status: 'completed', progress_percent: 100, completed_at: new Date().toISOString() } as any)
      .eq('id', runId);
  },

  subscribeRuns(userId: string, onChange: () => void) {
    const ch = supabase
      .channel(`user_quest_runs:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_quest_runs', filter: `user_id=eq.${userId}` },
        onChange,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  },

  subscribeCatalog(onChange: () => void) {
    const ch = supabase
      .channel('quests_catalog')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'main_quests' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'side_quests' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grand_quests' }, onChange)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  },
};