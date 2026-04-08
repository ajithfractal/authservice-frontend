import type { ReactNode } from 'react';
import { useAuth } from '@/services/AuthContext';

interface PermissionGateProps {
  roles?: string[];
  permissions?: string[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({
  roles = [],
  permissions = [],
  fallback = null,
  children
}: PermissionGateProps) {
  const { can } = useAuth();

  if (!can(roles, permissions)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
