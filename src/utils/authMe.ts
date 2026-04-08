import type { AuthMeResponse, User } from '@/types/auth';

/** Pick a single app `role` string from RBAC role names for UI / legacy checks. */
export function primaryRoleFromApiRoles(roles: string[]): string {
  if (!roles?.length) return 'EMPLOYEE';
  const lower = roles.map((r) => String(r).toLowerCase());
  const superIdx = lower.findIndex((r) => r === 'superadmin');
  if (superIdx >= 0) return roles[superIdx] ?? 'superAdmin';
  if (lower.includes('hr')) return 'HR';
  if (lower.includes('manager')) return 'MANAGER';
  if (lower.includes('employee')) return 'EMPLOYEE';
  return roles[0];
}

/** Map GET /auth/me JSON to the app `User` model. */
export function mapAuthMeToUser(raw: AuthMeResponse): User {
  const roles = raw.roles ?? [];
  return {
    id: raw.userId,
    name: raw.name ?? '',
    email: raw.email,
    role: primaryRoleFromApiRoles(roles),
    permissions: raw.permissions ?? [],
    applicationId: raw.applicationId,
    orgUnitId: raw.orgUnitId,
    roles
  };
}
