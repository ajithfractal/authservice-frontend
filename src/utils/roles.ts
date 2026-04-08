import type { User } from '@/types/auth';

const ADMIN_HUB_PERMISSIONS = ['admin:read', 'users:read', 'roles:read', 'permissions:read', 'org-units:read'] as const;

export function normalizeRole(role: string | undefined): string {
  return String(role ?? '').trim();
}

/** Case-insensitive match for bootstrap / landing (Keycloak may vary casing). */
export function isSuperAdmin(user: User | null): boolean {
  if (!user) return false;
  return normalizeRole(user.role).toLowerCase() === 'superadmin';
}

export function userHasWildcardAll(user: User | null): boolean {
  return Boolean(user?.permissions?.some((p) => String(p).toLowerCase() === 'all'));
}

function permissionSetLower(user: User | null): Set<string> {
  const perms = user?.permissions ?? [];
  return new Set(perms.map((p) => String(p).toLowerCase()));
}

/** Enter admin shell if superAdmin role or any RBAC read permission (or wildcard `all`). */
export function canAccessAdminHub(user: User | null): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  const lower = permissionSetLower(user);
  if (lower.has('all')) return true;
  return ADMIN_HUB_PERMISSIONS.some((p) => lower.has(p.toLowerCase()));
}

/** Sub-pages: superAdmin / `all` bypass; otherwise every listed permission must match (case-insensitive). */
export function satisfiesAdminPagePermissions(user: User | null, required: string[]): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  const lower = permissionSetLower(user);
  if (lower.has('all')) return true;
  if (required.length === 0) return true;
  return required.every((p) => lower.has(p.toLowerCase()));
}
