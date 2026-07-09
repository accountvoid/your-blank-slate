import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { QuestService, type SideQuestRow, type QuestRunRow } from '@/services/QuestService';

/**
 * Loads the Side Quest catalog from `side_quests` and this player's runs
 * from `user_quest_runs` (quest_kind='side'). Fully database-driven.
 */
export function useSideQuests() {
  const { user } = useAuth();

  const [quests, setQuests] = useState<SideQuestRow[]>([]);
  const [runs, setRuns] = useState<QuestRunRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const rows = await QuestService.listSide();

      if (!cancelled) {
        setQuests(rows);
        setLoading(false);
      }
    };

    load();

    const unsub = QuestService.subscribeCatalog(load);

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setRuns([]);
      return;
    }

    let cancelled = false;

    const sinceKey = QuestService.todayKey();

    const load = async () => {
      const rows = await QuestService.listRunsSince(user.id, sinceKey);

      if (!cancelled) {
        setRuns(rows.filter(r => r.quest_kind === 'side'));
      }
    };

    load();

    const unsub = QuestService.subscribeRuns(user.id, load);

    return () => {
      cancelled = true;
      unsub();
    };
  }, [user?.id]);

  const startRun = useCallback((questId: string) => {
    if (!user?.id) return Promise.resolve(null);

    return QuestService.startRun(user.id, questId, 'side');
  }, [user?.id]);

  const toggleStep = useCallback(
    (
      run: QuestRunRow,
      stepId: string,
      totalSteps: number
    ) => {
      const next = {
        ...(run.step_progress as Record<string, boolean>),
        [stepId]:
          !(run.step_progress as Record<string, boolean>)?.[stepId],
      };

      return QuestService.updateProgress(
        run.id,
        next,
        totalSteps
      );
    },
    []
  );

  const completeRun = useCallback(
    (runId: string) => QuestService.completeRun(runId),
    []
  );

  const progressByMission = Object.fromEntries(
    runs.map((r) => [r.quest_id, r])
  );

  return {
    missions: quests,
    progress: runs,
    progressByMission,
    loading,
    startMission: startRun,
    toggleStep,
    completeMission: completeRun,
  };
}
