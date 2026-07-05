import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole, type AppRole } from '@/hooks/useUserRole';
import { LoadingScreen } from '@/components/LoadingScreen';

interface Props {
  role?: AppRole; // minimum role required; defaults to admin
  children: ReactNode;
}

/**
 * Client-side UI gate. RLS is the real security boundary — this only hides the panel
 * from users who lack the required role. Any mutation still requires a matching policy.
 */
export const RequireRole = ({ role = 'admin', children }: Props) => {
  const { loading, isModerator, isAdmin, isSuperAdmin } = useUserRole();

  if (loading) return <LoadingScreen fullScreen message="AUTHORIZING" />;

  const allowed =
    (role === 'moderator' && isModerator) ||
    (role === 'admin' && isAdmin) ||
    (role === 'super_admin' && isSuperAdmin) ||
    (role === 'user');

  if (!allowed) return <Navigate to="/" replace />;
  return <>{children}</>;
};
