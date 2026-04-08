import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/services/AuthContext';
import { canAccessAdminHub, satisfiesAdminPagePermissions } from '@/utils/roles';

interface AdminPageGuardProps {
  /** Every permission required (in addition to admin hub). Empty = hub only. */
  permissions?: string[];
  children: ReactNode;
}

export function AdminPageGuard({ permissions = [], children }: AdminPageGuardProps) {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!canAccessAdminHub(user)) return <Navigate to="/unauthorized" replace />;
  if (!satisfiesAdminPagePermissions(user, permissions)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
