import { AUTH_TOKEN_COOKIE_NAME, KEYCLOAK_CLIENT_ID } from '@/config/env';
import { AuthService, type SsoProvider } from '@/services/AuthService';
import type { CreateOrgUnitRequest, MoveOrgUnitRequest, OrgUnit } from '@/types/orgUnits';
import type {
  CreateRegisteredApplicationRequest,
  RegisteredApplication
} from '@/types/registeredApplications';
import type { RlsConfig } from '@/types/rls';
import { eraseCookieBestEffort, getCookieValue } from '@/utils/cookieAuth';
import { isTokenExpired, mergeUserWithKeycloakAccessToken } from '@/utils/jwt';
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
import type { RegisterUserRequest, User } from '@/types/auth';

const LEGACY_TOKEN_KEY = 'hr_app_token';
const LEGACY_USER_KEY = 'hr_app_user';

function clearLegacyLocalStorageAuth() {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Bearer token for Authorization header: only from a readable cookie (never localStorage).
 * HttpOnly session cookies are sent via fetch credentials only; this returns null.
 */
function bearerFromReadableCookie(): string | null {
  if (!AUTH_TOKEN_COOKIE_NAME) return null;
  const raw = getCookieValue(AUTH_TOKEN_COOKIE_NAME);
  if (!raw || isTokenExpired(raw)) return null;
  return raw;
}

export class AuthController {
  constructor(private authService: AuthService) {
    clearLegacyLocalStorageAuth();
  }

  getToken(): string | null {
    return bearerFromReadableCookie();
  }

  async login(email: string, password: string): Promise<User> {
    const response = await this.authService.login(email, password);
    let sessionUser = response.user;
    if (!sessionUser) {
      sessionUser = await this.authService.getCurrentUser();
    }
    const accessToken = response.accessToken ?? response.token;
    return this.storeLoginResponse(accessToken, sessionUser);
  }

  listSsoProviders(): Promise<SsoProvider[]> {
    return this.authService.listSsoProviders();
  }

  listRolesPaged(params: { page: number; size: number; sort?: string }): Promise<PagedRoles> {
    return this.authService.listRolesPaged(params);
  }

  listRolesDropdown(): Promise<RbacRoleDropdownItem[]> {
    return this.authService.listRolesDropdown();
  }

  listPermissionsPaged(params: { page: number; size: number; sort?: string }): Promise<PagedPermissions> {
    return this.authService.listPermissionsPaged(params);
  }

  listUsersPaged(params: {
    page: number;
    size: number;
    searchKey?: string;
    roleId?: string;
    withoutOrgUnit?: boolean;
    sort?: string;
  }): Promise<PagedUsers> {
    return this.authService.listUsersPaged(params);
  }

  registerUser(body: RegisterUserRequest): Promise<void> {
    return this.authService.registerUser(body);
  }

  createRole(body: CreateRoleRequest): Promise<RbacRole> {
    return this.authService.createRole(body);
  }

  getRole(roleId: string): Promise<RbacRole> {
    return this.authService.getRole(roleId);
  }

  patchRole(roleId: string, body: PatchRoleRequest): Promise<RbacRole> {
    return this.authService.patchRole(roleId, body);
  }

  deleteRole(roleId: string): Promise<void> {
    return this.authService.deleteRole(roleId);
  }

  listRoleVisibilityScopes(): Promise<RoleVisibilityScope[]> {
    return this.authService.listRoleVisibilityScopes();
  }

  putRoleVisibilityScope(roleId: string, scopeType: VisibilityScopeType): Promise<RoleVisibilityScope> {
    return this.authService.putRoleVisibilityScope(roleId, scopeType);
  }

  addRolePermissions(roleId: string, permissionIds: string[]): Promise<RbacRole> {
    return this.authService.addRolePermissions(roleId, permissionIds);
  }

  removeRolePermission(roleId: string, permissionId: string): Promise<RbacRole> {
    return this.authService.removeRolePermission(roleId, permissionId);
  }

  copyRolePermissions(body: CopyRolePermissionsRequest): Promise<RbacRole> {
    return this.authService.copyRolePermissions(body);
  }

  createPermission(body: CreatePermissionRequest): Promise<RbacPermissionRow> {
    return this.authService.createPermission(body);
  }

  patchPermission(permissionId: string, body: PatchPermissionRequest): Promise<RbacPermissionRow> {
    return this.authService.patchPermission(permissionId, body);
  }

  deletePermission(permissionId: string): Promise<void> {
    return this.authService.deletePermission(permissionId);
  }

  getRbacUser(userId: string): Promise<RbacUserDetail> {
    return this.authService.getRbacUser(userId);
  }

  patchUserEnabled(userId: string, enabled: boolean): Promise<RbacUserDetail> {
    return this.authService.patchUserEnabled(userId, enabled);
  }

  bulkSetUsersEnabled(body: BulkSetUsersEnabledRequest): Promise<BulkSetUsersEnabledResponse> {
    return this.authService.bulkSetUsersEnabled(body);
  }

  patchUserHierarchy(userId: string, body: PatchUserHierarchyRequest): Promise<RbacUserDetail> {
    return this.authService.patchUserHierarchy(userId, body);
  }

  addUserRoles(userId: string, roleIds: string[]): Promise<RbacUserDetail> {
    return this.authService.addUserRoles(userId, roleIds);
  }

  removeUserRole(userId: string, roleId: string): Promise<RbacUserDetail> {
    return this.authService.removeUserRole(userId, roleId);
  }

  bulkAssignUserRoles(body: BulkAssignRolesRequest): Promise<BulkAssignRolesResponse> {
    return this.authService.bulkAssignUserRoles(body);
  }

  bulkAssignUsersOrgUnit(body: BulkAssignOrgUnitRequest): Promise<BulkAssignOrgUnitResponse> {
    return this.authService.bulkAssignUsersOrgUnit(body);
  }

  bulkSetRolesActive(body: BulkSetRolesActiveRequest): Promise<BulkSetRolesActiveResponse> {
    return this.authService.bulkSetRolesActive(body);
  }

  listOrgUnits(): Promise<OrgUnit[]> {
    return this.authService.listOrgUnits();
  }

  createOrgUnit(body: CreateOrgUnitRequest): Promise<OrgUnit> {
    return this.authService.createOrgUnit(body);
  }

  listOrgUnitChildren(orgUnitId: string): Promise<OrgUnit[]> {
    return this.authService.listOrgUnitChildren(orgUnitId);
  }

  listOrgUnitAncestors(orgUnitId: string): Promise<OrgUnit[]> {
    return this.authService.listOrgUnitAncestors(orgUnitId);
  }

  moveOrgUnit(orgUnitId: string, body: MoveOrgUnitRequest): Promise<OrgUnit> {
    return this.authService.moveOrgUnit(orgUnitId, body);
  }

  deleteOrgUnit(orgUnitId: string, cascade: boolean): Promise<void> {
    return this.authService.deleteOrgUnit(orgUnitId, cascade);
  }

  getRlsConfig(): Promise<RlsConfig> {
    return this.authService.getRlsConfig();
  }

  patchRlsConfig(body: RlsConfig): Promise<RlsConfig> {
    return this.authService.patchRlsConfig(body);
  }

  listRegisteredApplications(): Promise<RegisteredApplication[]> {
    return this.authService.listRegisteredApplications();
  }

  createRegisteredApplication(body: CreateRegisteredApplicationRequest): Promise<RegisteredApplication> {
    return this.authService.createRegisteredApplication(body);
  }

  getRegisteredApplicationById(id: string): Promise<RegisteredApplication> {
    return this.authService.getRegisteredApplicationById(id);
  }

  /**
   * Secured GET /auth/me: 401 is treated as "no session" (guest), not an error.
   */
  async hydrateSessionFromApi(): Promise<User | null> {
    const user = await this.authService.getCurrentUserOrGuest();
    if (!user) return null;
    return this.applySessionUser(user);
  }

  async refreshCurrentUser(): Promise<User> {
    const user = await this.authService.getCurrentUser();
    return this.applySessionUser(user);
  }

  /** Session user from /auth/me (+ login) only; optional JWT overlay. No GET /rbac/permissions here. */
  private applySessionUser(user: User): User {
    let merged: User = {
      ...user,
      permissions: user.permissions ?? []
    };

    const jwt = bearerFromReadableCookie();
    if (jwt) {
      merged = mergeUserWithKeycloakAccessToken(jwt, merged, KEYCLOAK_CLIENT_ID);
    }

    return merged;
  }

  /**
   * Calls POST /auth/logout (cookies include REFRESH_TOKEN for Keycloak revoke), then clears local state.
   * Best-effort: local cleanup runs even if the request fails.
   */
  async logout(): Promise<void> {
    try {
      await this.authService.postLogout();
    } catch {
      /* still clear app state; server may have cleared cookies anyway */
    } finally {
      clearLegacyLocalStorageAuth();
      if (AUTH_TOKEN_COOKIE_NAME) {
        eraseCookieBestEffort(AUTH_TOKEN_COOKIE_NAME);
      }
    }
  }

  private storeLoginResponse(token: string | undefined, user: User | undefined): User {
    if (!user) {
      throw new Error('Login succeeded but no user profile was returned. Try again or verify GET /auth/me.');
    }

    const fromBody = token?.trim();
    const fromCookie =
      !fromBody && AUTH_TOKEN_COOKIE_NAME ? getCookieValue(AUTH_TOKEN_COOKIE_NAME) : null;
    const accessJwt = fromBody || fromCookie?.trim() || '';

    let mergedUser: User = {
      ...user,
      permissions: user.permissions ?? []
    };

    if (accessJwt && !isTokenExpired(accessJwt)) {
      mergedUser = mergeUserWithKeycloakAccessToken(accessJwt, mergedUser, KEYCLOAK_CLIENT_ID);
    }

    return mergedUser;
  }
}
