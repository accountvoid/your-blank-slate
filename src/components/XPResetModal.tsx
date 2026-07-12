import { useState, useEffect } from 'react';
import { X, RotateCcw, Dumbbell, Brain, Heart, Zap, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameState, StatType } from '@/types/game';

interface XPResetModalProps {
  gameState: GameState;
  onClose: () => void;
  onConfirm: (allocation: Record<StatType, number>) => void;
}

export const XPResetModal = ({ gameState, onClose, onConfirm }: XPResetModalProps) => {
  // حساب مجموع XP الحالي
  const totalXP = gameState.stats.strength + gameState.stats.mind + gameState.stats.spirit + gameState.stats.agility;
  
  const [allocation, setAllocation] = useState<Record<StatType, number>>({
    strength: Math.floor(totalXP / 4),
    mind: Math.floor(totalXP / 4),
    spirit: Math.floor(totalXP / 4),
    agility: Math.floor(totalXP / 4) + (totalXP % 4),
  });

  const allocatedTotal = Object.values(allocation).reduce((sum, val) => sum + val, 0);
  const remaining = totalXP - allocatedTotal;

  const statConfig: Record<StatType, { label: string; icon: typeof Dumbbell; color: string }> = {
    strength: { label: 'القوة', icon: Dumbbell, color: 'text-red-400' },
    mind: { label: 'العقل', icon: Brain, color: 'text-blue-400' },
    spirit: { label: 'الروح', icon: Heart, color: 'text-purple-400' },
    agility: { label: 'اللياقة', icon: Zap, color: 'text-green-400' },
  };

  const handleChange = (stat: StatType, delta: number) => {
    const step = 100; // كل ضغطة تغير 100 XP
    const newVal = Math.max(0, allocation[stat] + (delta * step));
    
    // التأكد من عدم تجاوز الحد الأقصى
    const otherStats = Object.entries(allocation)
      .filter(([key]) => key !== stat)
      .reduce((sum, [_, val]) => sum + val, 0);
    
    if (newVal + otherStats <= totalXP) {
      setAllocation(prev => ({ ...prev, [stat]: newVal }));
    }
  };

  const handleDistributeEvenly = () => {
    const perStat = Math.floor(totalXP / 4);
    setAllocation({
      strength: perStat,
      mind: perStat,
      spirit: perStat,
      agility: perStat + (totalXP % 4),
    });
  };

  const handleMaxStat = (stat: StatType) => {
    const others = Object.keys(allocation).filter(k => k !== stat) as StatType[];
    setAllocation({
      ...allocation,
      [stat]: totalXP - others.reduce((sum, s) => sum + allocation[s], 0),
    });
  };

  const handleConfirm = () => {
    if (allocatedTotal === totalXP) {
      onConfirm(allocation);
    }
  };


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative max-w-md w-full bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-cyan-500/30 rounded-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-cyan-500/30 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white">إعادة توزيع نقاط XP</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Current Stats */}
        <div className="p-4 border-b border-slate-700">
          <div className="p-3 bg-slate-900/50 border border-slate-700 rounded mb-4">
            <p className="text-center text-sm text-slate-400">
              مجموع نقاط XP المتاحة للتوزيع:
            </p>
            <p className="text-center text-3xl font-bold text-cyan-400">{totalXP.toLocaleString()}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-slate-800/50 rounded">
              <span className="text-slate-500">القوة الحالية:</span>
              <span className="text-red-400 ml-2">{gameState.stats.strength.toLocaleString()}</span>
            </div>
            <div className="p-2 bg-slate-800/50 rounded">
              <span className="text-slate-500">العقل الحالي:</span>
              <span className="text-blue-400 ml-2">{gameState.stats.mind.toLocaleString()}</span>
            </div>
            <div className="p-2 bg-slate-800/50 rounded">
              <span className="text-slate-500">الروح الحالية:</span>
              <span className="text-purple-400 ml-2">{gameState.stats.spirit.toLocaleString()}</span>
            </div>
            <div className="p-2 bg-slate-800/50 rounded">
              <span className="text-slate-500">اللياقة الحالية:</span>
              <span className="text-green-400 ml-2">{gameState.stats.agility.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Allocation */}
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-slate-300">التوزيع الجديد</h4>
            <button
              onClick={handleDistributeEvenly}
              className="text-xs px-2 py-1 bg-cyan-600/20 text-cyan-400 rounded hover:bg-cyan-600/30"
            >
              توزيع بالتساوي
            </button>
          </div>

          {(Object.keys(statConfig) as StatType[]).map(stat => {
            const config = statConfig[stat];
            const Icon = config.icon;
            const newLevel = (() => {
              let level = 1;
              let accumulated = 0;
              while (level < 100) {
                const required = Math.floor(100 * Math.pow(1.22, level - 1));
                if (allocation[stat] < accumulated + required) break;
                accumulated += required;
                level++;
              }
              return level;
            })();
            const oldLevel = gameState.levels[stat];
            const levelChange = newLevel - oldLevel;

            return (
              <div key={stat} className="p-3 bg-slate-900/50 border border-slate-700 rounded space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-5 h-5", config.color)} />
                    <span className={cn("font-bold", config.color)}>{config.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleChange(stat, -1)}
                      className="w-8 h-8 flex items-center justify-center bg-red-900/30 border border-red-500/30 rounded text-red-400 hover:bg-red-900/50"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-24 text-center font-mono text-lg text-white">
                      {allocation[stat].toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleChange(stat, 1)}
                      disabled={remaining < 100}
                      className="w-8 h-8 flex items-center justify-center bg-green-900/30 border border-green-500/30 rounded text-green-400 hover:bg-green-900/50 disabled:opacity-30"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    المستوى الجديد: <span className={config.color}>Lv.{newLevel}</span>
                  </span>
                  {levelChange !== 0 && (
                    <span className={levelChange > 0 ? "text-green-400" : "text-red-400"}>
                      {levelChange > 0 ? `+${levelChange}` : levelChange}
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-slate-800 rounded overflow-hidden">
                  <div 
                    className={cn("h-full transition-all", config.color.replace('text-', 'bg-'))}
                    style={{ width: `${(allocation[stat] / totalXP) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}

          {/* Remaining */}
          {remaining > 0 && (
            <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded text-center">
              <span className="text-yellow-400 text-sm">
                متبقي للتوزيع: <span className="font-bold">{remaining.toLocaleString()}</span> XP
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 p-4 space-y-2">
          <button
            onClick={handleConfirm}
            disabled={allocatedTotal !== totalXP}
            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            تأكيد التوزيع
          </button>
          <p className="text-[10px] text-center text-slate-500">
            ⚠️ هذا الإجراء نهائي ويستهلك حجر إعادة التوزيع
          </p>
        </div>
      </div>
    </div>
  );
};
