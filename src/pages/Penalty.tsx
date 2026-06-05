import { PenaltyZoneScreen } from '@/features/penalty/PenaltyZoneScreen';
import { usePunishment } from '@/hooks/usePunishment';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';

const Penalty = () => {
  const navigate = useNavigate();
  const { active, endAt, start, refresh } = usePunishment();
  const started = useRef(false);

  // If the user lands here without an active punishment, start a 4h one once.
  useEffect(() => {
    if (started.current) return;
    if (!active && !endAt) {
      started.current = true;
      start(4);
    }
  }, [active, endAt, start]);

  const handleTimeComplete = async () => {
    await refresh();
    navigate('/');
  };

  const endTime = endAt ?? new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <img src="/GrottoMonsters.png" style={{ position: 'absolute', top: '10%', left: '5%', zIndex: 10, width: '150px' }} alt="penalty-1" />
      <img src="/GrottoMonsters.png" style={{ position: 'absolute', bottom: '15%', right: '10%', zIndex: 10, width: '150px' }} alt="penalty-2" />
      <img src="/GrottoMonsters.png" style={{ position: 'absolute', top: '50%', left: '80%', zIndex: 10, width: '150px' }} alt="penalty-3" />
      <PenaltyZoneScreen endTime={endTime} onTimeComplete={handleTimeComplete} />
    </div>
  );
};

export default Penalty;
