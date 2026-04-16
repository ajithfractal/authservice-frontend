import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, MoreHorizontal, Plus } from 'lucide-react';
import { useAuth } from '@/services/AuthContext';
import type { RbacRoleDropdownItem, RbacUser } from '@/types/rbac';
import type { OrgUnit } from '@/types/orgUnits';
import { AppButton } from '@/shared/components/app/AppButton';
import { AdminUserCreateButton } from '@/shared/components/app/AdminButtons';
import { AppModal, ModalActions } from '@/shared/components/app/AppModal';
import { UserManageModal } from '@/views/pages/admin/UserManageModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DATA_TABLE_HEAD_STICKY_CLASS, DATA_TABLE_SCROLL_CLASS } from '@/shared/components/app/dataTableScroll';
import { TableSortHeader } from '@/shared/components/app/TableSortHeader';
import { ViewMoreListModal } from '@/shared/components/app/ViewMoreListModal';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/shared/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { MultiSelect } from '@/shared/components/ui/multi-select';

const PAGE_SIZE = 20;

function displayName(u: RbacUser): string {
  const parts = [u.firstName, u.lastName].map((s) => s?.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : u.email;
}

export function UsersPage() {
  const {
    can,
    listUsersPaged,
    listRolesDropdown,
    listOrgUnits,
    bulkAssignUserRoles,
    bulkAssignUsersOrgUnit,
    bulkSetUsersEnabled,
    registerUser
  } = useAuth();
  const [items, setItems] = useState<RbacUser[]>([]);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sortBy, setSortBy] = useState<'firstName' | 'email' | 'enabled' | 'roles'>('firstName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchKey, setSearchKey] = useState<string | undefined>(undefined);
  const [roleId, setRoleId] = useState<string | undefined>(undefined);

  const [roleOptions, setRoleOptions] = useState<RbacRoleDropdownItem[]>([]);
  const [rolesLoadError, setRolesLoadError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regApplicationCode, setRegApplicationCode] = useState('');
  const [regSaving, setRegSaving] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  const [manageRoleUserId, setManageRoleUserId] = useState<string | null>(null);
  const [manageOrgUserId, setManageOrgUserId] = useState<string | null>(null);
  const [togglingEnabledUserId, setTogglingEnabledUserId] = useState<string | null>(null);
  const [withoutOrgUnitOnly, setWithoutOrgUnitOnly] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkModalMode, setBulkModalMode] = useState<'org' | 'roles'>('org');
  const [bulkOrgUnitId, setBulkOrgUnitId] = useState('');
  const [bulkRoleIds, setBulkRoleIds] = useState<string[]>([]);
  const [bulkOrgSaving, setBulkOrgSaving] = useState(false);
  const [bulkRoleSaving, setBulkRoleSaving] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);
  const [orgUnitOptions, setOrgUnitOptions] = useState<OrgUnit[]>([]);

  const canViewAdminFilter = can([], ['admin:read']);
  const canBulkWrite = can([], ['users:write']);
  const canReadOrgUnits = can([], ['org-units:read']);
  const canReadRoles = can([], ['roles:read']);
  const canShowUserRowActions = canReadRoles || canReadOrgUnits;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listUsersPaged({
        page,
        size: PAGE_SIZE,
        searchKey,
        roleId,
        withoutOrgUnit: withoutOrgUnitOnly,
        sort: `${sortBy},${sortDir}`
      });
      setItems(res.items);
      setPageCount(res.pageCount);
      setPageSize(res.limit);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [listUsersPaged, page, searchKey, roleId, withoutOrgUnitOnly, sortBy, sortDir]);

  const changeSort = (field: 'firstName' | 'email' | 'enabled' | 'roles') => {
    setPage(0);
    if (sortBy === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(field);
    setSortDir('asc');
  };

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let alive = true;
    setRolesLoadError(null);
    void listRolesDropdown()
      .then((rows) => {
        if (alive) setRoleOptions(rows);
      })
      .catch((e) => {
        if (alive) setRolesLoadError(e instanceof Error ? e.message : 'Could not load roles');
      });
    return () => {
      alive = false;
    };
  }, [listRolesDropdown]);

  useEffect(() => {
    if (!canReadOrgUnits) return;
    let alive = true;
    void listOrgUnits()
      .then((rows) => {
        if (!alive) return;
        setOrgUnitOptions(
          [...rows].sort((a, b) => {
            const d = (a.depth ?? 0) - (b.depth ?? 0);
            if (d !== 0) return d;
            return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
          })
        );
      })
      .catch(() => {
        if (!alive) return;
        setOrgUnitOptions([]);
      });
    return () => {
      alive = false;
    };
  }, [canReadOrgUnits, listOrgUnits]);

  const orgUnitNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const ou of orgUnitOptions) map.set(ou.id, ou.name);
    return map;
  }, [orgUnitOptions]);

  const onToggleUser = (userId: string, checked: boolean) => {
    setSelectedUserIds((prev) => {
      if (checked) return prev.includes(userId) ? prev : [...prev, userId];
      return prev.filter((id) => id !== userId);
    });
  };

  const onToggleAllUsers = (checked: boolean) => {
    if (!checked) {
      setSelectedUserIds([]);
      return;
    }
    setSelectedUserIds(items.map((u) => u.id));
  };

  const runBulkAssignOrgUnit = async () => {
    if (!canBulkWrite || !bulkOrgUnitId || selectedUserIds.length === 0) return;
    setBulkOrgSaving(true);
    setBulkError(null);
    setBulkSuccess(null);
    try {
      const res = await bulkAssignUsersOrgUnit({
        userIds: selectedUserIds,
        orgUnitId: bulkOrgUnitId
      });
      setBulkSuccess(`Assigned org unit to ${res.updatedCount} user(s).`);
      setSelectedUserIds([]);
      await load();
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : 'Bulk org assignment failed');
    } finally {
      setBulkOrgSaving(false);
    }
  };

  const runBulkAssignRoles = async () => {
    if (!canBulkWrite || selectedUserIds.length === 0) return;
    setBulkRoleSaving(true);
    setBulkError(null);
    setBulkSuccess(null);
    try {
      const res = await bulkAssignUserRoles({
        userIds: selectedUserIds,
        roleIds: bulkRoleIds
      });
      setBulkSuccess(`Assigned ${res.assignedRoleCount} role(s) to ${res.updatedUserCount} user(s).`);
      await load();
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : 'Bulk role assignment failed');
    } finally {
      setBulkRoleSaving(false);
    }
  };

  const prefillBulkRolesFromSelection = () => {
    const selected = items.filter((u) => selectedUserIds.includes(u.id));
    const mergedRoleIds = Array.from(
      new Set(
        selected.flatMap((u) => (u.roles ?? []).map((r) => r.id))
      )
    );
    setBulkRoleIds(mergedRoleIds);
  };

  const toggleEnabled = async (u: RbacUser, checked: boolean) => {
    if (u.enabled === checked) return;
    setTogglingEnabledUserId(u.id);
    try {
      await bulkSetUsersEnabled({
        userIds: [u.id],
        enabled: checked
      });
      setItems((prev) =>
        prev.map((item) => (item.id === u.id ? { ...item, enabled: checked } : item))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update enabled status');
    } finally {
      setTogglingEnabledUserId(null);
    }
  };

  const canPrev = page > 0;
  const canNext = page < pageCount - 1;

  const applySearch = () => {
    setPage(0);
    const q = searchInput.trim();
    setSearchKey(q || undefined);
  };

  const onRoleFilterChange = (value: string) => {
    setPage(0);
    setRoleId(value || undefined);
  };

  const selectedCount = selectedUserIds.length;
  const allSelected = useMemo(
    () => items.length > 0 && selectedCount === items.length,
    [items.length, selectedCount]
  );

  const openAddUser = () => {
    setAddOpen(true);
    setRegEmail('');
    setRegPassword('');
    setRegFirstName('');
    setRegLastName('');
    setRegApplicationCode('');
    setRegError(null);
  };

  const submitRegister = async (e: FormEvent) => {
    e.preventDefault();
    setRegSaving(true);
    setRegError(null);
    try {
      await registerUser({
        email: regEmail.trim(),
        password: regPassword,
        firstName: regFirstName.trim(),
        lastName: regLastName.trim(),
        orgUnitId: null,
        applicationCode: regApplicationCode.trim()
      });
      setAddOpen(false);
      void load();
    } catch (err) {
      setRegError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setRegSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>
          Search, open a user to enable/disable and assign roles.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="users-search" className="text-xs text-muted-foreground">
                Search
              </label>
              <Input
                id="users-search"
                placeholder="Search by email or name…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="users-role-filter" className="text-xs text-muted-foreground">
                Role
              </label>
              <Select value={roleId ?? '__all__'} onValueChange={(value) => onRoleFilterChange(value === '__all__' ? '' : value)}>
                <SelectTrigger id="users-role-filter" className={cn(rolesLoadError && 'border-destructive/50')}>
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All roles</SelectItem>
                  {roleOptions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto">
            {canViewAdminFilter ? (
              <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5">
                <Checkbox
                  id="users-without-org-filter"
                  checked={withoutOrgUnitOnly}
                  onCheckedChange={(checked) => {
                    setPage(0);
                    setWithoutOrgUnitOnly(checked === true);
                    setSelectedUserIds([]);
                  }}
                />
                <Label htmlFor="users-without-org-filter" className="font-normal">
                  Without org unit
                </Label>
              </div>
            ) : null}
            {canBulkWrite ? (
              <AppButton
                type="button"
                size="sm"
                variant={bulkMode ? 'secondary' : 'outline'}
                onClick={() => {
                  setBulkMode((v) => !v);
                  setSelectedUserIds([]);
                }}
              >
                {bulkMode ? 'Exit bulk edit' : 'Bulk edit'}
              </AppButton>
            ) : null}
            {bulkMode ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <AppButton type="button" size="sm" disabled={selectedCount === 0}>
                    <MoreHorizontal className="mr-2 h-4 w-4" />
                    Actions ({selectedCount})
                  </AppButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkModalMode('org');
                      setBulkModalOpen(true);
                    }}
                  >
                    Assign org unit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      prefillBulkRolesFromSelection();
                      setBulkModalMode('roles');
                      setBulkModalOpen(true);
                    }}
                  >
                    Assign roles
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <AdminUserCreateButton type="button" size="sm" className="w-full lg:w-auto" onClick={openAddUser}>
              <Plus className="mr-2 h-4 w-4" />
              Add user
            </AdminUserCreateButton>
          </div>
        </div>
        {rolesLoadError && (
          <p className="text-xs text-destructive">{rolesLoadError}</p>
        )}

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading users…
          </div>
        ) : (
          <>
            <Table wrapperClassName={DATA_TABLE_SCROLL_CLASS}>
              <TableHeader className={DATA_TABLE_HEAD_STICKY_CLASS}>
                <TableRow>
                  {bulkMode ? (
                    <TableHead className="w-12 text-center">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(checked) => onToggleAllUsers(checked === true)}
                        aria-label="Select all users on current page"
                      />
                    </TableHead>
                  ) : null}
                  <TableHead>
                    <TableSortHeader
                      label="Name"
                      active={sortBy === 'firstName'}
                      direction={sortDir}
                      onClick={() => changeSort('firstName')}
                    />
                  </TableHead>
                  <TableHead>
                    <TableSortHeader
                      label="Email"
                      active={sortBy === 'email'}
                      direction={sortDir}
                      onClick={() => changeSort('email')}
                    />
                  </TableHead>
                  <TableHead className="w-24">
                    <TableSortHeader
                      label="Status"
                      active={sortBy === 'enabled'}
                      direction={sortDir}
                      onClick={() => changeSort('enabled')}
                    />
                  </TableHead>
                  <TableHead className="min-w-[30%]">
                    <TableSortHeader
                      label="Roles"
                      active={sortBy === 'roles'}
                      direction={sortDir}
                      onClick={() => changeSort('roles')}
                    />
                  </TableHead>
                  <TableHead className="min-w-[16rem]">
                    <TableSortHeader label="Current org unit" />
                  </TableHead>
                  <TableHead className="w-20 text-center">Enabled</TableHead>
                  <TableHead className="w-[1%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={bulkMode ? 8 : 7} className="text-center text-muted-foreground">
                      No users on this page.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((u) => (
                    <TableRow key={u.id}>
                      {bulkMode ? (
                        <TableCell className="text-center">
                          <Checkbox
                            checked={selectedUserIds.includes(u.id)}
                            onCheckedChange={(checked) => onToggleUser(u.id, checked === true)}
                            aria-label={`Select ${displayName(u)}`}
                          />
                        </TableCell>
                      ) : null}
                      <TableCell className="font-medium">{displayName(u)}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.enabled === false ? 'destructive' : 'success'}>
                          {u.enabled === false ? 'Inactive' : 'Active'} 
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ViewMoreListModal
                          title={`Roles — ${displayName(u)}`}
                          items={(u.roles ?? []).map((r) => ({
                            id: r.id,
                            label: r.name,
                            description: r.description
                          }))}
                          maxVisible={4}
                          emptyLabel="—"
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.orgUnitId ? (orgUnitNameById.get(u.orgUnitId) ?? u.orgUnitId) : 'Unassigned'}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-2">
                          <Switch
                            className={`
                              relative h-6 w-11 rounded-full
                              bg-gray-400
                              data-[state=checked]:bg-gray-400
                        
                              [&>span]:h-5 [&>span]:w-5
                              [&>span]:bg-white
                              [&>span]:rounded-full
                              [&>span]:shadow
                              [&>span]:transition-transform
                        
                              data-[state=checked]:[&>span]:translate-x-5
                              data-[state=unchecked]:[&>span]:translate-x-0.5
                        
                              data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed
                            `}
                            checked={u.enabled !== false}
                            disabled={togglingEnabledUserId === u.id}
                            onCheckedChange={(checked) => void toggleEnabled(u, checked === true)}
                            aria-label={`Toggle enabled for ${displayName(u)}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {bulkMode ? (
                          <span className="text-xs text-muted-foreground">Selected via checkbox</span>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <AppButton
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={!canShowUserRowActions}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open actions</span>
                              </AppButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canReadRoles ? (
                                <DropdownMenuItem onClick={() => setManageRoleUserId(u.id)}>
                                  Manage roles
                                </DropdownMenuItem>
                              ) : null}
                              {canReadRoles && canReadOrgUnits ? <DropdownMenuSeparator /> : null}
                              {canReadOrgUnits ? (
                                <DropdownMenuItem onClick={() => setManageOrgUserId(u.id)}>
                                  Manage org-units
                                </DropdownMenuItem>
                              ) : null}
                              {!canShowUserRowActions ? (
                                <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm text-muted-foreground">
              <span>
                Page {page + 1} of {Math.max(pageCount, 1)} · {pageSize} per page
              </span>
              <div className="flex gap-2">
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canPrev || loading}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </AppButton>
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canNext || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </AppButton>
              </div>
            </div>
          </>
        )}

      </CardContent>

      <UserManageModal
        userId={manageRoleUserId}
        mode="roles"
        open={!!manageRoleUserId}
        onClose={() => setManageRoleUserId(null)}
        onUpdated={() => void load()}
      />
      <UserManageModal
        userId={manageOrgUserId}
        mode="org"
        open={!!manageOrgUserId}
        onClose={() => setManageOrgUserId(null)}
        onUpdated={() => void load()}
      />

      <AppModal open={addOpen} onClose={() => setAddOpen(false)} title="Add user">
        <form onSubmit={(e) => void submitRegister(e)} className="space-y-4">
          {regError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {regError}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="reg-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="reg-password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="reg-first" className="text-sm font-medium">
                First name
              </label>
              <Input
                id="reg-first"
                value={regFirstName}
                onChange={(e) => setRegFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="reg-last" className="text-sm font-medium">
                Last name
              </label>
              <Input id="reg-last" value={regLastName} onChange={(e) => setRegLastName(e.target.value)} required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="reg-app" className="text-sm font-medium">
                Application code
              </label>
              <Input
                id="reg-app"
                value={regApplicationCode}
                onChange={(e) => setRegApplicationCode(e.target.value)}
                placeholder="e.g. inventory"
                required
              />
            </div>
          </div>
          <ModalActions>
            <AppButton type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </AppButton>
            <AppButton type="submit" disabled={regSaving}>
              {regSaving ? 'Creating…' : 'Create user'}
            </AppButton>
          </ModalActions>
        </form>
      </AppModal>

      <AppModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title={bulkModalMode === 'org' ? 'Bulk assign org unit' : 'Bulk assign roles'}
      >
        <div className="space-y-4">
          {bulkError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {bulkError}
            </div>
          ) : null}
          {bulkSuccess ? (
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm text-emerald-700">
              {bulkSuccess}
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Selected users: <span className="font-medium text-foreground">{selectedCount}</span>
          </p>

          {bulkModalMode === 'org' ? (
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">Assign org unit</p>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={bulkOrgUnitId || '__none__'}
                  disabled={!canBulkWrite || bulkOrgSaving}
                  onValueChange={(value) => setBulkOrgUnitId(value === '__none__' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select org unit..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select org unit...</SelectItem>
                    {orgUnitOptions.map((ou) => (
                      <SelectItem key={ou.id} value={ou.id}>
                        {`${'  '.repeat(ou.depth ?? 0)}${ou.name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <AppButton
                  type="button"
                  size="sm"
                  disabled={!canBulkWrite || bulkOrgSaving || !bulkOrgUnitId || selectedCount === 0}
                  onClick={() => void runBulkAssignOrgUnit()}
                >
                  {bulkOrgSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Assign org unit
                </AppButton>
              </div>
            </div>
          ) : (
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">Assign roles</p>
              <MultiSelect
                value={bulkRoleIds}
                onChange={setBulkRoleIds}
                disabled={!canBulkWrite || bulkRoleSaving}
                placeholder="Select roles..."
                options={roleOptions.map((r) => ({ value: r.id, label: r.name }))}
              />
              <AppButton
                type="button"
                size="sm"
                disabled={!canBulkWrite || bulkRoleSaving || selectedCount === 0}
                onClick={() => void runBulkAssignRoles()}
              >
                {bulkRoleSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Assign roles
              </AppButton>
            </div>
          )}

          <ModalActions>
            <AppButton type="button" variant="outline" onClick={() => setBulkModalOpen(false)}>
              Close
            </AppButton>
          </ModalActions>
        </div>
      </AppModal>
    </Card>
  );
}
