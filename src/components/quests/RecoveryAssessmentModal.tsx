import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRecoveryProfile } from '@/hooks/useRecoveryProfile';
import { cn } from '@/lib/utils';
import { Moon, Apple, Beef, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

type Answer = boolean | null;

export function RecoveryAssessmentModal({ open, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const { save } = useRecoveryProfile();
  const [sleep, setSleep] = useState<Answer>(null);
  const [nutrition, setNutrition] = useState<Answer>(null);
  const [protein, setProtein] = useState<Answer>(null);

  if (!open) return null;

  const canSave = sleep !== null && nutrition !== null && protein !== null;

  const submit = () => {
    if (!canSave) return;
    save({ sleep: !!sleep, nutrition: !!nutrition, protein: !!protein });
    onSaved?.();
    onClose();
  };

  const Q = ({ icon: Icon, text, value, onChange }: { icon: any; text: string; value: Answer; onChange: (v: boolean) => void }) => (
    <div className="border border-blue-500/30 bg-blue-950/20 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-blue-300" />
        <span className="text-xs text-slate-200">{text}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onChange(true)}
          className={cn(
            'py-2 text-[10px] font-bold uppercase tracking-widest border transition',
            value === true ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200' : 'border-slate-700 text-slate-400 hover:border-emerald-500/40'
          )}
        >
          {t('recovery.yes', 'Yes')}
        </button>
        <button
          onClick={() => onChange(false)}
          className={cn(
            'py-2 text-[10px] font-bold uppercase tracking-widest border transition',
            value === false ? 'bg-red-500/20 border-red-400 text-red-200' : 'border-slate-700 text-slate-400 hover:border-red-500/40'
          )}
        >
          {t('recovery.no', 'No')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-sm bg-[#050b18] border border-blue-500/40 shadow-[0_0_50px_rgba(59,130,246,0.25)] p-5 space-y-4">
        <button onClick={onClose} className="absolute top-2 right-2 text-slate-500 hover:text-white">
          <X className="w-4 h-4" />
        </button>
        <div className="text-center space-y-1">
          <div className="text-[9px] font-black tracking-[0.4em] text-blue-400 uppercase">
            {t('recovery.title', 'Recovery Assessment')}
          </div>
          <p className="text-[10px] text-slate-400">
            {t('recovery.subtitle', 'Three quick questions to tailor your weekly STR program.')}
          </p>
        </div>

        <Q icon={Moon} text={t('recovery.q_sleep', 'Is your sleep good?')} value={sleep} onChange={setSleep} />
        <Q icon={Apple} text={t('recovery.q_nutrition', 'Is your nutrition good?')} value={nutrition} onChange={setNutrition} />
        <Q icon={Beef} text={t('recovery.q_protein', 'Do you consume enough protein regularly?')} value={protein} onChange={setProtein} />

        <button
          onClick={submit}
          disabled={!canSave}
          className={cn(
            'w-full py-3 text-[10px] font-black uppercase tracking-widest border transition',
            canSave ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
          )}
        >
          {t('recovery.save', 'Save & Continue')}
        </button>
      </div>
    </div>
  );
}
