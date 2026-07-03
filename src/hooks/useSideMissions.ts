import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type SideCategory = 'strength' | 'mind' | 'spirit' | 'agility';
export type SideDifficulty = 'easy' | 'medium' | 'hard' | 'legendary';
export type SideProgressStatus = 'active' | 'completed' | 'failed' | 'abandoned';

export interface SideMissionStep {
  id: string;
  title_en: string;
  title_ar: string;
  detail_en?: string | null;
  detail_ar?: string | null;
  reps?: number[] | null;
  duration_minutes?: number | null;
}

export interface SideMission {
  id: string;
  mission_key: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  category: SideCategory;
  difficulty: SideDifficulty;
  xp_reward: number;
  gold_reward: number;
  estimated_minutes: number;
  steps: SideMissionStep[];
  warning_en: string | null;
  warning_ar: string | null;
  is_repeatable: boolean;
  is_active: boolean;
  priority: number;
}

export interface SideMissionProgress {
  id: string;
  user_id: string;
  mission_id: string;
  run_date: string;
  status: SideProgressStatus;
  step_progress: Record<string, boolean>;
  progress_percent: number;
  started_at: string;
  completed_at: string | null;
}

const sb = () => supabase as any;

const localDateKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const msUntilNextLocalMidnight = () => {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return next.getTime() - now.getTime();
};

export function useSideMissions() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<SideMission[]>([]);
  const [progress, setProgress] = useState<SideMissionProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayKey, setTodayKey] = useState<string>(localDateKey());

  // Midnight tick
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

  // Load side missions catalog + realtime
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await sb().from('side_missions').select('*').eq('is_active', true).order('priority', { ascending: false });
      if (!cancelled) {
        setMissions((data || []) as SideMission[]);
        setLoading(false);
      }
    })();
    const channel = sb()
      .channel('side_missions:catalog')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'side_missions' }, async () => {
        const { data } = await sb().from('side_missions').select('*').eq('is_active', true).order('priority', { ascending: false });
        setMissions((data || []) as SideMission[]);
      })
      .subscribe();
    return () => { cancelled = true; sb().removeChannel(channel); };
  }, []);

  // Load + subscribe to progress for current user
  useEffect(() => {
    if (!user?.id) { setProgress([]); return; }
    let cancelled = false;
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const sinceKey = localDateKey(since);
    (async () => {
      const { data } = await sb()
        .from('side_mission_progress')
        .select('*')
        .eq('user_id', user.id)
        .gte('run_date', sinceKey);
      if (!cancelled) setProgress((data || []) as SideMissionProgress[]);
    })();
    const channel = sb()
      .channel(`side_mission_progress:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'side_mission_progress', filter: `user_id=eq.${user.id}` }, (payload: any) => {
        setProgress(prev => {
          if (payload.eventType === 'DELETE') return prev.filter(r => r.id !== payload.old.id);
          const row = payload.new as SideMissionProgress;
          const i = prev.findIndex(r => r.id === row.id);
          if (i === -1) return [...prev, row];
          const copy = prev.slice();
          copy[i] = row;
          return copy;
        });
      })
      .subscribe();
    return () => { cancelled = true; sb().removeChannel(channel); };
  }, [user?.id, todayKey]);

  const progressByMission = useMemo(() => {
    const map: Record<string, SideMissionProgress | undefined> = {};
    progress.forEach(p => { if (p.run_date === todayKey) map[p.mission_id] = p; });
    return map;
  }, [progress, todayKey]);

  const startMission = useCallback(async (missionId: string) => {
    if (!user?.id) return null;
    const runDate = localDateKey();
    const existing = progress.find(p => p.mission_id === missionId && p.run_date === runDate);
    if (existing) return existing;
    const { data, error } = await sb()
      .from('side_mission_progress')
      .insert({ user_id: user.id, mission_id: missionId, status: 'active', step_progress: {}, progress_percent: 0, run_date: runDate })
      .select()
      .single();
    if (error) {
      if ((error as any).code === '23505') {
        const { data: row } = await sb()
          .from('side_mission_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('mission_id', missionId)
          .eq('run_date', runDate)
          .maybeSingle();
        return (row as SideMissionProgress) || null;
      }
      console.error('startMission', error);
      return null;
    }
    return data as SideMissionProgress;
  }, [user?.id, progress]);

  const toggleStep = useCallback(async (row: SideMissionProgress, stepId: string, totalSteps: number) => {
    const next = { ...row.step_progress, [stepId]: !row.step_progress[stepId] };
    const done = Object.values(next).filter(Boolean).length;
    const percent = totalSteps ? Math.min(100, Math.round((done / totalSteps) * 100)) : 0;
    await sb().from('side_mission_progress').update({ step_progress: next, progress_percent: percent }).eq('id', row.id);
  }, []);

  const completeMission = useCallback(async (rowId: string) => {
    await sb().from('side_mission_progress').update({ status: 'completed', progress_percent: 100, completed_at: new Date().toISOString() }).eq('id', rowId);
  }, []);

  return { missions, progress, progressByMission, startMission, toggleStep, completeMission, loading };
}
