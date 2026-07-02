import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRecoveryProfile } from '@/hooks/useRecoveryProfile';

export type QuestCategory = 'strength' | 'mind' | 'spirit' | 'agility';
export type QuestDifficulty = 'easy' | 'medium' | 'hard' | 'legendary';
export type QuestStepType = 'warmup' | 'exercise' | 'set' | 'reading' | 'practice' | 'stretch' | 'note' | 'cardio';
export type QuestRunStatus = 'active' | 'completed' | 'failed' | 'abandoned';

export interface QuestStep {
  id: string;
  template_id: string;
  order_index: number;
  step_type: QuestStepType;
  title_en: string;
  title_ar: string;
  detail_en: string | null;
  detail_ar: string | null;
  reps: number[] | null;
  sets: number | null;
  duration_minutes: number | null;
}

export interface QuestTemplate {
  id: string;
  category: QuestCategory;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  difficulty: QuestDifficulty;
  estimated_minutes: number;
  xp_reward: number;
  gold_reward: number;
  recovery_required: boolean;
  day_of_week: number | null;
  program_tag: string | null;
  warning_en: string | null;
  warning_ar: string | null;
  active: boolean;
  priority: number;
  steps: QuestStep[];
}

export interface QuestRun {
  id: string;
  user_id: string;
  template_id: string;
  status: QuestRunStatus;
  step_progress: Record<string, boolean>;
  progress_percent: number;
  started_at: string;
  completed_at: string | null;
}

const sb = () => supabase as any;

const todayDow = () => new Date().getDay();

// Local calendar date in YYYY-MM-DD (used as the daily reset key). Aligned to
// the player's local timezone so every player rolls over at their local 00:00.
const localDateKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Milliseconds until the next local midnight (exclusive).
const msUntilNextLocalMidnight = () => {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return next.getTime() - now.getTime();
};

export function useMainQuests() {
  const { user } = useAuth();
  const { programTag, loaded: recoveryLoaded } = useRecoveryProfile();
  const [templates, setTemplates] = useState<QuestTemplate[]>([]);
  const [runs, setRuns] = useState<QuestRun[]>([]);
  const [loading, setLoading] = useState(true);
  // Bumps at every local midnight so memos re-pick today's quests without a reload.
  const [todayKey, setTodayKey] = useState<string>(localDateKey());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setTodayKey(localDateKey());
        schedule();
      }, msUntilNextLocalMidnight() + 250);
    };
    schedule();
    const onVis = () => {
      const key = localDateKey();
      setTodayKey(prev => (prev === key ? prev : key));
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
    };
  }, []);


  // Load catalog (templates + steps).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: tpls, error: e1 } = await sb()
        .from('quest_templates')
        .select('*')
        .eq('active', true);
      if (cancelled) return;
      if (e1 || !tpls) {
        setTemplates([]);
        setLoading(false);
        return;
      }
      const ids = tpls.map((t: any) => t.id);
      const { data: steps } = ids.length
        ? await sb().from('quest_template_steps').select('*').in('template_id', ids).order('order_index', { ascending: true })
        : { data: [] as any[] };
      if (cancelled) return;
      const stepsBy: Record<string, QuestStep[]> = {};
      (steps || []).forEach((s: any) => {
        (stepsBy[s.template_id] ||= []).push(s as QuestStep);
      });
      setTemplates(tpls.map((t: any) => ({ ...t, steps: stepsBy[t.id] || [] })) as QuestTemplate[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Load + subscribe to runs for current user.
  useEffect(() => {
    if (!user?.id) { setRuns([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await sb().from('user_quest_runs').select('*').eq('user_id', user.id);
      if (!cancelled) setRuns((data || []) as QuestRun[]);
    })();
    const channel = sb()
      .channel(`user_quest_runs:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_quest_runs', filter: `user_id=eq.${user.id}` }, (payload: any) => {
        setRuns(prev => {
          if (payload.eventType === 'DELETE') return prev.filter(r => r.id !== payload.old.id);
          const row = payload.new as QuestRun;
          const i = prev.findIndex(r => r.id === row.id);
          if (i === -1) return [...prev, row];
          const copy = prev.slice();
          copy[i] = row;
          return copy;
        });
      })
      .subscribe();
    return () => { cancelled = true; sb().removeChannel(channel); };
  }, [user?.id]);

  // Pick today's quests (1 per category).
  const todayQuests = useMemo(() => {
    if (!recoveryLoaded) return [] as QuestTemplate[];
    const dow = todayDow();
    const pickByCategory = (cat: QuestCategory): QuestTemplate | null => {
      const pool = templates.filter(t => t.category === cat);
      if (cat === 'strength') {
        if (!programTag) return null; // wait for recovery assessment
        const today = pool.filter(t => t.program_tag === programTag && t.day_of_week === dow);
        return today[0] || null; // recovery day -> no strength quest
      }
      // non-STR: day-of-week match first, else any
      const matched = pool.filter(t => t.day_of_week === dow);
      const base = matched.length ? matched : pool;
      if (!base.length) return null;
      // deterministic by date for stable daily pick
      const d = new Date();
      const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() + cat.length;
      return base[seed % base.length];
    };
    return (['strength','mind','agility','spirit'] as QuestCategory[])
      .map(pickByCategory)
      .filter((q): q is QuestTemplate => !!q);
  }, [templates, programTag, recoveryLoaded]);

  const runByTemplate = useMemo(() => {
    const map: Record<string, QuestRun | undefined> = {};
    runs.forEach(r => { map[r.template_id] = r; });
    return map;
  }, [runs]);

  // Mutations
  const startRun = useCallback(async (templateId: string) => {
    if (!user?.id) return null;
    const existing = runs.find(r => r.template_id === templateId && r.status === 'active');
    if (existing) return existing;
    const { data, error } = await sb()
      .from('user_quest_runs')
      .insert({ user_id: user.id, template_id: templateId, status: 'active', step_progress: {}, progress_percent: 0 })
      .select()
      .single();
    if (error) { console.error('startRun', error); return null; }
    return data as QuestRun;
  }, [user?.id, runs]);

  const toggleStep = useCallback(async (run: QuestRun, stepId: string, totalSteps: number) => {
    const next = { ...run.step_progress, [stepId]: !run.step_progress[stepId] };
    const done = Object.values(next).filter(Boolean).length;
    const percent = totalSteps ? Math.min(100, Math.round((done / totalSteps) * 100)) : 0;
    await sb().from('user_quest_runs').update({ step_progress: next, progress_percent: percent }).eq('id', run.id);
  }, []);

  const completeRun = useCallback(async (runId: string) => {
    await sb().from('user_quest_runs').update({ status: 'completed', progress_percent: 100, completed_at: new Date().toISOString() }).eq('id', runId);
  }, []);

  return { templates, runs, runByTemplate, todayQuests, startRun, toggleStep, completeRun, loading };
}
