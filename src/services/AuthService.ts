import type { AuthMeResponse, LoginResponse, RegisterUserRequest, User } from '@/types/auth';
import { HttpClient } from '@/api/httpClient';
import { mapAuthMeToUser } from '@/utils/authMe';
import {
  AUTH_LOGIN_ID_FIELD,
  AUTH_LOGIN_PATH,
  AUTH_LOGOUT_PATH,
  AUTH_ME_PATH,
  AUTH_REGISTER_PATH,
  ORG_UNITS_PATH,
  REGISTERED_APPLICATIONS_PATH,
  RLS_CONFIG_PATH,
  RBAC_PERMISSIONS_PATH,
  RBAC_ROLE_VISIBILITY_SCOPES_PATH,
  RBAC_ROLES_DROPDOWN_PATH,
  RBAC_ROLES_PATH,
  RBAC_USERS_PATH,
    SSO_PROVIDERS_PATH
} from '@/config/env';
import type { CreateOrgUnitRequest, MoveOrgUnitRequest, OrgUnit } from '@/types/orgUnits';
import type {
  CreateRegisteredApplicationRequest,
  RegisteredApplication
} from '@/types/registeredApplications';
import type { RlsConfig } from '@/types/rls';
import type {
  BulkAssignOrgUnitRequest,
  BulkAssignOrgUnitResponse,
  BulkAssignRolesRequest,
  BulkAssignRolesResponse,
  BulkSetRolesActiveRequest,
  BulkSetRolesActiveResponse,
  BulkSetUsersEnabledRequest,
  BulkSetUsersEnabledResponse,
  CopyRolePermissionsRequest,
  CreatePermissionRequest,
  CreateRoleRequest,
  PagedPermissions,
  PagedRoles,
  PagedUsers,
  PatchPermissionRequest,
  PatchRoleRequest,
  PatchUserHierarchyRequest,
  RbacPermissionRow,
  RbacRole,
  RbacRoleDropdownItem,
  RbacUserDetail,
  RoleVisibilityScope,
  VisibilityScopeType
} from '@/types/rbac';

export interface SsoProvider {
  key: string;
  loginUrl: string;
  displayName: string;
}

export class AuthService {
  private http: HttpClient;

  constructor(getToken: () => string | null) {
    this.http = new HttpClient(getToken);
  }

  /** Password login → `AUTH_LOGIN_PATH` only (never SSO callback / login-url). */
  login(email: string, password: string): Promise<LoginResponse> {
    const body =
      AUTH_LOGIN_ID_FIELD === 'email'
        ? { email, password }
        : { [AUTH_LOGIN_ID_FIELD]: email, password };
    return this.http.request<LoginResponse>(AUTH_LOGIN_PATH, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  /** Secured GET /auth/me: throws on 401 (e.g. session expired while refreshing profile). */
  async getCurrentUser(): Promise<User> {
    const raw = await this.http.request<AuthMeResponse>(AUTH_ME_PATH);
    return mapAuthMeToUser(raw);
  }

  /** Same as getCurrentUser but 401 → null (guest). */
  async getCurrentUserOrGuest(): Promise<User | null> {
    const raw = await this.http.requestOrNullIfUnauthorized<AuthMeResponse>(AUTH_ME_PATH);
    return raw ? mapAuthMeToUser(raw) : null;
  }

  /**
   * POST /auth/logout — server clears ACCESS_TOKEN / REFRESH_TOKEN (Set-Cookie).
   * Keycloak logout uses REFRESH_TOKEN cookie when present; `credentials: include` sends cookies.
   */
  postLogout(): Promise<void> {
    return this.http.requestVoid(AUTH_LOGOUT_PATH, { method: 'POST' });
  }

  /** Paginated roles: `page`, `size` (Spring). */
  listRolesPaged(params: { page: number; size: number; sort?: string }): Promise<PagedRoles> {
    const q = new URLSearchParams({
      page: String(params.page),
      size: String(params.size)
    });
    const sort = params.sort?.trim();
    if (sort) q.set('sort', sort);
    return this.http.request<PagedRoles>(`${RBAC_ROLES_PATH}?${q.toString()}`);
  }

  /** Compact role list for filters (e.g. `/rbac/roles/dropdown`). */
  listRolesDropdown(): Promise<RbacRoleDropdownItem[]> {
    return this.http.request<RbacRoleDropdownItem[]>(RBAC_ROLES_DROPDOWN_PATH);
  }

  /** Paginated permission catalog: `page`, `size`, optional `searchKey`. */
  listPermissionsPaged(params: {
    page: number;
    size: number;
    searchKey?: string;
    sort?: string;
  }): Promise<PagedPermissions> {
    const q = new URLSearchParams({
      page: String(params.page),
      size: String(params.size)
    });
    const sort = params.sort?.trim();
    if (sort) q.set('sort', sort);
    const sk = params.searchKey?.trim();
    if (sk) q.set('searchKey', sk);
    return this.http.request<PagedPermissions>(`${RBAC_PERMISSIONS_PATH}?${q.toString()}`);
  }

  /** Paginated RBAC users. Optional `searchKey`, `roleId`. */
  listUsersPaged(params: {
    page: number;
    size: number;
    searchKey?: string;
    roleId?: string;
    withoutOrgUnit?: boolean;
    sort?: string;
  }): Promise<PagedUsers> {
    const q = new URLSearchParams({
      page: String(params.page),
      size: String(params.size)
    });
    const sk = params.searchKey?.trim();
    if (sk) q.set('searchKey', sk);
    const rid = params.roleId?.trim();
    if (rid) q.set('roleId', rid);
    if (params.withoutOrgUnit === true) q.set('withoutOrgUnit', 'true');
    const sort = params.sort?.trim();
    if (sort) q.set('sort', sort);
    return this.http.request<PagedUsers>(`${RBAC_USERS_PATH}?${q.toString()}`);
  }

  registerUser(body: RegisterUserRequest): Promise<void> {
    return this.http.requestVoid(AUTH_REGISTER_PATH, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  createRole(body: CreateRoleRequest): Promise<RbacRole> {
    return this.http.request<RbacRole>(RBAC_ROLES_PATH, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  getRole(roleId: string): Promise<RbacRole> {
    return this.http.request<RbacRole>(`${RBAC_ROLES_PATH}/${encodeURIComponent(roleId)}`);
  }

  patchRole(roleId: string, body: PatchRoleRequest): Promise<RbacRole> {
    return this.http.request<RbacRole>(`${RBAC_ROLES_PATH}/${encodeURIComponent(roleId)}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  }

  deleteRole(roleId: string): Promise<void> {
    return this.http.requestVoid(`${RBAC_ROLES_PATH}/${encodeURIComponent(roleId)}`, { method: 'DELETE' });
  }

  listRoleVisibilityScopes(): Promise<RoleVisibilityScope[]> {
    return this.http.request<RoleVisibilityScope[]>(RBAC_ROLE_VISIBILITY_SCOPES_PATH);
  }

  putRoleVisibilityScope(roleId: string, scopeType: VisibilityScopeType): Promise<RoleVisibilityScope> {
    return this.http.request<RoleVisibilityScope>(
      `${RBAC_ROLE_VISIBILITY_SCOPES_PATH}/${encodeURIComponent(roleId)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ scopeType })
      }
    );
  }

  addRolePermissions(roleId: string, permissionIds: string[]): Promise<RbacRole> {
    return this.http.request<RbacRole>(
      `${RBAC_ROLES_PATH}/${encodeURIComponent(roleId)}/permissions`,
      {
        method: 'POST',
        body: JSON.stringify({ permissionIds })
      }
    );
  }

  removeRolePermission(roleId: string, permissionId: string): Promise<RbacRole> {
    return this.http.request<RbacRole>(
      `${RBAC_ROLES_PATH}/${encodeURIComponent(roleId)}/permissions/${encodeURIComponent(permissionId)}`,
      { method: 'DELETE' }
    );
  }

  createPermission(body: CreatePermissionRequest): Promise<RbacPermissionRow> {
    return this.http.request<RbacPermissionRow>(RBAC_PERMISSIONS_PATH, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  patchPermission(permissionId: string, body: PatchPermissionRequest): Promise<RbacPermissionRow> {
    return this.http.request<RbacPermissionRow>(`${RBAC_PERMISSIONS_PATH}/${encodeURIComponent(permissionId)}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  }

  deletePermission(permissionId: string): Promise<void> {
    return this.http.requestVoid(`${RBAC_PERMISSIONS_PATH}/${encodeURIComponent(permissionId)}`, {
      method: 'DELETE'
    });
  }

  getRbacUser(userId: string): Promise<RbacUserDetail> {
    return this.http.request<RbacUserDetail>(`${RBAC_USERS_PATH}/${encodeURIComponent(userId)}`);
  }

  patchUserEnabled(userId: string, enabled: boolean): Promise<RbacUserDetail> {
    return this.http.request<RbacUserDetail>(`${RBAC_USERS_PATH}/${encodeURIComponent(userId)}/enabled`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled })
    });
  }

  bulkSetUsersEnabled(body: BulkSetUsersEnabledRequest): Promise<BulkSetUsersEnabledResponse> {
    return this.http.request<BulkSetUsersEnabledResponse>(`${RBAC_USERS_PATH}/bulk/enabled`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  }

  patchUserHierarchy(userId: string, body: PatchUserHierarchyRequest): Promise<RbacUserDetail> {
    return this.http.request<RbacUserDetail>(`${RBAC_USERS_PATH}/${encodeURIComponent(userId)}/hierarchy`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  }

  addUserRoles(userId: string, roleIds: string[]): Promise<RbacUserDetail> {
    return this.http.request<RbacUserDetail>(`${RBAC_USERS_PATH}/${encodeURIComponent(userId)}/roles`, {
      method: 'POST',
      body: JSON.stringify({ roleIds })
    });
  }

  removeUserRole(userId: string, roleId: string): Promise<RbacUserDetail> {
    return this.http.request<RbacUserDetail>(
      `${RBAC_USERS_PATH}/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleId)}`,
      { method: 'DELETE' }
    );
  }

  bulkAssignUserRoles(body: BulkAssignRolesRequest): Promise<BulkAssignRolesResponse> {
    return this.http.request<BulkAssignRolesResponse>(`${RBAC_USERS_PATH}/bulk/roles`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  bulkAssignUsersOrgUnit(body: BulkAssignOrgUnitRequest): Promise<BulkAssignOrgUnitResponse> {
    return this.http.request<BulkAssignOrgUnitResponse>(`${RBAC_USERS_PATH}/bulk/org-unit`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  }

  bulkSetRolesActive(body: BulkSetRolesActiveRequest): Promise<BulkSetRolesActiveResponse> {
    return this.http.request<BulkSetRolesActiveResponse>(`${RBAC_ROLES_PATH}/bulk/active`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  }

  copyRolePermissions(body: CopyRolePermissionsRequest): Promise<RbacRole> {
    return this.http.request<RbacRole>(`${RBAC_ROLES_PATH}/permissions/copy`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  listSsoProviders(): Promise<SsoProvider[]> {
    return this.http.request<SsoProvider[]>(SSO_PROVIDERS_PATH);
  }

  /** GET /org-units — catalog of org units (if supported by backend). */
  listOrgUnits(): Promise<OrgUnit[]> {
    return this.http.request<OrgUnit[]>(ORG_UNITS_PATH);
  }

  createOrgUnit(body: CreateOrgUnitRequest): Promise<OrgUnit> {
    return this.http.request<OrgUnit>(ORG_UNITS_PATH, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  listOrgUnitChildren(orgUnitId: string): Promise<OrgUnit[]> {
    return this.http.request<OrgUnit[]>(`${ORG_UNITS_PATH}/${encodeURIComponent(orgUnitId)}/children`);
  }

  listOrgUnitAncestors(orgUnitId: string): Promise<OrgUnit[]> {
    return this.http.request<OrgUnit[]>(`${ORG_UNITS_PATH}/${encodeURIComponent(orgUnitId)}/ancestors`);
  }

  moveOrgUnit(orgUnitId: string, body: MoveOrgUnitRequest): Promise<OrgUnit> {
    return this.http.request<OrgUnit>(`${ORG_UNITS_PATH}/${encodeURIComponent(orgUnitId)}/move`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  deleteOrgUnit(orgUnitId: string, cascade: boolean): Promise<void> {
    const q = new URLSearchParams({ cascade: String(cascade) });
    return this.http.requestVoid(`${ORG_UNITS_PATH}/${encodeURIComponent(orgUnitId)}?${q.toString()}`, {
      method: 'DELETE'
    });
  }

  getRlsConfig(): Promise<RlsConfig> {
    return this.http.request<RlsConfig>(RLS_CONFIG_PATH);
  }

  patchRlsConfig(body: RlsConfig): Promise<RlsConfig> {
    return this.http.request<RlsConfig>(RLS_CONFIG_PATH, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  }

  listRegisteredApplications(): Promise<RegisteredApplication[]> {
    return this.http.request<RegisteredApplication[]>(REGISTERED_APPLICATIONS_PATH);
  }

  createRegisteredApplication(body: CreateRegisteredApplicationRequest): Promise<RegisteredApplication> {
    return this.http.request<RegisteredApplication>(REGISTERED_APPLICATIONS_PATH, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  getRegisteredApplicationById(id: string): Promise<RegisteredApplication> {
    return this.http.request<RegisteredApplication>(`${REGISTERED_APPLICATIONS_PATH}/${encodeURIComponent(id)}`);
  }
}
