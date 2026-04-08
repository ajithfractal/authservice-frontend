import type { User } from '@/types/auth';
import { canAccessAdminHub } from '@/utils/roles';

/**
 * Default landing route after sign-in from the user's role and RBAC permissions.
 */
export function getPostLoginPath(user: User): string {
  if (canAccessAdminHub(user)) {
    return '/admin/users';
  }

  return '/';
}
