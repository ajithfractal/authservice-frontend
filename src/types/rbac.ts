export interface RbacPermissionRef {
  id: string;
  name: string;
  description: string;
}

export interface RbacRole {
  id: string;
  applicationId: string;
  name: string;
  description: string;
  active?: boolean;
  permissions: RbacPermissionRef[];
}

export interface PagedResult<T> {
  items: T[];
  limit: number;
  pageCount: number;
  currentPage: number;
}

export type PagedRoles = PagedResult<RbacRole>;

/** Role summary embedded on user list rows (no permissions on this endpoint). */
export interface RbacUserRoleRef {
  id: string;
  name: string;
  description: string;
  applicationId?: string;
  active?: boolean;
}

export interface RbacUser {
  id: string;
  applicationId: string;
  email: string;
  firstName: string;
  lastName: string;
  orgUnitId: string | null;
  hierarchyEnabled?: boolean;
  enabled?: boolean;
  roles: RbacUserRoleRef[];
}

export type PagedUsers = PagedResult<RbacUser>;

/** GET /api/rbac/roles/dropdown — id/name/description for filters. */
export interface RbacRoleDropdownItem {
  id: string;
  name: string;
  description: string;
}

/** GET /api/rbac/permissions — catalog rows. */
export interface RbacPermissionRow {
  id: string;
  name: string;
  description: string;
}

export type PagedPermissions = PagedResult<RbacPermissionRow>;

export interface CreateRoleRequest {
  name: string;
  description: string;
  applicationId?: string;
  active?: boolean;
}

export interface PatchRoleRequest {
  name?: string | null;
  description?: string | null;
  active?: boolean | null;
}

/** GET /rbac/users/{id} — full user with nested role permissions. */
export interface RbacUserDetail {
  id: string;
  applicationId: string;
  email: string;
  firstName: string;
  lastName: string;
  orgUnitId: string | null;
  hierarchyEnabled?: boolean;
  enabled?: boolean;
  roles: RbacRole[];
  permissions: RbacPermissionRef[];
}

export interface PatchUserHierarchyRequest {
  hierarchyEnabled: boolean;
  orgUnitId: string | null;
}

export interface CreatePermissionRequest {
  name: string;
  description: string;
}

export interface PatchPermissionRequest {
  name?: string | null;
  description?: string | null;
}

export type VisibilityScopeType = 'ALL' | 'SUBTREE' | 'SELF' | 'NONE';

export interface RoleVisibilityScope {
  roleId: string;
  scopeType: VisibilityScopeType;
}

export interface BulkAssignRolesRequest {
  userIds: string[];
  roleIds: string[];
}

export interface BulkAssignRolesResponse {
  updatedUserCount: number;
  requestedUserCount: number;
  assignedRoleCount: number;
}

export interface BulkAssignOrgUnitRequest {
  userIds: string[];
  orgUnitId: string;
}

export interface BulkAssignOrgUnitResponse {
  updatedCount: number;
  requestedCount: number;
}

export interface BulkSetUsersEnabledRequest {
  userIds: string[];
  enabled: boolean;
}

export interface BulkSetUsersEnabledResponse {
  updatedUserCount: number;
  requestedUserCount: number;
  enabled: boolean;
}

export interface BulkSetRolesActiveRequest {
  roleIds: string[];
  active: boolean;
}

export interface BulkSetRolesActiveResponse {
  updatedRoleCount: number;
  requestedRoleCount: number;
  active: boolean;
}

export interface CopyRolePermissionsRequest {
  sourceRoleId: string;
  targetRoleId: string;
  replaceExisting: boolean;
}
