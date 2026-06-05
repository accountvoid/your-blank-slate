import type { PlayerRank } from './player';

export interface Gate {
  id: string;
  /** Permanent immutable identifier in the format GATE-0001 */
  idGate: string;
  name: string;
  rank: PlayerRank;
  requiredPower: number;
  energyDensity: string;
  danger: string;
  color: string;
  discovered: boolean;
  completed: boolean;
  isFullyRevealed?: boolean;
  gateNumber?: number;
  closingTime?: string;
  type?: string;
  rewards: {
    xp: number;
    gold: number;
    shadowPoints: number;
  };
}
