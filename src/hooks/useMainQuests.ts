import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { QuestService, type MainQuestRow, type QuestRunRow } from '@/services/QuestService';

export type QuestCategory = 'strength' | 'mind' | 'spirit' | 'agility';
export type QuestDifficulty = 'easy' | 'medium' | 'hard' | 'legendary';
export type QuestRunStatus = 'active' | 'completed' | 'failed' | 'abandoned';

/**
 * A step inside a quest. Steps are stored as a JSONB array on
 * `main_quests.steps` (and side_quests / grand_quests). Steps are unlimited
 * and defined 100% in the database — no frontend fallbacks.
 */
export interface QuestStep {
  id: string;
  order_index: number;
  step_type?: string;
  title_en: string;
  title_ar: string;
  detail_en?: string | null;
  detail_ar?: string | null;
  reps?: number[] | null;
  sets?: number | null;
  duration_minutes?: number | null;
}

/** Legacy alias kept so existing components keep compiling. */
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
  warning_en: string | null;
  warning_ar: string | null;
  steps: QuestStep[];
}

export interface QuestRun {
  id: string;
  user_id: string;
  template_id: string; // = quest_id (legacy name kept for card compatibility)
  status: QuestRunStatus;
  step_progress: Record<string, boolean>;
  progress_percent: number;
  started_at: string;
  completed_at: string | null;
  run_date: string;
}

/** Local calendar-day key used to reset progress at each player's midnight. */
const localDateKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const msUntilNextMidnight = () => {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return next.getTime() - now.getTime();
};

const normaliseSteps = (raw: unknown): QuestStep[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((s: any, idx: number) => ({
    id: String(s?.id ?? idx),
    order_index: Number(s?.order_index ?? idx),
    step_type: s?.step_type ?? undefined,
    title_en: String(s?.title_en ?? s?.title ?? ''),
    title_ar: String(s?.title_ar ?? s?.title ?? ''),
    detail_en: s?.detail_en ?? null,
    detail_ar: s?.detail_ar ?? null,
    reps: Array.isArray(s?.reps) ? s.reps : null,
    sets: s?.sets ?? null,
    duration_minutes: s?.duration_minutes ?? null,
  })).sort((a, b) => a.order_index - b.order_index);
};

const toTemplate = (r: MainQuestRow): QuestTemplate => ({
  id: r.id,
  category: (r.category as QuestCategory) ?? 'mind',
  title_en: r.title_en ?? '',
  title_ar: r.title_ar ?? '',
  description_en: r.description_en ?? '',
  description_ar: r.description_ar ?? '',
  difficulty: (r.difficulty as QuestDifficulty) ?? 'easy',
  estimated_minutes: r.estimated_minutes ?? 0,
  xp_reward: r.xp_reward ?? 0,
  gold_reward: r.gold_reward ?? 0,
  warning_en: r.warning_en ?? null,
  warning_ar: r.warning_ar ?? null,
  steps: normaliseSteps((r as any).steps),
});

/**
 * Loads the Main Quest catalog from `main_quests`, plus this user's daily
 * runs from `user_quest_runs`. Fully realtime — admin edits and progress
 * updates propagate instantly. No hardcoded quest data anywhere.
 */
export function useMainQuests() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<QuestTemplate[]>([]);
  const [runs, setRuns] = useState<QuestRunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayKey, setTodayKey] = useState<string>(localDateKey());

  // Refresh the local-day key at midnight (and on tab focus).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setTodayKey(localDateKey());
        schedule();
      }, msUntilNextMidnight() + 250);
    };
    schedule();
    const onVis = () => setTodayKey(prev => {
      const k = localDateKey();
      return k === prev ? prev : k;
    });
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
    };
  }, []);

  // Load catalog + subscribe to admin changes.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const rows = await QuestService.listMain();
      if (!cancelled) {
        setTemplates(rows.map(toTemplate));
        setLoading(false);
      }
    };
    load();
    const unsub = QuestService.subscribeCatalog(load);
    return () => { cancelled = true; unsub(); };
  }, []);

  // Load + subscribe to this user's daily runs.
  useEffect(() => {
    if (!user?.id) { setRuns([]); return; }
    let cancelled = false;
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const sinceKey = localDateKey(since);
    const load = async () => {
      const rows = await QuestService.listRunsSince(user.id, sinceKey);
      if (!cancelled) setRuns(rows);
    };
    load();
    const unsub = QuestService.subscribeRuns(user.id, load);
    return () => { cancelled = true; unsub(); };
  }, [user?.id, todayKey]);

  const todayQuests = useMemo(() => templates, [templates]);

  const runByTemplate = useMemo(() => {
    const map: Record<string, QuestRun | undefined> = {};
    runs.forEach(r => {
      if (r.run_date === todayKey) {
        map[r.quest_id] = {
          id: r.id,
          user_id: r.user_id,
          template_id: r.quest_id,
          status: r.status as QuestRunStatus,
          step_progress: (r.step_progress as Record<string, boolean>) ?? {},
          progress_percent: r.progress_percent,
          started_at: r.started_at,
          completed_at: r.completed_at,
          run_date: r.run_date,
        };
      }
    });
    return map;
  }, [runs, todayKey]);

  const startRun = useCallback(async (templateId: string) => {
    if (!user?.id) return null;
    const row = await QuestService.startRun(user.id, templateId, 'main');
    if (!row) return null;
    const legacy: QuestRun = {
      id: row.id,
      user_id: row.user_id,
      template_id: row.quest_id,
      status: row.status as QuestRunStatus,
      step_progress: (row.step_progress as Record<string, boolean>) ?? {},
      progress_percent: row.progress_percent,
      started_at: row.started_at,
      completed_at: row.completed_at,
      run_date: row.run_date,
    };
    return legacy;
  }, [user?.id]);

  const toggleStep = useCallback(async (run: QuestRun, stepId: string, totalSteps: number) => {
    const next = { ...run.step_progress, [stepId]: !run.step_progress[stepId] };
    await QuestService.updateProgress(run.id, next, totalSteps);
  }, []);

  const completeRun = useCallback((runId: string) => QuestService.completeRun(runId), []);

  return { templates, runs, runByTemplate, todayQuests, startRun, toggleStep, completeRun, loading };
}
