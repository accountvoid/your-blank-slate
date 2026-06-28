import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, AlertTriangle, Dumbbell, Brain, Heart, Zap, Clock, Coins, Sparkles, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuestTemplate, QuestRun, QuestStep } from '@/hooks/useMainQuests';

interface Props {
  template: QuestTemplate;
  run: QuestRun | undefined;
  onStart: () => void;
  onToggleStep: (step: QuestStep) => void;
  onComplete: () => void;
}

const catIcon = { strength: Dumbbell, mind: Brain, spirit: Heart, agility: Zap } as const;
const catLabel: Record<QuestTemplate['category'], string> = { strength: 'STR', mind: 'INT', spirit: 'SPR', agility: 'AGI' };
const catColor: Record<QuestTemplate['category'], string> = {
  strength: 'text-red-300 border-red-500/40',
  mind: 'text-blue-300 border-blue-500/40',
  spirit: 'text-emerald-300 border-emerald-500/40',
  agility: 'text-amber-300 border-amber-500/40',
};

export function MainQuestCard({ template, run, onStart, onToggleStep, onComplete }: Props) {
  const { t, i18n } = useTranslation();
  const ar = i18n.language?.startsWith('ar');
  const Icon = catIcon[template.category];

  const title = ar ? template.title_ar : template.title_en;
  const desc = ar ? template.description_ar : template.description_en;
  const warning = ar ? template.warning_ar : template.warning_en;

  const total = template.steps.length;
  const completedCount = useMemo(
    () => template.steps.filter(s => run?.step_progress?.[s.id]).length,
    [template.steps, run]
  );
  const percent = total ? Math.round((completedCount / total) * 100) : 0;
  const allDone = total > 0 && completedCount === total;
  const isCompleted = run?.status === 'completed';

  return (
    <div className={cn('relative bg-[#050b18]/95 border-2 border-slate-200/20 shadow-[0_0_25px_rgba(30,58,138,0.25)] overflow-hidden')}>
      {/* grid pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-10 bg-[linear-gradient(rgba(56,189,248,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.5)_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* header chip */}
      <div className="relative flex justify-center -mt-3">
        <div className={cn('px-3 py-0.5 bg-slate-900/95 border text-[9px] font-black tracking-[0.3em] uppercase flex items-center gap-2', catColor[template.category])}>
          <Icon className="w-3 h-3" />
          {catLabel[template.category]} · {t('quest.mainQuest', 'Main Quest')}
        </div>
      </div>

      <div className="relative p-4 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide uppercase italic">{title}</h3>
          <p className="mt-1 text-[11px] text-slate-300/90 leading-relaxed">{desc}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[10px]">
          <div className="border border-slate-700/60 bg-black/30 p-2">
            <div className="flex items-center gap-1 text-slate-400"><Clock className="w-3 h-3" />{t('quest.time', 'Time')}</div>
            <div className="mt-0.5 font-bold text-white">{template.estimated_minutes}m</div>
          </div>
          <div className="border border-slate-700/60 bg-black/30 p-2">
            <div className="flex items-center gap-1 text-slate-400"><Sparkles className="w-3 h-3" />{t('quest.xp', 'XP')}</div>
            <div className="mt-0.5 font-bold text-blue-300">+{template.xp_reward}</div>
          </div>
          <div className="border border-slate-700/60 bg-black/30 p-2">
            <div className="flex items-center gap-1 text-slate-400"><Coins className="w-3 h-3" />{t('quest.gold', 'Gold')}</div>
            <div className="mt-0.5 font-bold text-yellow-300">+{template.gold_reward}</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[9px] uppercase tracking-widest">
          <span className="text-slate-500">{t('quest.difficulty', 'Difficulty')}</span>
          <span className={cn(
            'font-bold',
            template.difficulty === 'legendary' ? 'text-fuchsia-300' :
            template.difficulty === 'hard' ? 'text-red-300' :
            template.difficulty === 'medium' ? 'text-amber-300' : 'text-emerald-300'
          )}>{t(`quest.difficulty_${template.difficulty}`, template.difficulty)}</span>
        </div>

        {warning && (
          <div className="flex gap-2 border-l-2 border-amber-500 bg-amber-500/10 p-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-100 leading-relaxed">{warning}</p>
          </div>
        )}

        {/* steps */}
        <ol className="space-y-1.5">
          {template.steps.map((s, idx) => {
            const done = !!run?.step_progress?.[s.id];
            const stitle = ar ? s.title_ar : s.title_en;
            const sdetail = ar ? s.detail_ar : s.detail_en;
            const reps = Array.isArray(s.reps) ? s.reps : null;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={!run || isCompleted}
                  onClick={() => onToggleStep(s)}
                  className={cn(
                    'w-full text-left flex gap-2 items-start p-2 border transition',
                    done ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-700/60 bg-black/30',
                    (!run || isCompleted) && 'cursor-default opacity-90'
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

        {/* progress bar */}
        {run && (
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] uppercase tracking-widest text-slate-400">
              <span>{t('quest.progress', 'Progress')}</span>
              <span className="text-blue-300">{percent}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-fuchsia-500 transition-all duration-500" style={{ width: `${percent}%` }} />
            </div>
          </div>
        )}

        {/* action */}
        {isCompleted ? (
          <div className="w-full py-2 text-center text-[10px] font-bold uppercase tracking-widest border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
            ✓ {t('quest.completed', 'Completed')}
          </div>
        ) : !run ? (
          <button
            onClick={onStart}
            className="w-full py-2.5 text-[10px] font-black uppercase tracking-[0.2em] bg-blue-600 text-white border border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:bg-blue-500 active:scale-95 transition flex items-center justify-center gap-2"
          >
            <Play className="w-3 h-3" /> {t('quest.accept', 'Accept Quest')}
          </button>
        ) : (
          <button
            onClick={onComplete}
            disabled={!allDone}
            className={cn(
              'w-full py-2.5 text-[10px] font-black uppercase tracking-[0.2em] border transition flex items-center justify-center gap-2',
              allDone
                ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-emerald-500 active:scale-95'
                : 'bg-slate-900 border-slate-700 text-slate-600 cursor-not-allowed'
            )}
          >
            <Check className="w-3 h-3" /> {allDone ? t('quest.claim', 'Complete & Claim') : t('quest.completeAllSteps', 'Complete all steps')}
          </button>
        )}
      </div>
    </div>
  );
}
