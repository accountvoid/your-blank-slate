import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sword, Shield, ArrowLeft, Zap, Skull, Coins, Sparkles } from 'lucide-react';
import { useGameState } from '@/hooks/useGameState';
import { cn } from '@/lib/utils';
import { RANK_HEX_COLORS } from '@/lib/game-constants';

/**
 * Monster Battle - lightweight encounter screen for regular mobs.
 * Distinct from /battle which is reserved for Boss encounters.
 * - Simpler UI, faster pacing, fewer skills
 * - Goal: grinding XP & gold without the cinematic Boss overhead
 */

interface MonsterConfig {
  name: string;
  emoji: string;
  hpMult: number;
  power: number;
  speed: number;
  goldReward: number;
  xpReward: number;
  color: string;
}

const MONSTERS_BY_RANK: Record<string, MonsterConfig> = {
  E: { name: 'Goblin', emoji: '👺', hpMult: 3, power: 8,  speed: 2500, goldReward: 20,  xpReward: 5,  color: RANK_HEX_COLORS.E },
  D: { name: 'Wolf',   emoji: '🐺', hpMult: 6, power: 16, speed: 2200, goldReward: 50,  xpReward: 12, color: RANK_HEX_COLORS.D },
  C: { name: 'Orc',    emoji: '👹', hpMult: 12, power: 30, speed: 2000, goldReward: 120, xpReward: 25, color: RANK_HEX_COLORS.C },
  B: { name: 'Wraith', emoji: '👻', hpMult: 22, power: 55, speed: 1800, goldReward: 280, xpReward: 50, color: RANK_HEX_COLORS.B },
  A: { name: 'Demon',  emoji: '😈', hpMult: 40, power: 95, speed: 1700, goldReward: 600, xpReward: 100, color: RANK_HEX_COLORS.A },
  S: { name: 'Reaper', emoji: '💀', hpMult: 70, power: 160, speed: 1600, goldReward: 1500, xpReward: 250, color: RANK_HEX_COLORS.S },
};

const getBaseDamage = (str: number) => {
  if (str <= 1) return 5;
  if (str <= 10) return Math.max(5, Math.floor(Math.pow(500, (str - 1) / 9)));
  return Math.floor(500 + (str - 10) * 50);
};

const MonsterBattle = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { gameState, takeDamage } = useGameState();

  const rank = (params.get('rank') || 'E').toUpperCase();
  const monster = MONSTERS_BY_RANK[rank] || MONSTERS_BY_RANK['E'];

  const strLevel = gameState.levels.strength || 1;
  const agiLevel = gameState.levels.agility || 1;
  const baseDmg = getBaseDamage(strLevel);

  const maxHp = Math.max(50, baseDmg * monster.hpMult);
  const [hp, setHp] = useState(maxHp);
  const [playerHp, setPlayerHp] = useState(gameState.hp);
  const [log, setLog] = useState<string[]>([`⚔️ ${monster.name} ظهر!`]);
  const [hit, setHit] = useState(false);
  const [pHit, setPHit] = useState(false);
  const [shake, setShake] = useState(false);
  const [victory, setVictory] = useState(false);
  const [defeated, setDefeated] = useState(false);

  const dodgeChance = Math.min(0.4, 0.015 * agiLevel);
  const isOver = victory || defeated;

  // Monster auto-attack
  useEffect(() => {
    if (isOver) return;
    const t = setInterval(() => {
      if (Math.random() < dodgeChance) {
        setLog(p => ['💨 تفادي!', ...p.slice(0, 3)]);
        return;
      }
      const dmg = monster.power + Math.floor(Math.random() * monster.power * 0.4);
      setPlayerHp(prev => {
        const next = Math.max(0, prev - dmg);
        if (next <= 0) setDefeated(true);
        return next;
      });
      setPHit(true); setShake(true);
      setLog(p => [`${monster.emoji} → ${dmg}`, ...p.slice(0, 3)]);
      setTimeout(() => { setPHit(false); setShake(false); }, 350);
    }, monster.speed);
    return () => clearInterval(t);
  }, [isOver, dodgeChance, monster]);

  const attack = useCallback(() => {
    if (isOver) return;
    const isCrit = Math.random() < 0.18;
    const dmg = isCrit ? Math.floor(baseDmg * 2) : baseDmg;
    setHp(prev => {
      const next = Math.max(0, prev - dmg);
      if (next <= 0) setVictory(true);
      return next;
    });
    setHit(true);
    setLog(p => [`${isCrit ? '💥' : '⚔️'} ${dmg}`, ...p.slice(0, 3)]);
    setTimeout(() => setHit(false), 250);
  }, [isOver, baseDmg]);

  // Sync HP loss to game state on defeat
  useEffect(() => {
    if (defeated) {
      const lost = gameState.hp - playerHp;
      if (lost > 0) takeDamage(lost);
    }
  }, [defeated]); // eslint-disable-line

  const handleExit = () => navigate('/dungeon');

  const hpPct = (hp / maxHp) * 100;
  const playerPct = (playerHp / gameState.maxHp) * 100;

  return (
    <div className={cn(
      'min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white relative overflow-hidden',
      shake && 'animate-pulse'
    )}>
      <header className="relative z-10 flex justify-between items-center p-4 border-b border-slate-700/50">
        <button onClick={handleExit} className="p-2 bg-slate-800/60 rounded-lg active:scale-95">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-[10px] font-bold tracking-[0.3em] text-slate-400 uppercase">Monster Encounter · {rank}</div>
        <div className="w-9" />
      </header>

      {/* Monster */}
      <div className="relative z-10 flex flex-col items-center pt-8 pb-4">
        <motion.div
          animate={hit ? { x: [0, -10, 10, 0], scale: [1, 0.95, 1] } : {}}
          transition={{ duration: 0.3 }}
          className="text-8xl drop-shadow-[0_0_30px_currentColor]"
          style={{ color: monster.color }}
        >
          {monster.emoji}
        </motion.div>
        <div className="mt-2 text-sm font-bold tracking-widest uppercase" style={{ color: monster.color }}>
          {monster.name}
        </div>
        <div className="w-72 mt-3">
          <div className="flex justify-between text-[9px] font-bold mb-1 text-slate-400">
            <span>HP</span><span>{Math.round(hp)}/{maxHp}</span>
          </div>
          <div className="h-2 bg-slate-800 rounded overflow-hidden">
            <div className="h-full transition-all duration-300" style={{ width: `${hpPct}%`, background: monster.color }} />
          </div>
        </div>
      </div>

      {/* Battle log */}
      <div className="relative z-10 mx-auto max-w-md px-4">
        <div className="bg-black/40 border border-slate-700/40 rounded-md p-2 h-20 overflow-hidden text-[11px] font-mono space-y-0.5">
          <AnimatePresence>
            {log.map((l, i) => (
              <motion.div key={`${l}-${i}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1 - i * 0.25, x: 0 }} className="text-slate-300">
                {l}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Player HP */}
      <div className="relative z-10 mx-auto max-w-md px-4 mt-4">
        <div className={cn('bg-slate-900/60 border border-slate-700/50 rounded-lg p-3', pHit && 'border-red-500')}>
          <div className="flex justify-between text-[10px] font-bold mb-1">
            <span className="text-slate-400">YOU</span>
            <span className="text-red-400">{Math.round(playerHp)}/{gameState.maxHp}</span>
          </div>
          <div className="h-2 bg-slate-800 rounded overflow-hidden">
            <div className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all" style={{ width: `${playerPct}%` }} />
          </div>
        </div>
      </div>

      {/* Action: single big attack button */}
      <div className="relative z-10 fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
        <button
          onClick={attack}
          disabled={isOver}
          className={cn(
            'w-full max-w-md mx-auto flex items-center justify-center gap-3 py-5 rounded-xl font-black text-sm tracking-widest uppercase border-2 transition-all active:scale-95',
            isOver ? 'bg-slate-800/60 border-slate-700 text-slate-500' : 'bg-blue-600/20 border-blue-400 text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.4)]'
          )}
        >
          <Sword className="w-5 h-5" /> Attack
        </button>
      </div>

      {/* Victory overlay */}
      {victory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-yellow-500/60 rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
            <Sparkles className="w-12 h-12 text-yellow-400 mx-auto" />
            <h2 className="text-2xl font-black text-yellow-400 tracking-widest">VICTORY</h2>
            <div className="space-y-2 py-3 border-y border-slate-700/50">
              <div className="flex items-center justify-center gap-2 text-yellow-300"><Coins className="w-4 h-4" /> +{monster.goldReward} Gold</div>
              <div className="flex items-center justify-center gap-2 text-blue-300"><Zap className="w-4 h-4" /> +{monster.xpReward} XP</div>
            </div>
            <button onClick={handleExit} className="w-full py-3 bg-blue-600 rounded-lg font-bold text-sm tracking-widest uppercase">Continue</button>
          </div>
        </div>
      )}

      {/* Defeat overlay */}
      {defeated && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-500/60 rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
            <Skull className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-2xl font-black text-red-500 tracking-widest">DEFEATED</h2>
            <p className="text-xs text-slate-400">لقد سقطت في المعركة</p>
            <button onClick={handleExit} className="w-full py-3 bg-red-600/30 border border-red-500 rounded-lg font-bold text-sm tracking-widest uppercase">Retreat</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonsterBattle;
