import { useEffect, useState } from 'react';
import { QuestService, type GrandQuestRow } from '@/services/QuestService';

/**
 * Loads seasonal / grand quests from `grand_quests`. The service already
 * filters to rows currently inside their start/end window and ordered by
 * priority — no client-side date logic needed.
 */
export function useGrandQuests() {
  const [quests, setQuests] = useState<GrandQuestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const rows = await QuestService.listGrand();
      if (!cancelled) {
        setQuests(rows);
        setLoading(false);
      }
    };
    load();
    const unsub = QuestService.subscribeCatalog(load);
    return () => { cancelled = true; unsub(); };
  }, []);

  return { quests, loading };
}