import { useTranslation } from 'react-i18next';
import { useMainQuests, QuestCategory, QuestTemplate, QuestStep } from '@/hooks/useMainQuests';
import { useGameState } from '@/hooks/useGameState';
import { MainQuestCard } from './MainQuestCard';
import { toast } from '@/hooks/use-toast';

interface Props {
  /** When set, only render quests for this category (used in Quests page tabs). */
  category?: QuestCategory;
}

/**
 * Renders today's Main Quests pulled from Supabase.
 * Handles starting/completing runs and crediting XP/Gold to the right category.
 */
export function TodayMainQuests({ category }: Props) {
  const { t } = useTranslation();
  const { todayQuests, runByTemplate, startRun, toggleStep, completeRun, loading } = useMainQuests();
  const { awardCategoryXp } = useGameState() as any;

  const quests = category ? todayQuests.filter(q => q.category === category) : todayQuests;

  const handleStart = async (tpl: QuestTemplate) => {
    const r = await startRun(tpl.id);
    if (r) toast({ title: t('quest.startedTitle', 'Quest accepted'), description: tpl.title_en });
  };

  const handleToggle = (tpl: QuestTemplate, step: QuestStep) => {
    const run = runByTemplate[tpl.id];
    if (!run) return;
    toggleStep(run, step.id, tpl.steps.length);
  };

  const handleComplete = async (tpl: QuestTemplate) => {
    const run = runByTemplate[tpl.id];
    if (!run) return;
    await completeRun(run.id);
    if (typeof awardCategoryXp === 'function') {
      awardCategoryXp(tpl.category, tpl.xp_reward, tpl.gold_reward);
    }
    toast({
      title: t('quest.completedTitle', 'Quest completed'),
      description: `+${tpl.xp_reward} XP · +${tpl.gold_reward} G`,
    });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-black tracking-[0.3em] uppercase text-slate-300">
          {t('quest.todayMain', "Today's Main Quests")}
        </h2>
      </div>

      {loading ? (
        <div className="text-center text-[10px] text-slate-500 py-6">{t('common.loading', 'Loading...')}</div>
      ) : quests.length === 0 ? (
        <div className="border border-slate-800 bg-black/30 p-4 text-center text-[10px] text-slate-400">
          {t('quest.noneToday', 'No main quests available. Check back soon.')}
        </div>
      ) : (
        <div className="space-y-5">
          {quests.map(tpl => (
            <MainQuestCard
              key={tpl.id}
              template={tpl}
              run={runByTemplate[tpl.id]}
              onStart={() => handleStart(tpl)}
              onToggleStep={(s) => handleToggle(tpl, s)}
              onComplete={() => handleComplete(tpl)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
