import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/services/AuthContext';
import { canAccessAdminHub, satisfiesAdminPagePermissions } from '@/utils/roles';

interface AdminPageGuardProps {
  /** Optional role requirements (AND-ed with permissions when provided). */
  roles?: string[];
  /** Every permission required (in addition to admin hub). Empty = hub only. */
  permissions?: string[];
  children: ReactNode;
}

export function AdminPageGuard({ roles = [], permissions = [], children }: AdminPageGuardProps) {
  const { user, initializing, can } = useAuth();

  if (initializing) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!canAccessAdminHub(user)) return <Navigate to="/unauthorized" replace />;
  if (roles.length > 0 && !can(roles, permissions)) {
    return <Navigate to="/unauthorized" replace />;
  }
  if (!satisfiesAdminPagePermissions(user, permissions)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
