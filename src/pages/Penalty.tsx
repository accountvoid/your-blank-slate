import { PenaltyZoneScreen } from '@/features/penalty/PenaltyZoneScreen';
import { useGameState } from '@/hooks/useGameState';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const Penalty = () => {
  const navigate = useNavigate();
  const { gameState, clearPunishment, takeDamage } = useGameState();

  // Deduct HP once when entering the penalty zone
  useEffect(() => {
    const damage = Math.floor(Math.random() * (15 - 5 + 1)) + 5;
    takeDamage(damage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set punishment end time to 4 hours from now if not already set
  useEffect(() => {
    if (!gameState.punishmentEndTime) {
      // Will be set by applyPunishment in useGameState
    }
  }, []);

  const endTime = gameState.punishmentEndTime || new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

  const handleTimeComplete = () => {
    clearPunishment();
    navigate('/');
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* عرض الصورة 3 مرات في أماكن مختلفة حول اللاعب */}
      <img src="/GrottoMonsters.png" style={{ position: 'absolute', top: '10%', left: '5%', zIndex: 10, width: '150px' }} alt="penalty-1" />
      <img src="/GrottoMonsters.png" style={{ position: 'absolute', bottom: '15%', right: '10%', zIndex: 10, width: '150px' }} alt="penalty-2" />
      <img src="/GrottoMonsters.png" style={{ position: 'absolute', top: '50%', left: '80%', zIndex: 10, width: '150px' }} alt="penalty-3" />

      <PenaltyZoneScreen 
        endTime={endTime} 
        onTimeComplete={handleTimeComplete} 
      />
    </div>
  );
};

export default Penalty;
