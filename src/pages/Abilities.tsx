import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BottomNav } from '@/components/BottomNav';
import { useGameState } from '@/hooks/useGameState';
import { Zap, Swords, Target, ArrowUp, Lock, Sparkles, Cpu, ShieldAlert, Hourglass, Coins, Diamond } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// لا تغيير في المنطق (Logic)
const SKILL_LEVEL_MULTIPLIERS = [1, 1.3, 1.6, 2.0, 2.5, 3.0] as const;
const SKILL_TIME_REDUCERS = [0, 0.05, 0.1, 0.15, 0.2, 0.25] as const;
const STONE_COSTS = [0, 2, 4, 10, 25, 50] as const;
const GOLD_COSTS = [0, 250, 600, 1500, 3500, 8000] as const;
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

const saveSkillLevels = (levels: SkillLevels) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
};

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

  const skills: Array<{ id: SkillId; name: string; nameEn: string; icon: JSX.Element; color: SkillColor; mpCost: number; description: string; multiplier: number; baseCastTime: number; unlocked: boolean; tag: string; }> = [
    { id: 'basicAttack', name: 'نصل الجليد الفضي', nameEn: 'Silver Ice Blade', icon: <Swords className="w-8 h-8" />, color: 'silver', mpCost: 5, description: 'هجوم قياسي مشبع بمانا الجليد الفضي.', multiplier: 1, baseCastTime: 0.5, unlocked: true, tag: 'Physical' },
    { id: 'thunderDash', name: 'اندفاع البرق الأزرق السماوي', nameEn: 'Celestial Blue Thunder', icon: <Zap className="w-8 h-8" />, color: 'blue', mpCost: 50, description: 'صعق الأعداء بمانا البرق الأزرق.', multiplier: 3, baseCastTime: 1.5, unlocked: true, tag: 'Ultimate' },
    { id: 'daggerStrike', name: 'اغتيال الظلال البنفسجية', nameEn: 'Violet Shadow Assassination', icon: <Target className="w-8 h-8" />, color: 'violet', mpCost: 25, description: 'طعنة تخترق الدفاعات السحرية.', multiplier: 2, baseCastTime: 1.0, unlocked: hasDagger, tag: 'Stealth' },
  ];

  const requestUpgrade = (skillId: SkillId) => {
    const currentLevel = skillLevels[skillId] || 1;
    if (currentLevel >= MAX_SKILL_LEVEL) { toast({ title: 'SYSTEM', description: t('abilities.errors.max') }); return; }
    const stoneCost = STONE_COSTS[currentLevel];
    const goldCost = GOLD_COSTS[currentLevel];
    if (coreStones < stoneCost) { toast({ title: 'SYSTEM', description: t('abilities.errors.noStones', { count: stoneCost }), variant: 'destructive' }); return; }
    if (gold < goldCost) { toast({ title: 'SYSTEM', description: t('abilities.errors.noGold', { count: goldCost }), variant: 'destructive' }); return; }
    setPendingUpgrade(skillId);
  };

  const confirmUpgrade = () => {
    if (!pendingUpgrade) return;
    const skillId = pendingUpgrade;
    const currentLevel = skillLevels[skillId] || 1;
    const stoneCost = STONE_COSTS[currentLevel];
    const goldCost = GOLD_COSTS[currentLevel];
    if (coreStones < stoneCost || gold < goldCost) { toast({ title: 'SYSTEM', description: 'موارد غير كافية', variant: 'destructive' }); setPendingUpgrade(null); return; }
    if (goldCost > 0 && !spendGold(goldCost)) { toast({ title: 'SYSTEM', description: 'خطأ في الذهب', variant: 'destructive' }); setPendingUpgrade(null); return; }
    consumeItem('enhancement_stone', stoneCost);
    const newLevels: SkillLevels = { ...skillLevels, [skillId]: currentLevel + 1 };
    setSkillLevels(newLevels);
    saveSkillLevels(newLevels);
    toast({ title: 'SYSTEM UPGRADE', description: t('abilities.success') });
    setPendingUpgrade(null);
  };

  const colors = {
    silver: { border: 'border-zinc-400', text: 'text-zinc-100', glow: 'shadow-zinc-700/50' },
    blue: { border: 'border-blue-500', text: 'text-blue-300', glow: 'shadow-blue-800/60' },
    violet: { border: 'border-fuchsia-600', text: 'text-fuchsia-200', glow: 'shadow-fuchsia-800/70' },
  };

  return (
    <div className="min-h-screen bg-[#020408] text-white p-4 pb-32">
      {/* Header with Logo */}
      <header className="flex flex-col items-center py-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-px bg-gradient-to-r from-transparent to-white/50" />
          <img src="/src/assets/SETVOIDUI.png" alt="SETVOID" className="h-12 w-auto" />
          <div className="w-16 h-px bg-gradient-to-l from-transparent to-white/50" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-[0.2em]">ABILITIES</h1>
      </header>

      <main className="max-w-xl mx-auto space-y-6">
        {skills.map((skill) => {
          const level = skillLevels[skill.id] || 1;
          const style = colors[skill.color];
          const idx = Math.min(level - 1, MAX_SKILL_LEVEL - 1);
          const currentDmg = Math.floor(baseDmg * skill.multiplier * SKILL_LEVEL_MULTIPLIERS[idx]);
          const currentCastTime = skill.baseCastTime * (1 - SKILL_TIME_REDUCERS[idx]);
          const stoneCost = level < MAX_SKILL_LEVEL ? STONE_COSTS[level] : 0;
          const goldCost = level < MAX_SKILL_LEVEL ? GOLD_COSTS[level] : 0;
          const canUpgrade = skill.unlocked && level < MAX_SKILL_LEVEL && coreStones >= stoneCost && gold >= goldCost;

          return (
            <div key={skill.id} className={cn("relative p-6 rounded-2xl border bg-black/60 overflow-hidden", style.border, style.glow)}>
              {/* Logo Background */}
              <img src="/src/assets/SETVOIDUI.png" className="absolute -bottom-10 -right-10 w-40 opacity-[0.03] pointer-events-none" />
              
              <div className="flex items-center gap-4">
                <div className={cn("p-4 rounded-xl border bg-black", style.border)}>{skill.icon}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-black uppercase">{skill.name}</h3>
                  <p className="text-[10px] uppercase text-zinc-500 font-bold">{skill.tag} • Rank {RANK_LABELS[idx]}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                  <p className="text-[9px] text-zinc-500 uppercase">Damage</p>
                  <p className="font-black text-lg">{currentDmg}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                  <p className="text-[9px] text-zinc-500 uppercase">Cast Time</p>
                  <p className="font-black text-lg">{currentCastTime.toFixed(1)}s</p>
                </div>
              </div>

              {level < MAX_SKILL_LEVEL ? (
                <button 
                  onClick={() => requestUpgrade(skill.id)} 
                  disabled={!canUpgrade}
                  className={cn("mt-6 w-full py-3 rounded-lg border font-black uppercase text-[11px] flex justify-between px-4 transition-all", 
                  canUpgrade ? "bg-white/10 hover:bg-white/20" : "opacity-30 cursor-not-allowed")}
                >
                  <span>Upgrade</span>
                  <div className="flex gap-4">
                    <span className="flex items-center gap-1 text-yellow-400"><Coins size={12}/> {goldCost}</span>
                    <span className="flex items-center gap-1 text-blue-400"><Diamond size={12}/> {stoneCost}</span>
                  </div>
                </button>
              ) : (
                <div className="mt-6 w-full py-3 text-center text-[10px] font-black uppercase text-zinc-600 bg-black border border-zinc-800 rounded-lg">MAXED</div>
              )}
            </div>
          );
        })}
      </main>

      <AlertDialog open={!!pendingUpgrade} onOpenChange={() => setPendingUpgrade(null)}>
        <AlertDialogContent className="bg-black border border-zinc-800">
          <AlertDialogHeader><AlertDialogTitle className="text-white uppercase tracking-widest">تأكيد الترقية</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900">إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUpgrade} className="bg-blue-600">تأكيد</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <BottomNav />
    </div>
  );
};

export default Abilities;
