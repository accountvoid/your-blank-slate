import React, { useState, useEffect } from 'react';
import { useGameState } from '@/hooks/useGameState';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { BottomNav } from '@/components/BottomNav';
import { Coins, Loader2, AlertTriangle, ShieldAlert, X, Zap, CreditCard, Wallet, Image as ImageIcon, CheckCircle2, QrCode, ArrowRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const Market = () => {
  const { gameState, purchaseItem, mergeCuttingStones } = useGameState();
  const { playPurchase } = useSoundEffects();
  const { t } = useTranslation();
  const cuttingStonesOwned = (gameState.inventory || []).find(i => i.id === 'cutting_stones')?.quantity || 0;
  const CUTTING_NEED = 5;
  
  // نظام المسح الجديد
  const [isScanning, setIsScanning] = useState(false);
  const [isExiting, setIsExiting] = useState(false); 
  const [isVisible, setIsVisible] = useState(false);
  const [scanResult, setScanResult] = useState<'idle' | 'searching' | 'failed'>('idle');
  const [activeItem, setActiveItem] = useState(null);

  // --- حالات متجر الذهب ---
  const [showGoldShop, setShowGoldShop] = useState(false);
  const [goldShopExiting, setGoldShopExiting] = useState(false);
  const [paymentStep, setPaymentStep] = useState('offers');
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [transactionId, setTransactionId] = useState('');

  const GOLD_OFFERS = [
    { id: 'g1', gold: 1000, price: 0.5, rarity: 'E' },
    { id: 'g2', gold: 5000, price: 2.0, rarity: 'C' },
    { id: 'g3', gold: 15000, price: 5.0, rarity: 'B' },
    { id: 'g4', gold: 50000, price: 15.0, rarity: 'A' },
  ];

  const RARITY_CONFIG = {
    S: { border: 'border-gray-900', text: 'text-gray-400', locked: true },
    A: { border: 'border-purple-500', text: 'text-purple-400', locked: true },
    B: { border: 'border-blue-500', text: 'text-blue-400', locked: false },
    C: { border: 'border-white/50', text: 'text-white', locked: false },
    E: { border: 'border-gray-600', text: 'text-gray-400', locked: false },
  };

  const SOLO_ITEMS = [
    { id: 'hp_elixir',      i18nKey: 'items.hp_elixir',      category: 'consumable',       difficulty: 'E', price: 300,   icon: '🧪', rankLevel: 0, extra: t('items.stats.useOnly') },
    { id: 'mp_elixir',      i18nKey: 'items.mp_elixir',      category: 'consumable',       difficulty: 'E', price: 300,   icon: '⚡', rankLevel: 0, extra: t('items.stats.useOnly') },
    { id: 'xp_book',        i18nKey: 'items.xp_book',        category: 'consumable',       difficulty: 'E', price: 250,   icon: '📚', rankLevel: 0, extra: t('items.stats.useOnly') },
    { id: 'stone_dagger',   i18nKey: 'items.stone_dagger',   category: 'weapon',           difficulty: 'D', price: 600,   icon: '🗡️', rankLevel: 0, extra: `+16 ${t('items.stats.health')} · +23 ${t('items.stats.damage')} · 150 ${t('items.stats.blows')}` },
    { id: 'shadow_dagger',  i18nKey: 'items.shadow_dagger',  category: 'weapon',           difficulty: 'B', price: 11000, icon: '🗡️', rankLevel: 0, extra: `+92 ${t('items.stats.health')} · +231 ${t('items.stats.damage')} · 600 ${t('items.stats.blows')}` },
    { id: 'cutting_stones', i18nKey: 'items.cutting_stones', category: 'special_material', difficulty: 'C', price: 7000,  icon: '💎', rankLevel: 0, extra: '' },
    { id: 'mana_analyst',   i18nKey: 'items.mana_analyst',   category: 'utility',          difficulty: 'D', price: 1000,  icon: '📊', rankLevel: 0, extra: t('items.stats.usesCount', { count: 2 }) },
  ].map(i => ({ ...i, name: t(`${i.i18nKey}.name`), arabicName: t(`${i.i18nKey}.name`), description: t(`${i.i18nKey}.description`) }));

  const getPlayerRank = () => {
    const level = gameState.totalLevel || 1;
    if (level >= 96) return 'S';
    if (level >= 71) return 'A';
    if (level >= 46) return 'B';
    if (level >= 26) return 'C';
    if (level >= 11) return 'D';
    return 'E';
  };

  const rankOrder = { 'E': 0, 'D': 1, 'C': 2, 'B': 3, 'A': 4, 'S': 5 };
  const playerRank = getPlayerRank();
  const canSeeItem = (item) => rankOrder[playerRank] >= rankOrder[item.difficulty];

  const startSystemScan = (item) => {
    setActiveItem(item);
    setIsScanning(true);
    setIsExiting(false);
    setScanResult('searching');
    setTimeout(() => setIsVisible(true), 50);
    setTimeout(() => setScanResult('failed'), 3000);
  };

  const closeScanModal = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsScanning(false);
      setIsExiting(false);
      setIsVisible(false);
      setScanResult('idle');
      setActiveItem(null);
    }, 800);
  };

  const handlePurchase = (item) => {
    if (!canSeeItem(item)) { startSystemScan(item); return; }
    if (gameState.gold >= item.price) {
      purchaseItem(item.id);
      playPurchase();
      toast({ title: t('common.successTitle'), description: t('market.successAcquired', { name: item.name }) });
    } else {
      toast({ title: t('common.warningTitle'), description: t('market.insufficientGold'), variant: 'destructive' });
    }
  };

  const handleMaxPurchase = (item) => {
    if (!canSeeItem(item)) { startSystemScan(item); return; }
    const maxAffordable = Math.floor(gameState.gold / item.price);
    if (maxAffordable > 0) {
      for (let i = 0; i < maxAffordable; i++) purchaseItem(item.id);
      playPurchase();
      toast({ title: t('common.successTitle'), description: t('market.maxAcquired', { count: maxAffordable, name: item.name }) });
    } else {
      toast({ title: t('common.warningTitle'), description: t('market.insufficientGold'), variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] text-white p-3 font-sans pb-24 overflow-x-hidden">
      {/* (الأنظمة المساعدة للمودال والذهب تم دمجها هنا كجزء من المكون الواحد) */}
      
      {/* System Scan Modal */}
      {isScanning && (
        <div className={cn("fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md transition-all duration-[1000ms]", isVisible && !isExiting ? "bg-black/90" : "bg-black/0 pointer-events-none")}>
          <div className={cn("relative bg-[#050b18] border-x border-white/40 shadow-[0_0_50px_rgba(59,130,246,0.4)] max-w-sm w-full font-mono overflow-hidden transition-all ease-[cubic-bezier(0.2,1,0.2,1)] origin-center", isVisible && !isExiting ? "opacity-100 scale-y-100 duration-[1000ms]" : "opacity-0 scale-y-0 duration-[800ms]")}>
            <div className={cn("absolute top-0 left-0 right-0 h-[1px] bg-white shadow-[0_0_15px_rgba(255,255,255,1)] transition-all duration-[1500ms]", isVisible && !isExiting ? "scale-x-100" : "scale-x-0")} />
            <div className="p-6 text-center space-y-4">
              <h2 className="text-blue-400 text-lg font-bold tracking-[0.2em] uppercase italic drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]">
                {scanResult === 'searching' ? t('market.scan.analyzing') : t('market.scan.denied')}
              </h2>
              {scanResult === 'searching' ? (
                <div className="py-10 flex flex-col items-center gap-4">
                  <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                  <p className="text-[10px] text-blue-200 animate-pulse tracking-[0.3em] uppercase">{t('market.scan.bypassing')}</p>
                </div>
              ) : (
                <div className="py-2 flex flex-col items-start gap-4 w-full text-left">
                   <div className="w-full border border-blue-500/30 p-4 bg-blue-950/20">
                      <p className="text-xs text-red-500 font-bold mb-2 uppercase tracking-tighter italic">{t('market.scan.warning', { name: activeItem?.name })}</p>
                      <button onClick={closeScanModal} className="w-full py-4 bg-white text-black font-black text-[11px] tracking-[0.5em] uppercase">{t('market.scan.terminate')}</button>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* بقية المتجر والمحتوى */}
      <header className="relative z-10 flex justify-center items-center mb-6 pt-4 gap-4">
         <h1 className="text-xl font-bold uppercase italic text-blue-400">{t('market.systemStore')}</h1>
      </header>

      <main className="relative z-10 max-w-md mx-auto space-y-12 animate-in fade-in duration-1000">
        {SOLO_ITEMS.map((item) => {
          const isRevealed = canSeeItem(item);
          return (
            <div key={item.id} className="relative bg-black/60 border-2 border-slate-200/90 p-4 shadow-[0_0_20px_rgba(30,58,138,0.3)]">
               <div className="flex justify-center mb-4 mt-[-1.5rem]">
                  <h2 className="text-xs font-bold bg-slate-900/90 px-4 py-0.5 border border-slate-400/50">
                    ITEM: <span className="text-blue-100">{isRevealed ? (item.arabicName || item.name) : t('market.notFound')}</span>
                  </h2>
               </div>
               <button
                  onClick={() => handlePurchase(item)}
                  className={cn("w-full py-3 text-[10px] font-bold uppercase border", !isRevealed ? "bg-blue-900/40 border-blue-500/50 text-blue-400" : "bg-blue-500/10 border-blue-400/40 text-blue-300")}
               >
                  {!isRevealed ? t('market.analyze') : t('market.purchase')}
               </button>
            </div>
          );
        })}
      </main>
      <BottomNav />
    </div>
  );
};

export default Market;
