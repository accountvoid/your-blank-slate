import { useCallback } from 'react';

export interface FriendProfile {
  friendship_id: string;
  user_id: string;
  player_name: string;
  player_id: string;
  avatar_url: string | null;
  status: string;
  is_sender: boolean;
}

export const useFriendships = () => {
  const noop = useCallback(async () => ({ error: null as Error | null }), []);

  return {
    friends: [] as FriendProfile[],
    pendingReceived: [] as FriendProfile[],
    pendingSent: [] as FriendProfile[],
    loading: false,
    sendFriendRequest: async (_id: string) => ({ error: new Error('Friends feature coming soon') }),
    acceptRequest: noop,
    rejectRequest: noop,
    removeFriend: noop,
    getFriendshipStatus: (_id: string) => 'none' as 'none' | 'pending_sent' | 'pending_received' | 'accepted',
    refresh: noop,
  };
};
