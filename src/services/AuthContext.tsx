import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
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
import type { CreateOrgUnitRequest, MoveOrgUnitRequest, OrgUnit } from '@/types/orgUnits';
import type { RlsConfig } from '@/types/rls';
import type { RegisterUserRequest, User } from '@/types/auth';
import { AuthController } from '@/controllers/AuthController';
import { AuthService, type SsoProvider } from '@/services/AuthService';
import { PermissionController } from '@/controllers/PermissionController';

interface AuthContextValue {
  user: User | null;
  /** True until first session resolution: stored user or cookie session via GET /auth/me. */
  initializing: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User>;
  listSsoProviders: () => Promise<SsoProvider[]>;
  clearError: () => void;
  logout: () => Promise<void>;
  can: (roles?: string[], permissions?: string[]) => boolean;
  canAnyPermission: (permissions: string[]) => boolean;
  listRolesPaged: (params: { page: number; size: number; sort?: string }) => Promise<PagedRoles>;
  listRolesDropdown: () => Promise<RbacRoleDropdownItem[]>;
  listPermissionsPaged: (params: { page: number; size: number; sort?: string }) => Promise<PagedPermissions>;
  listUsersPaged: (params: {
    page: number;
    size: number;
    searchKey?: string;
    roleId?: string;
    withoutOrgUnit?: boolean;
    sort?: string;
  }) => Promise<PagedUsers>;
  createRole: (body: CreateRoleRequest) => Promise<RbacRole>;
  getRole: (roleId: string) => Promise<RbacRole>;
  patchRole: (roleId: string, body: PatchRoleRequest) => Promise<RbacRole>;
  deleteRole: (roleId: string) => Promise<void>;
  listRoleVisibilityScopes: () => Promise<RoleVisibilityScope[]>;
  putRoleVisibilityScope: (roleId: string, scopeType: VisibilityScopeType) => Promise<RoleVisibilityScope>;
  addRolePermissions: (roleId: string, permissionIds: string[]) => Promise<RbacRole>;
  removeRolePermission: (roleId: string, permissionId: string) => Promise<RbacRole>;
  copyRolePermissions: (body: CopyRolePermissionsRequest) => Promise<RbacRole>;
  createPermission: (body: CreatePermissionRequest) => Promise<RbacPermissionRow>;
  patchPermission: (permissionId: string, body: PatchPermissionRequest) => Promise<RbacPermissionRow>;
  deletePermission: (permissionId: string) => Promise<void>;
  getRbacUser: (userId: string) => Promise<RbacUserDetail>;
  patchUserEnabled: (userId: string, enabled: boolean) => Promise<RbacUserDetail>;
  bulkSetUsersEnabled: (body: BulkSetUsersEnabledRequest) => Promise<BulkSetUsersEnabledResponse>;
  patchUserHierarchy: (userId: string, body: PatchUserHierarchyRequest) => Promise<RbacUserDetail>;
  addUserRoles: (userId: string, roleIds: string[]) => Promise<RbacUserDetail>;
  removeUserRole: (userId: string, roleId: string) => Promise<RbacUserDetail>;
  bulkAssignUserRoles: (body: BulkAssignRolesRequest) => Promise<BulkAssignRolesResponse>;
  bulkAssignUsersOrgUnit: (body: BulkAssignOrgUnitRequest) => Promise<BulkAssignOrgUnitResponse>;
  bulkSetRolesActive: (body: BulkSetRolesActiveRequest) => Promise<BulkSetRolesActiveResponse>;
  registerUser: (body: RegisterUserRequest) => Promise<void>;
  createOrgUnit: (body: CreateOrgUnitRequest) => Promise<OrgUnit>;
  listOrgUnits: () => Promise<OrgUnit[]>;
  listOrgUnitChildren: (orgUnitId: string) => Promise<OrgUnit[]>;
  listOrgUnitAncestors: (orgUnitId: string) => Promise<OrgUnit[]>;
  moveOrgUnit: (orgUnitId: string, body: MoveOrgUnitRequest) => Promise<OrgUnit>;
  deleteOrgUnit: (orgUnitId: string, cascade: boolean) => Promise<void>;
  getRlsConfig: () => Promise<RlsConfig>;
  patchRlsConfig: (body: RlsConfig) => Promise<RlsConfig>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const controllerRef = useRef<AuthController | null>(null);

  const authService = useMemo(
    () => new AuthService(() => controllerRef.current?.getToken() ?? null),
    []
  );

  const authController = useMemo(() => {
    const c = new AuthController(authService);
    controllerRef.current = c;
    return c;
  }, [authService]);

  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const hydrated = await authController.hydrateSessionFromApi();
        if (alive && hydrated) {
          setUser(hydrated);
        }
      } finally {
        if (alive) {
          setInitializing(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [authController]);

  const permissionController = useMemo(
    () => new PermissionController(() => user),
    [user]
  );

  const login = useCallback(
    async (email: string, password: string): Promise<User> => {
      setLoading(true);
      setError(null);

      try {
        const currentUser = await authController.login(email, password);
        setUser(currentUser);
        return currentUser;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Login failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [authController]
  );

  const listSsoProviders = useCallback(
    () => authController.listSsoProviders(),
    [authController]
  );

  const clearError = useCallback(() => setError(null), []);

  const logout = useCallback(async () => {
    await authController.logout();
    setUser(null);
  }, [authController]);

  const can = useCallback(
    (roles: string[] = [], permissions: string[] = []) => permissionController.can(roles, permissions),
    [permissionController]
  );

  const canAnyPermission = useCallback(
    (permissions: string[]) => permissionController.canAnyPermission(permissions),
    [permissionController]
  );

  const listRolesPaged = useCallback(
    (params: { page: number; size: number; sort?: string }) => authController.listRolesPaged(params),
    [authController]
  );

  const listRolesDropdown = useCallback(
    () => authController.listRolesDropdown(),
    [authController]
  );

  const listPermissionsPaged = useCallback(
    (params: { page: number; size: number; sort?: string }) => authController.listPermissionsPaged(params),
    [authController]
  );

  const listUsersPaged = useCallback(
    (params: {
      page: number;
      size: number;
      searchKey?: string;
      roleId?: string;
      withoutOrgUnit?: boolean;
      sort?: string;
    }) =>
      authController.listUsersPaged(params),
    [authController]
  );

  const createRole = useCallback(
    (body: CreateRoleRequest) => authController.createRole(body),
    [authController]
  );
  const getRole = useCallback((roleId: string) => authController.getRole(roleId), [authController]);
  const patchRole = useCallback(
    (roleId: string, body: PatchRoleRequest) => authController.patchRole(roleId, body),
    [authController]
  );
  const deleteRole = useCallback((roleId: string) => authController.deleteRole(roleId), [authController]);
  const listRoleVisibilityScopes = useCallback(
    () => authController.listRoleVisibilityScopes(),
    [authController]
  );
  const putRoleVisibilityScope = useCallback(
    (roleId: string, scopeType: VisibilityScopeType) => authController.putRoleVisibilityScope(roleId, scopeType),
    [authController]
  );
  const addRolePermissions = useCallback(
    (roleId: string, permissionIds: string[]) => authController.addRolePermissions(roleId, permissionIds),
    [authController]
  );
  const removeRolePermission = useCallback(
    (roleId: string, permissionId: string) => authController.removeRolePermission(roleId, permissionId),
    [authController]
  );
  const copyRolePermissions = useCallback(
    (body: CopyRolePermissionsRequest) => authController.copyRolePermissions(body),
    [authController]
  );
  const createPermission = useCallback(
    (body: CreatePermissionRequest) => authController.createPermission(body),
    [authController]
  );
  const patchPermission = useCallback(
    (permissionId: string, body: PatchPermissionRequest) => authController.patchPermission(permissionId, body),
    [authController]
  );
  const deletePermission = useCallback(
    (permissionId: string) => authController.deletePermission(permissionId),
    [authController]
  );
  const getRbacUser = useCallback((userId: string) => authController.getRbacUser(userId), [authController]);
  const patchUserEnabled = useCallback(
    (userId: string, enabled: boolean) => authController.patchUserEnabled(userId, enabled),
    [authController]
  );
  const bulkSetUsersEnabled = useCallback(
    (body: BulkSetUsersEnabledRequest) => authController.bulkSetUsersEnabled(body),
    [authController]
  );
  const patchUserHierarchy = useCallback(
    (userId: string, body: PatchUserHierarchyRequest) => authController.patchUserHierarchy(userId, body),
    [authController]
  );
  const addUserRoles = useCallback(
    (userId: string, roleIds: string[]) => authController.addUserRoles(userId, roleIds),
    [authController]
  );
  const removeUserRole = useCallback(
    (userId: string, roleId: string) => authController.removeUserRole(userId, roleId),
    [authController]
  );
  const bulkAssignUserRoles = useCallback(
    (body: BulkAssignRolesRequest) => authController.bulkAssignUserRoles(body),
    [authController]
  );
  const bulkAssignUsersOrgUnit = useCallback(
    (body: BulkAssignOrgUnitRequest) => authController.bulkAssignUsersOrgUnit(body),
    [authController]
  );
  const bulkSetRolesActive = useCallback(
    (body: BulkSetRolesActiveRequest) => authController.bulkSetRolesActive(body),
    [authController]
  );

  const registerUser = useCallback(
    (body: RegisterUserRequest) => authController.registerUser(body),
    [authController]
  );

  const createOrgUnit = useCallback(
    (body: CreateOrgUnitRequest) => authController.createOrgUnit(body),
    [authController]
  );

  const listOrgUnits = useCallback(() => authController.listOrgUnits(), [authController]);

  const listOrgUnitChildren = useCallback(
    (orgUnitId: string) => authController.listOrgUnitChildren(orgUnitId),
    [authController]
  );

  const listOrgUnitAncestors = useCallback(
    (orgUnitId: string) => authController.listOrgUnitAncestors(orgUnitId),
    [authController]
  );

  const moveOrgUnit = useCallback(
    (orgUnitId: string, body: MoveOrgUnitRequest) => authController.moveOrgUnit(orgUnitId, body),
    [authController]
  );

  const deleteOrgUnit = useCallback(
    (orgUnitId: string, cascade: boolean) => authController.deleteOrgUnit(orgUnitId, cascade),
    [authController]
  );
  const getRlsConfig = useCallback(() => authController.getRlsConfig(), [authController]);
  const patchRlsConfig = useCallback((body: RlsConfig) => authController.patchRlsConfig(body), [authController]);

  const value: AuthContextValue = {
    user,
    initializing,
    loading,
    error,
    login,
    listSsoProviders,
    clearError,
    logout,
    can,
    canAnyPermission,
    listRolesPaged,
    listRolesDropdown,
    listPermissionsPaged,
    listUsersPaged,
    createRole,
    getRole,
    patchRole,
    deleteRole,
    listRoleVisibilityScopes,
    putRoleVisibilityScope,
    addRolePermissions,
    removeRolePermission,
    copyRolePermissions,
    createPermission,
    patchPermission,
    deletePermission,
    getRbacUser,
    patchUserEnabled,
    bulkSetUsersEnabled,
    patchUserHierarchy,
    addUserRoles,
    removeUserRole,
    bulkAssignUserRoles,
    bulkAssignUsersOrgUnit,
    bulkSetRolesActive,
    registerUser,
    createOrgUnit,
    listOrgUnits,
    listOrgUnitChildren,
    listOrgUnitAncestors,
    moveOrgUnit,
    deleteOrgUnit,
    getRlsConfig,
    patchRlsConfig
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
