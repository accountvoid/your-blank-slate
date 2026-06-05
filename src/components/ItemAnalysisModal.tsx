import { useState, useEffect } from 'react';
import { X, Zap, BarChart3, Loader2, Shield, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InventoryItem } from '@/types/game';

interface ItemAnalysisModalProps {
  item: InventoryItem | null;
  onClose: () => void;
}

export const ItemAnalysisModal = ({ item, onClose }: ItemAnalysisModalProps) => {
  const [phase, setPhase] = useState<'scanning' | 'complete'>('scanning');
  const [scanProgress, setScanProgress] = useState(0);

  useEffect(() => {
    if (!item) return;

    // محاكاة عملية التحليل
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setPhase('complete');
          return 100;
        }
        return prev + 5;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [item]);

  if (!item) return null;

  const getItemPower = () => {
    if (item.type === 'xp') return { power: item.effect, unit: 'XP' };
    if (item.type === 'health') return { power: item.effect, unit: '% HP' };
    if (item.type === 'energy') return { power: item.effect, unit: '% طاقة' };
    return { power: 0, unit: '' };
  };

  const getRarity = () => {
    if (item.effect >= 500) return { label: 'نادر', color: 'text-purple-400', border: 'border-purple-500' };
    if (item.effect >= 100) return { label: 'غير شائع', color: 'text-blue-400', border: 'border-blue-500' };
    return { label: 'عادي', color: 'text-gray-400', border: 'border-gray-500' };
  };

  const { power, unit } = getItemPower();
  const rarity = getRarity();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative max-w-sm w-full bg-gradient-to-b from-slate-900 to-black border border-cyan-500/30 overflow-hidden animate-scale-in">
        {/* Scanning line animation */}
        {phase === 'scanning' && (
          <div 
            className="absolute left-0 right-0 h-1 bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.8)] transition-all"
            style={{ top: `${scanProgress}%` }}
          />
        )}

        {/* Header */}
        <div className="p-4 border-b border-cyan-500/30 flex items-center justify-between bg-cyan-950/30">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-bold text-cyan-400 tracking-widest uppercase">
              {phase === 'scanning' ? 'جاري التحليل...' : 'اكتمل التحليل'}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {phase === 'scanning' ? (
            <div className="text-center py-10">
              <Loader2 className="w-16 h-16 text-cyan-500 animate-spin mx-auto mb-4" />
              <p className="text-cyan-400 text-sm animate-pulse">تحليل بنية العنصر...</p>
              <div className="mt-4 w-full h-2 bg-slate-800 rounded overflow-hidden">
                <div 
                  className="h-full bg-cyan-500 transition-all"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">{scanProgress}%</p>
            </div>
          ) : (
            <>
              {/* Item visualization */}
              <div className="text-center">
                <div className={cn(
                  "w-24 h-24 mx-auto rounded border-2 flex items-center justify-center bg-black/50 mb-4",
                  rarity.border
                )}>
                  <span className="text-5xl">{item.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-white">{item.name}</h3>
                <span className={cn("text-sm", rarity.color)}>{rarity.label}</span>
              </div>

              {/* Analysis results */}
              <div className="space-y-3">
                <div className="p-3 bg-slate-900/50 border border-slate-700 rounded flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-slate-400">قوة التأثير</span>
                  </div>
                  <span className="text-lg font-bold text-yellow-400">{power} {unit}</span>
                </div>

                <div className="p-3 bg-slate-900/50 border border-slate-700 rounded flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-slate-400">النوع</span>
                  </div>
                  <span className="text-sm font-bold text-blue-400">{item.category || item.type}</span>
                </div>

                <div className="p-3 bg-slate-900/50 border border-slate-700 rounded flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-slate-400">الكمية المتوفرة</span>
                  </div>
                  <span className="text-lg font-bold text-purple-400">x{item.quantity}</span>
                </div>
              </div>

              {/* Description */}
              <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded">
                <p className="text-xs text-cyan-300 text-center italic">
                  "{item.description}"
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {phase === 'complete' && (
          <div className="p-4 border-t border-cyan-500/30 bg-cyan-950/20">
            <button
              onClick={onClose}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded transition-all"
            >
              إغلاق
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
