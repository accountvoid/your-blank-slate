import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { AuthService } from '@/services/AuthService';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = AuthService.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    AuthService.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithOtp = async (email: string, playerName: string) => {
    const { error } = await AuthService.sendOtp(email, playerName);
    return { error };
  };

  const verifyOtp = async (email: string, token: string) => {
    const { data, error } = await AuthService.verifyOtp(email, token);
    if (data?.session) {
      setSession(data.session);
      setUser(data.session.user);
    }
    return { data, error };
  };

  const signUp = async (email: string, password: string, playerName: string) => {
    const { data, error } = await AuthService.signUp(email, password, playerName);
    if (data?.session) {
      setSession(data.session);
      setUser(data.session.user);
    }
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await AuthService.signIn(email, password);
    if (data?.session) {
      setSession(data.session);
      setUser(data.session.user);
    }
    return { data, error };
  };

  const updatePassword = (password: string) => AuthService.updatePassword(password);

  const signOut = async () => {
    const { error } = await AuthService.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
    }
    return { error };
  };

  return {
    user,
    session,
    loading,
    signInWithOtp,
    verifyOtp,
    signUp,
    signIn,
    updatePassword,
    signOut,
  };
};
