import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BottomNav } from '@/components/BottomNav';
import { useGameState } from '@/hooks/useGameState';
import { Zap, Swords, Target, ArrowUp, Lock, Sparkles, Cpu, ShieldAlert, Hourglass, Coins, Diamond, Hexagon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const SKILL_LEVEL_MULTIPLIERS = [1, 1.3, 1.6, 2.0, 2.5, 3.0] as const;
const SKILL_TIME_REDUCERS = [0, 0.05, 0.1, 0.15, 0.2, 0.25] as const;
const STONE_COSTS = [0, 0, 0, 10, 25, 50] as const;
const GOLD_COSTS = [0, 200, 500, 1200, 3000, 7000] as const;
const RANK_LABELS = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;
const MAX_SKILL_LEVEL = 6;

type SkillId = 'basicAttack' | 'thunderDash' | 'daggerStrike';
type SkillLevels = Record<SkillId, number>;
type SkillColor = 'silver' | 'blue' | 'violet';

const STORAGE_KEY = 'battle_skill_levels';

const getBaseDamage = (strengthLevel: number): number => {
  if (strengthLevel <= 1) return 1;
  if (strengthLevel <= 10) return Math.max(1, Math.floor(Math.pow(1000, (strengthLevel - 1) / 9)));
  return Math.floor(1000 + Math.pow(strengthLevel - 10, 0.7) * 100);
};

const loadSkillLevels = (): SkillLevels => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { basicAttack: 1, thunderDash: 1, daggerStrike: 1, ...JSON.parse(stored) };
  } catch { }
  return { basicAttack: 1, thunderDash: 1, daggerStrike: 1 };
};

const saveSkillLevels = (levels: SkillLevels) => localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));

const Abilities = () => {
  const { t } = useTranslation();
  const { gameState, consumeItem, spendGold } = useGameState();
  const [skillLevels, setSkillLevels] = useState<SkillLevels>(loadSkillLevels);
  const [pendingUpgrade, setPendingUpgrade] = useState<SkillId | null>(null);

  const strengthLevel = gameState.levels.strength || 1;
  const baseDmg = getBaseDamage(strengthLevel);
  const hasDagger = (gameState.inventory || []).some(i => i.id === 'dagger' && i.quantity > 0);
  const coreStones = (gameState.inventory || []).find(i => i.id === 'enhancement_stone')?.quantity || 0;
  const gold = gameState.gold || 0;

  const skills = [
    { id: 'basicAttack', name: 'نصل الجليد الفضي', nameEn: 'Silver Ice Blade', icon: <Swords className="w-8 h-8" />, color: 'silver' as SkillColor, mpCost: 5, description: 'هجوم قياسي مشبع بمانا الجليد الفضي.', multiplier: 1, baseCastTime: 0.5, unlocked: true, tag: 'Physical' },
    { id: 'thunderDash', name: 'اندفاع البرق الأزرق السماوي', nameEn: 'Celestial Blue Thunder', icon: <Zap className="w-8 h-8" />, color: 'blue' as SkillColor, mpCost: 50, description: 'صعق الأعداء بمانا البرق الأزرق.', multiplier: 3, baseCastTime: 1.5, unlocked: true, tag: 'Ultimate' },
    { id: 'daggerStrike', name: 'اغتيال الظلال البنفسجية', nameEn: 'Violet Shadow Assassination', icon: <Target className="w-8 h-8" />, color: 'violet' as SkillColor, mpCost: 25, description: 'طعنة تخترق الدفاعات السحرية.', multiplier: 2, baseCastTime: 1.0, unlocked: hasDagger, tag: 'Stealth' },
  ];

  const requestUpgrade = (skillId: SkillId) => {
    const currentLevel = skillLevels[skillId] || 1;
    if (currentLevel >= MAX_SKILL_LEVEL) return;
    setPendingUpgrade(skillId);
  };

  const confirmUpgrade = () => {
    if (!pendingUpgrade) return;
    const currentLevel = skillLevels[pendingUpgrade] || 1;
    spendGold(GOLD_COSTS[currentLevel]);
    if (STONE_COSTS[currentLevel] > 0) consumeItem('enhancement_stone', STONE_COSTS[currentLevel]);
    const newLevels = { ...skillLevels, [pendingUpgrade]: currentLevel + 1 };
    setSkillLevels(newLevels);
    saveSkillLevels(newLevels);
    setPendingUpgrade(null);
    toast({ title: 'SYSTEM UPGRADE', description: t('abilities.success') });
  };

  const colors = {
    silver: { border: 'border-zinc-400', text: 'text-zinc-100', bg: 'bg-zinc-800/20', bar: 'bg-zinc-300', glow: 'shadow-zinc-700/50' },
    blue: { border: 'border-blue-500', text: 'text-blue-300', bg: 'bg-blue-900/30', bar: 'bg-blue-400', glow: 'shadow-blue-800/60' },
    violet: { border: 'border-fuchsia-600', text: 'text-fuchsia-200', bg: 'bg-fuchsia-900/40', bar: 'bg-fuchsia-500', glow: 'shadow-fuchsia-800/70' },
  };

  return (
    <div className="min-h-screen bg-[#020408] text-white p-4 pb-32 font-sans relative overflow-hidden">
      <header className="relative z-10 flex flex-col items-center mb-10 pt-4">
        <div className="flex items-center gap-4 mb-2">
          <div className="h-px w-20 bg-gradient-to-r from-transparent to-zinc-400" />
          <img src="/src/assets/SETVOIDUI.png" alt="Logo" className="h-12 w-auto" />
          <div className="h-px w-20 bg-gradient-to-l from-transparent to-zinc-400" />
        </div>
        <h1 className="text-3xl font-black italic tracking-widest text-white uppercase">{t('abilities.title')}</h1>
      </header>

      <main className="relative z-10 max-w-xl mx-auto space-y-8">
        {skills.map((skill) => {
          const level = skillLevels[skill.id] || 1;
          const style = colors[skill.color];
          const idx = Math.min(level - 1, MAX_SKILL_LEVEL - 1);
          const currentDmg = Math.floor(baseDmg * skill.multiplier * SKILL_LEVEL_MULTIPLIERS[idx]);
          const currentCastTime = skill.baseCastTime * (1 - SKILL_TIME_REDUCERS[idx]);
          const stoneCost = STONE_COSTS[level];
          const goldCost = GOLD_COSTS[level];

          return (
            <div key={skill.id} className={cn("relative p-6 rounded-2xl border-l-[6px] overflow-hidden bg-black/80", style.border, style.glow)}>
              <img src="/src/assets/SETVOIDUI.png" className="absolute -right-10 -bottom-10 w-40 opacity-5 rotate-12" alt="bg" />
              <div className="flex items-start gap-4 relative z-10">
                <div className={cn("p-4 rounded-xl border", style.border, style.text)}>{skill.icon}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-white">{skill.name}</h3>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest">{skill.tag} • LVL {level}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6 relative z-10">
                <div className="bg-black/50 p-3 rounded-lg border border-zinc-800">
                   <p className="text-[9px] text-zinc-500 uppercase">Damage</p>
                   <p className="font-black text-lg">{currentDmg}</p>
                </div>
                <div className="bg-black/50 p-3 rounded-lg border border-zinc-800">
                   <p className="text-[9px] text-zinc-500 uppercase">Cast Time</p>
                   <p className="font-black text-lg">{currentCastTime.toFixed(1)}s</p>
                </div>
              </div>
              {level < MAX_SKILL_LEVEL ? (
                <button onClick={() => requestUpgrade(skill.id)} className="mt-6 w-full py-3 bg-zinc-900 border border-zinc-700 rounded-lg flex justify-between items-center px-4 font-black text-[11px] uppercase">
                  <span>Upgrade {RANK_LABELS[level]}</span>
                  <div className="flex gap-3">
                    <span className="flex items-center gap-1 text-yellow-400"><Coins size={12}/> {goldCost}</span>
                    {stoneCost > 0 && <span className="flex items-center gap-1 text-blue-300"><Diamond size={12}/> {stoneCost}</span>}
                  </div>
                </button>
              ) : <div className="mt-6 w-full py-3 text-center text-[10px] font-black uppercase text-zinc-600 bg-zinc-950 rounded-lg">MAXED</div>}
            </div>
          );
        })}
      </main>

      <AlertDialog open={!!pendingUpgrade} onOpenChange={() => setPendingUpgrade(null)}>
        <AlertDialogContent className="bg-black border border-blue-500">
          <AlertDialogHeader><AlertDialogTitle>تأكيد الترقية</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUpgrade}>تأكيد</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <BottomNav />
    </div>
  );
};

export default Abilities;
