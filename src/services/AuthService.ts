import { supabase } from '@/integrations/supabase/client';

/**
 * AuthService — thin wrapper around Supabase Auth. All authentication in the
 * app must go through this service (never call `supabase.auth` directly from
 * a component). Keeps a single source of truth and makes future changes easy.
 */
export const AuthService = {
  getSession: () => supabase.auth.getSession(),
  getUser: () => supabase.auth.getUser(),
  onAuthStateChange: (cb: (event: string, session: any) => void | Promise<void>) =>
    supabase.auth.onAuthStateChange(cb as any),

  signUp: (email: string, password: string, playerName: string) =>
    supabase.auth.signUp({ email, password, options: { data: { player_name: playerName } } }),

  signIn: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),

  signOut: () => supabase.auth.signOut(),

  /** Passwordless / OTP flow — Supabase sends a 6-digit code by email. */
  sendOtp: (email: string, playerName?: string) =>
    supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: undefined,
        data: playerName ? { player_name: playerName } : undefined,
      },
    }),

  verifyOtp: (email: string, token: string) =>
    supabase.auth.verifyOtp({ email, token, type: 'email' }),

  updatePassword: (password: string) => supabase.auth.updateUser({ password }),

  resetPassword: (email: string, redirectTo?: string) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo ?? `${window.location.origin}/reset-password`,
    }),
};

export type SupabaseAuthService = typeof AuthService;