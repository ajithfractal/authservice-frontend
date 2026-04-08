import type { User } from '@/types/auth';
import { normalizeRole } from '@/utils/roles';

export class PermissionController {
  constructor(private readonly getCurrentUser: () => User | null) {}

  hasRole(roles: string[]): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    const ur = normalizeRole(user.role).toLowerCase();
    return roles.some((r) => r.toLowerCase() === ur);
  }

  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    const perms = user.permissions ?? [];
    const want = permission.toLowerCase();
    if (perms.some((p) => String(p).toLowerCase() === 'all')) return true;
    return perms.some((p) => String(p).toLowerCase() === want);
  }

  /** True if user has every listed permission (or `all`). */
  can(requiredRoles: string[] = [], requiredPermissions: string[] = []): boolean {
    const roleOk = requiredRoles.length === 0 || this.hasRole(requiredRoles);
    const permissionOk =
      requiredPermissions.length === 0 || requiredPermissions.every((p) => this.hasPermission(p));
    return roleOk && permissionOk;
  }

  /** True if user has at least one permission (or `all`). */
  canAnyPermission(permissionCodes: string[]): boolean {
    const user = this.getCurrentUser();
    if (!user || permissionCodes.length === 0) return false;
    const perms = user.permissions ?? [];
    if (perms.some((p) => String(p).toLowerCase() === 'all')) return true;
    return permissionCodes.some((p) => this.hasPermission(p));
  }
}
