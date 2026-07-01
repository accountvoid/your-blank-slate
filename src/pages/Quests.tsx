import { useGameState } from '@/hooks/useGameState';
import { useProfile } from '@/hooks/useProfile';
import { BottomNav } from '@/components/BottomNav';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useState, useEffect } from 'react';
import {
  Dumbbell, Brain, Heart, Zap, CheckCircle2, Scroll, Settings2, Check,
  AlertTriangle, Sparkles, Coins, Clock, Play, Loader2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import type { StatType } from '@/types';
import { useAds, type AdCategory } from '@/hooks/useAds';
import { SponsoredMissionCard } from '@/components/ads/SponsoredMissionCard';
import { useMainQuests, type QuestCategory, type QuestTemplate, type QuestRun } from '@/hooks/useMainQuests';
import { useRecoveryProfile } from '@/hooks/useRecoveryProfile';
import { RecoveryAssessmentModal } from '@/components/quests/RecoveryAssessmentModal';

type QuestTab = 'all' | StatType;

const STAT_TO_AD_CATEGORY: Record<StatType, AdCategory> = {
  strength: 'strength', mind: 'mind', spirit: 'spirit', agility: 'agility',
};

const catIconMap = { strength: Dumbbell, mind: Brain, spirit: Heart, agility: Zap } as const;

const Quests = () => {
  const { loading: profileLoading } = useProfile();
  const { awardCategoryXp, gameState, getXpProgress } = useGameState() as any;
  const { t, i18n } = useTranslation();
  const ar = i18n.language?.startsWith('ar');
  const [activeTab, setActiveTab] = useState<QuestTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);

  const { todayQuests, runByTemplate, startRun, toggleStep, completeRun, loading } = useMainQuests();
  const { needsAssessment, profile } = useRecoveryProfile();

  useEffect(() => { if (needsAssessment) setShowRecovery(true); }, [needsAssessment]);

  const adCategory: AdCategory | undefined =
    activeTab === 'all' ? undefined : STAT_TO_AD_CATEGORY[activeTab as StatType];
  const { ads: sponsoredAds } = useAds({ type: 'sponsored_mission', category: adCategory });

  const filtered = activeTab === 'all'
    ? todayQuests
    : todayQuests.filter(q => q.category === (activeTab as QuestCategory));

  const handleInitialize = async (tpl: QuestTemplate) => {
    const r = await startRun(tpl.id);
    if (r) {
      setExpandedId(tpl.id);
      toast({ title: t('quests.questInitialized', 'Quest accepted'), description: ar ? tpl.title_ar : tpl.title_en });
    }
  };

  const handleClaim = async (tpl: QuestTemplate) => {
    const run = runByTemplate[tpl.id];
    if (!run) return;
    // Idempotency: never award twice for the same run.
    if (run.status === 'completed') {
      toast({ title: t('quest.completed', 'Completed'), description: ar ? tpl.title_ar : tpl.title_en });
      return;
    }
    await completeRun(run.id);
    if (typeof awardCategoryXp === 'function') {
      awardCategoryXp(tpl.category, tpl.xp_reward, tpl.gold_reward);
    }
    toast({
      title: t('quests.rewardsClaimed', 'Quest completed'),
      description: `+${tpl.xp_reward} XP · +${tpl.gold_reward} G`,
    });
  };

  const tabs = [
    { id: 'all', label: t('quests.title'), icon: Scroll },
    { id: 'strength', label: 'STR', icon: Dumbbell },
    { id: 'mind', label: 'INT', icon: Brain },
    { id: 'spirit', label: 'SPR', icon: Heart },
    { id: 'agility', label: 'AGI', icon: Zap },
  ];

  if (profileLoading) return <LoadingScreen fullScreen message="QUESTS" />;

  const activeCount = filtered.filter(tpl => {
    const r = runByTemplate[tpl.id];
    return !r || r.status !== 'completed';
  }).length;

  return (
    <div className="min-h-screen bg-[#020817] text-white p-3 font-sans pb-24">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(29,78,216,0.15),transparent_70%)]" />
      </div>

      <header className="relative z-10 flex flex-col items-center mb-6 border-b border-blue-500/30 pb-4">
        <h1 className="text-xl font-bold tracking-[0.2em] uppercase italic text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
          {t('quests.sideQuests')}
        </h1>
        <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-blue-400 uppercase mt-2">
          <CheckCircle2 className="w-3 h-3" />
          <span>{t('quests.available')}: {activeCount} / {filtered.length}</span>
        </div>
        <button
          onClick={() => setShowRecovery(true)}
          className="mt-2 flex items-center gap-1 text-[9px] uppercase tracking-widest text-blue-300/70 hover:text-blue-300"
        >
          <Settings2 className="w-3 h-3" />
          {profile ? t('recovery.update', 'Recovery profile') : t('recovery.set', 'Set recovery profile')}
        </button>
      </header>

      <main className="relative z-10 max-w-md mx-auto space-y-8">
        {/* Total XP progress across all categories (realtime via gameState) */}
        {gameState?.stats && (
          <div className="border border-blue-500/30 bg-black/60 p-3 space-y-3 shadow-[0_0_20px_rgba(30,58,138,0.25)]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-blue-300">
                {t('quests.totalXp', 'Total Progress')}
              </span>
              <span className="text-[10px] font-mono text-slate-300">
                {(gameState.stats.strength + gameState.stats.mind + gameState.stats.spirit + gameState.stats.agility)} XP
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(['strength','mind','agility','spirit'] as const).map((k) => {
                const Icon = catIconMap[k];
                const xp = gameState.stats[k] ?? 0;
                const pct = typeof getXpProgress === 'function' ? Math.min(100, Math.round(getXpProgress(xp))) : 0;
                const colors: Record<string,string> = {
                  strength: 'from-red-500 to-orange-400',
                  mind: 'from-cyan-500 to-blue-500',
                  agility: 'from-emerald-500 to-lime-400',
                  spirit: 'from-violet-500 to-fuchsia-400',
                };
                return (
                  <div key={k} className="space-y-1">
                    <div className="flex items-center justify-between text-[9px] text-slate-400">
                      <span className="flex items-center gap-1"><Icon className="w-3 h-3" />{t(`stats.${k}`, k.toUpperCase())}</span>
                      <span className="font-mono">{xp}</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={cn('h-full bg-gradient-to-r transition-all duration-500', colors[k])} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-1 p-1 bg-black/40 border border-slate-800 rounded-lg overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as QuestTab)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-md transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-white/10 text-white border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                  : "text-slate-500"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-12">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> {t('common.loading', 'Loading...')}
            </div>
          ) : filtered.length === 0 && sponsoredAds.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">✅</div>
              <p className="text-slate-400 text-sm">
                {activeTab === 'strength'
                  ? t('quest.restDay', 'Today is a recovery day — no strength workout. Stretch and hydrate.')
                  : t('quests.empty.title', 'No quests available')}
              </p>
            </div>
          ) : (
            <>
              {filtered.map(tpl => {
                const run = runByTemplate[tpl.id];
                const Icon = catIconMap[tpl.category];
                const title = ar ? tpl.title_ar : tpl.title_en;
                const desc = ar ? tpl.description_ar : tpl.description_en;
                const warning = ar ? tpl.warning_ar : tpl.warning_en;
                const isCompleted = run?.status === 'completed';
                const isActive = !!run && !isCompleted;
                const total = tpl.steps.length;
                const doneCount = tpl.steps.filter(s => run?.step_progress?.[s.id]).length;
                const percent = total ? Math.round((doneCount / total) * 100) : 0;
                const allDone = total > 0 && doneCount === total;
                const expanded = expandedId === tpl.id && isActive;

                return (
                  <div key={tpl.id} className="relative group">
                    <div className="relative bg-black/60 border-2 border-slate-200/90 p-4 shadow-[0_0_20px_rgba(30,58,138,0.3)]">
                      <div className="flex justify-center mb-4 mt-[-1.5rem]">
                        <div className="border border-slate-400/50 px-4 py-0.5 bg-slate-900/90">
                          <h2 className="text-[10px] font-bold tracking-widest text-white uppercase italic">
                            {t('quests.title').toUpperCase()}: {title}
                          </h2>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 border border-slate-500/50 flex items-center justify-center bg-black/40">
                            <Icon className="w-8 h-8 text-white/80 drop-shadow-[0_0_8px_white]" />
                          </div>
                          <div className="flex-1 space-y-2">
                            <p className="text-[10px] text-slate-300/90 leading-snug line-clamp-3">{desc}</p>
                            <div className="flex justify-between items-center border-t border-white/10 pt-1">
                              <span className="text-[9px] text-slate-400 uppercase font-bold">{t('quests.reward')}:</span>
                              <div className="flex gap-2">
                                <span className="text-xs font-bold text-yellow-400">+{tpl.gold_reward} G</span>
                                <span className="text-xs font-bold text-blue-300">+{tpl.xp_reward} XP</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] text-slate-400 uppercase font-bold">{t('quests.status')}:</span>
                              <span className={cn(
                                "text-[9px] font-bold uppercase",
                                isActive ? "text-blue-400 animate-pulse"
                                  : isCompleted ? "text-green-400" : "text-slate-500"
                              )}>
                                {isActive ? t('quests.inProgress')
                                  : isCompleted ? t('quest.completed', 'Completed')
                                  : t('quests.statusAvailable')}
                              </span>
                            </div>
                            {(isActive || isCompleted) && (
                              <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] text-slate-400 uppercase font-bold">{t('quests.progress')}:</span>
                                  <span className="text-[9px] font-bold text-blue-300">{doneCount}/{total}</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className={cn("h-full transition-all duration-300 rounded-full",
                                      isCompleted ? "bg-green-500" : "bg-blue-500")}
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Inline expanded steps panel (the new "shape") */}
                        {expanded && (
                          <div className="border-t border-blue-500/20 pt-4 space-y-3 animate-fade-in">
                            <div className="grid grid-cols-3 gap-2 text-[10px]">
                              <div className="border border-slate-700/60 bg-black/40 p-2">
                                <div className="flex items-center gap-1 text-slate-400"><Clock className="w-3 h-3" />{t('quest.time', 'Time')}</div>
                                <div className="mt-0.5 font-bold text-white">{tpl.estimated_minutes}m</div>
                              </div>
                              <div className="border border-slate-700/60 bg-black/40 p-2">
                                <div className="flex items-center gap-1 text-slate-400"><Sparkles className="w-3 h-3" />{t('quest.xp', 'XP')}</div>
                                <div className="mt-0.5 font-bold text-blue-300">+{tpl.xp_reward}</div>
                              </div>
                              <div className="border border-slate-700/60 bg-black/40 p-2">
                                <div className="flex items-center gap-1 text-slate-400"><Coins className="w-3 h-3" />{t('quest.gold', 'Gold')}</div>
                                <div className="mt-0.5 font-bold text-yellow-300">+{tpl.gold_reward}</div>
                              </div>
                            </div>

                            {warning && (
                              <div className="flex gap-2 border-l-2 border-amber-500 bg-amber-500/10 p-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-amber-100 leading-relaxed">{warning}</p>
                              </div>
                            )}

                            <ol className="space-y-1.5">
                              {tpl.steps.map((s, idx) => {
                                const done = !!run?.step_progress?.[s.id];
                                const stitle = ar ? s.title_ar : s.title_en;
                                const sdetail = ar ? s.detail_ar : s.detail_en;
                                const reps = Array.isArray(s.reps) ? s.reps : null;
                                return (
                                  <li key={s.id}>
                                    <button
                                      type="button"
                                      disabled={!run || isCompleted}
                                      onClick={() => run && toggleStep(run as QuestRun, s.id, total)}
                                      className={cn(
                                        'w-full text-left flex gap-2 items-start p-2 border transition',
                                        done ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-700/60 bg-black/30',
                                      )}
                                    >
                                      <span className={cn(
                                        'mt-0.5 w-4 h-4 shrink-0 border flex items-center justify-center text-[9px] font-bold',
                                        done ? 'border-emerald-400 bg-emerald-500/30 text-emerald-100' : 'border-slate-500 text-slate-500'
                                      )}>
                                        {done ? <Check className="w-3 h-3" /> : idx + 1}
                                      </span>
                                      <span className="flex-1">
                                        <span className="block text-[11px] font-bold text-white">{stitle}</span>
                                        {sdetail && <span className="block text-[10px] text-slate-400">{sdetail}</span>}
                                        {reps && reps.length > 0 && (
                                          <span className="mt-1 flex flex-wrap gap-1">
                                            {reps.map((r, i) => (
                                              <span key={i} className="px-1.5 py-0.5 bg-blue-500/15 border border-blue-500/30 text-[9px] font-bold text-blue-200">
                                                {r}
                                              </span>
                                            ))}
                                          </span>
                                        )}
                                        {s.duration_minutes && !reps && (
                                          <span className="mt-1 inline-block px-1.5 py-0.5 bg-slate-700/30 border border-slate-600/40 text-[9px] text-slate-300">
                                            {s.duration_minutes}m
                                          </span>
                                        )}
                                      </span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ol>
                          </div>
                        )}

                        {/* Action button */}
                        {isCompleted ? (
                          <div className="w-full py-2 text-center text-[10px] font-bold uppercase tracking-widest border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
                            ✓ {t('quest.completed', 'Completed')}
                          </div>
                        ) : !run ? (
                          <button
                            onClick={() => handleInitialize(tpl)}
                            className="w-full py-2 text-[10px] font-bold tracking-[0.2em] uppercase border bg-blue-500/10 border-blue-500/40 text-blue-300 hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2"
                          >
                            <Play className="w-3 h-3" /> {t('quests.initializeQuest')}
                          </button>
                        ) : !expanded ? (
                          <button
                            onClick={() => setExpandedId(tpl.id)}
                            className="w-full py-2 text-[10px] font-bold tracking-[0.2em] uppercase border bg-slate-900 border-blue-500/40 text-blue-300 hover:bg-blue-500/10 transition-all"
                          >
                            {t('quest.viewSteps', 'View Steps')} ({doneCount}/{total})
                          </button>
                        ) : (
                          <button
                            onClick={() => handleClaim(tpl)}
                            disabled={!allDone}
                            className={cn(
                              'w-full py-2 text-[10px] font-bold tracking-[0.2em] uppercase border transition-all flex items-center justify-center gap-2',
                              allDone
                                ? 'bg-green-500/20 border-green-500/40 text-green-300 hover:bg-green-500/30'
                                : 'bg-slate-900 border-slate-700 text-slate-600 cursor-not-allowed'
                            )}
                          >
                            <Check className="w-3 h-3" />
                            {allDone ? t('quest.claim', 'Complete & Claim') : t('quest.completeAllSteps', 'Complete all steps')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {sponsoredAds.map(ad => (
                <SponsoredMissionCard key={ad.id} ad={ad} />
              ))}
            </>
          )}
        </div>
      </main>

      <RecoveryAssessmentModal open={showRecovery} onClose={() => setShowRecovery(false)} />
      <BottomNav />
    </div>
  );
};

export default Quests;
