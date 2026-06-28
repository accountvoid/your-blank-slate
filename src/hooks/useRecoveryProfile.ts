import { useEffect, useState, useCallback } from 'react';

export interface RecoveryProfile {
  sleep: boolean;
  nutrition: boolean;
  protein: boolean;
  updated_at: string;
}

const KEY = 'setvoid_recovery_profile_v1';

export function useRecoveryProfile() {
  const [profile, setProfile] = useState<RecoveryProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setProfile(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  const save = useCallback((p: Omit<RecoveryProfile, 'updated_at'>) => {
    const next: RecoveryProfile = { ...p, updated_at: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(next));
    setProfile(next);
    return next;
  }, []);

  const allYes = !!profile && profile.sleep && profile.nutrition && profile.protein;
  const programTag: 'str_full_split' | 'str_alt_split' | null = profile
    ? allYes ? 'str_full_split' : 'str_alt_split'
    : null;

  return { profile, loaded, save, programTag, needsAssessment: loaded && !profile };
}
