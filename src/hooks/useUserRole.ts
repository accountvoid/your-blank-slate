import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type AppRole = Database['public']['Enums']['app_role'];

/**
 * Loads the current user's roles from the `user_roles` table.
 * NEVER trust this on the server side — RLS is the source of truth.
 * This is purely for UI gating (hiding admin routes from non-admins).
 */
export const useUserRole = () => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', uid);
      setRoles((data ?? []).map((r) => r.role as AppRole));
      setLoading(false);
    })();
  }, []);

  const has = (r: AppRole) => roles.includes(r);
  return {
    roles,
    loading,
    isUser: has('user') || roles.length === 0,
    isModerator: has('moderator') || has('admin') || has('super_admin'),
    isAdmin: has('admin') || has('super_admin'),
    isSuperAdmin: has('super_admin'),
  };
};
