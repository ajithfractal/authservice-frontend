import { Loader2 } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/services/AuthContext';
import { canAccessAdminHub } from '@/utils/roles';

interface ProtectedRouteProps {
  roles?: string[];
  permissions?: string[];
  /** If true, user must be allowed to open the admin shell (superAdmin, `all`, or users|roles|permissions:read). */
  requireAdminHub?: boolean;
}

export function ProtectedRoute({
  roles = [],
  permissions = [],
  requireAdminHub = false
}: ProtectedRouteProps) {
  const { user, initializing, can } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading session…</span>
      </div>
    );
  }

  if (!user) {
    const from = `${location.pathname}${location.search}`;
    const loginTo = location.search ? `/login${location.search}` : '/login';
    return <Navigate to={loginTo} replace state={{ from }} />;
  }

  if (requireAdminHub && !canAccessAdminHub(user)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (!can(roles, permissions)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
