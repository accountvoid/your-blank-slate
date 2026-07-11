import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type AppRole = Database['public']['Enums']['app_role'] | 'owner';

/**
 * Loads the current user's roles from the `user_roles` table.
 * NEVER trust this on the server side — RLS is the source of truth.
 * This is purely for UI gating (hiding admin routes from non-admins).
 */
export const useUserRole = () => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) {
        if (!cancelled) {
          setRoles([]);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', uid);
      if (!cancelled) {
        setRoles((data ?? []).map((r) => (r as { role: string }).role as AppRole));
        setLoading(false);
      }
    };

    load();

    // Re-load roles whenever the auth session changes (login, refresh, logout).
    const { data: sub } = supabase.auth.onAuthStateChange((_evt) => {
      setLoading(true);
      load();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const has = (r: AppRole) => roles.includes(r);
  const isOwner = has('owner');
  const isSuperAdmin = isOwner || has('super_admin');
  const isAdmin = isSuperAdmin || has('admin');
  const isModerator = isAdmin || has('moderator');

  return {
    roles,
    loading,
    isUser: has('user') || roles.length === 0,
    isModerator,
    isAdmin,
    isSuperAdmin,
    isOwner,
  };
};
