import { useState } from 'react';
import { useGameState } from '@/hooks/useGameState';
import { BottomNav } from '@/components/BottomNav';
import { StatType } from '@/types/game';
import { Flag, Check, Calendar, Target, ChevronRight, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const suggestedTasks: Record<StatType, string[]> = {
  strength: ['30 Min Workout', '8 Cups of Water', '7 Hours Sleep', '5000 Steps'],
  mind: ['Read 30 Pages', 'Learn New Skill', 'No Social Media', 'Journaling'],
  spirit: ['Fajr on Time', 'Morning Athkar', 'Daily Charity', '100x Istighfar'],
  agility: ['20 Min Run', 'Stretching', 'Speed Drills', 'Jump Rope'],
};

const GrandQuest = () => {
  const { gameState, startGrandQuest, completeGrandQuestDay, consumeItem } = useGameState();
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<StatType>('strength');
  const [questTitle, setQuestTitle] = useState('');

  const categoryLabels: Record<StatType, string> = {
    strength: t('grandQuest.categories.strength'),
    mind: t('grandQuest.categories.mind'),
    spirit: t('grandQuest.categories.spirit'),
    agility: t('grandQuest.categories.agility'),
  };

  // Use grand quest stones from inventory
  const grandQuestStones = gameState.inventory?.find(i => i.id === 'grand_quest_stone')?.quantity || 0;

  const handleStart = () => {
    if (!questTitle.trim()) {
      toast({ title: t('common.errorTitle'), description: t('grandQuest.errors.enterTitle'), variant: 'destructive' });
      return;
    }

    if (grandQuestStones < 1) {
      toast({ 
        title: t('common.warningTitle'), 
        description: t('grandQuest.errors.stoneRequired'), 
        variant: 'destructive' 
      });
      return;
    }

    consumeItem('grand_quest_stone', 1);
    startGrandQuest(selectedCategory, questTitle, suggestedTasks[selectedCategory]);
    toast({ title: t('grandQuest.started'), description: t('grandQuest.startedDesc') });
  };

  const handleCompleteDay = () => {
    completeGrandQuestDay();
    toast({ title: t('grandQuest.progressSaved'), description: t('grandQuest.dayComplete', { day: (gameState.grandQuest?.completedDays || 0) + 1 }) });
  };

  return (
    <div className="min-h-screen bg-[#020817] text-white p-3 font-sans selection:bg-blue-500/30 pb-24">
      {/* Background Tech Overlay */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(29,78,216,0.15),transparent_70%)]" />
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_2px,3px_100%]" />
      </div>

      <header className="relative z-10 flex flex-col justify-center items-center mb-8 border-b border-blue-500/30 pb-3">
        <h1 className="text-xl font-bold tracking-[0.2em] uppercase italic text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">
          {t('grandQuest.title')}
        </h1>
        <div className="mt-2 flex items-center gap-2 bg-blue-500/10 border border-blue-500/40 px-3 py-0.5 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.2)]">
           <Zap className="w-3 h-3 text-cyan-400 fill-cyan-400" />
           <span className="text-[10px] font-black tracking-widest text-cyan-300">{t('grandQuest.questStones')}: {grandQuestStones}</span>
        </div>
      </header>

      <main className="relative z-10 max-w-md mx-auto">
        {gameState.grandQuest?.active ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="relative bg-black/60 border-2 border-slate-200/90 p-6 shadow-[0_0_30px_rgba(30,58,138,0.5)]">
              <div className="flex justify-center mb-6 mt-[-2.5rem]">
                <div className="border border-slate-400/50 px-4 py-1 bg-slate-900/90 shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                  <h2 className="text-[10px] font-bold tracking-widest text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.9)] uppercase">
                    {t('grandQuest.activeMission')}
                  </h2>
                </div>
              </div>

              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-black italic tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)] uppercase">
                    {gameState.grandQuest.title}
                  </h3>
                  <p className="text-[10px] text-blue-400 font-bold tracking-[0.3em] mt-1 uppercase">
                    {t('grandQuest.category')}: {categoryLabels[gameState.grandQuest.category]}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold tracking-widest text-white/70">
                    <span>{t('grandQuest.progress').toUpperCase()}</span>
                    <span className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">
                      {t('grandQuest.days', { done: gameState.grandQuest.completedDays })}
                    </span>
                  </div>
                  <div className="h-3 bg-slate-900 border border-white/20 rounded-none overflow-hidden p-[1px] shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-white shadow-[0_0_15px_rgba(255,255,255,0.9)] transition-all duration-1000"
                      style={{ width: `${(gameState.grandQuest.completedDays / 30) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="bg-blue-950/20 border border-white/10 p-4 space-y-3 backdrop-blur-sm">
                  <p className="text-[9px] font-bold text-blue-400 tracking-widest uppercase mb-2">{t('grandQuest.dailyRequirements')}:</p>
                  {gameState.grandQuest.dailyTasks.map((task, index) => (
                    <div key={index} className="flex items-center gap-3 text-xs text-slate-300 italic group">
                      <div className="w-1.5 h-1.5 bg-white shadow-[0_0_8px_white] group-hover:scale-125 transition-transform" />
                      {task}
                    </div>
                  ))}
                </div>

                <button 
                  onClick={handleCompleteDay} 
                  className="w-full py-4 bg-gradient-to-b from-blue-500/20 to-blue-900/30 hover:from-blue-500/30 hover:to-blue-900/40 border border-white/40 text-white text-xs font-black tracking-[0.3em] uppercase transition-all shadow-[0_0_20px_rgba(30,58,138,0.4)] active:scale-95 group"
                >
                  <span className="group-hover:drop-shadow-[0_0_5px_white]">{t('grandQuest.completeToday')}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in zoom-in-95 slide-in-from-top-4 duration-500">
            <div className="relative bg-black/60 border-2 border-slate-200/90 p-6 shadow-[0_0_25px_rgba(30,58,138,0.4)]">
              <div className="flex justify-center mb-6 mt-[-2.5rem]">
                <div className="border border-slate-400/50 px-4 py-1 bg-slate-900/90 shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                  <h2 className="text-[10px] font-bold tracking-widest text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.9)] uppercase">
                    {t('grandQuest.initializeNew')}
                  </h2>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/20 rounded-sm">
                   <div className="flex items-center gap-2">
                     <Zap className="w-4 h-4 text-red-500" />
                     <span className="text-[10px] font-bold text-red-200 tracking-tighter">{t('grandQuest.initCost').toUpperCase()}:</span>
                   </div>
                   <span className="text-xs font-black text-white drop-shadow-[0_0_5px_red]">{t('grandQuest.oneStone')}</span>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-blue-400 tracking-widest uppercase ml-1">{t('grandQuest.missionTitle')}</label>
                  <input
                    placeholder={t('grandQuest.missionTitlePlaceholder')}
                    value={questTitle}
                    onChange={(e) => setQuestTitle(e.target.value)}
                    className="w-full bg-black/50 border border-slate-700 p-3 text-sm focus:border-white focus:bg-blue-950/20 outline-none transition-all italic text-white"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[9px] font-bold text-blue-400 tracking-widest uppercase ml-1">{t('grandQuest.selectType')}</label>
                  <div className="grid grid-cols-1 gap-2">
                    {(Object.entries(categoryLabels) as [StatType, string][]).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setSelectedCategory(key)}
                        className={cn(
                          "flex justify-between items-center p-3 border transition-all text-[10px] font-bold tracking-widest uppercase relative overflow-hidden",
                          selectedCategory === key 
                            ? "bg-white/10 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
                            : "bg-black/20 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300"
                        )}
                      >
                        {selectedCategory === key && <div className="absolute inset-0 bg-blue-500/10 animate-pulse" />}
                        <span className="relative z-10">{label}</span>
                        {selectedCategory === key && <ChevronRight className="w-3 h-3 text-white relative z-10" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-blue-950/30 border border-blue-500/20 backdrop-blur-md">
                   <p className="text-[9px] font-bold text-blue-400 tracking-widest uppercase mb-2 italic underline decoration-blue-500/50">{t('grandQuest.systemSuggestions')}:</p>
                   <ul className="grid grid-cols-2 gap-2">
                    {suggestedTasks[selectedCategory].map((task, index) => (
                      <li key={index} className="text-[9px] text-slate-300 uppercase italic flex items-center gap-1.5">
                        <span className="w-1 h-1 bg-blue-400 rounded-full shadow-[0_0_3px_cyan]" />
                        {task}
                      </li>
                    ))}
                   </ul>
                </div>

                <button 
                  onClick={handleStart} 
                  disabled={grandQuestStones < 1}
                  className={cn(
                    "w-full py-4 font-black text-xs tracking-[0.4em] uppercase transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-95 border-2",
                    grandQuestStones >= 1 
                      ? "bg-white text-black hover:bg-cyan-50 border-white cursor-pointer" 
                      : "bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed opacity-50"
                  )}
                >
                  {grandQuestStones >= 1 ? t('grandQuest.accept') : t('grandQuest.insufficient')}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default GrandQuest;
