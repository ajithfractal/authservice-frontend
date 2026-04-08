import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, MoreHorizontal, Plus } from 'lucide-react';
import { useAuth } from '@/services/AuthContext';
import type { RbacRole, VisibilityScopeType } from '@/types/rbac';
import { AppButton } from '@/shared/components/app/AppButton';
import { AdminRoleCreateButton } from '@/shared/components/app/AdminButtons';
import { AppModal, ConfirmDialog, ModalActions } from '@/shared/components/app/AppModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/shared/components/ui/switch';
import { DATA_TABLE_HEAD_STICKY_CLASS, DATA_TABLE_SCROLL_CLASS } from '@/shared/components/app/dataTableScroll';
import { TableSortHeader } from '@/shared/components/app/TableSortHeader';
import { ViewMoreListModal } from '@/shared/components/app/ViewMoreListModal';
import { ViewMoreText } from '@/shared/components/app/ViewMoreText';
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
import { RoleFormModal } from '@/views/pages/admin/RoleFormModal';
import { RolePermissionsModal } from '@/views/pages/admin/RolePermissionsModal';

const PAGE_SIZE = 20;

export function RolesPage() {
  const { user, can, listRolesPaged, patchRole, bulkSetRolesActive, deleteRole, listRoleVisibilityScopes, putRoleVisibilityScope } = useAuth();
  const [items, setItems] = useState<RbacRole[]>([]);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sortBy, setSortBy] = useState<'name' | 'description' | 'active'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scopeLoadError, setScopeLoadError] = useState<string | null>(null);
  const [scopeByRoleId, setScopeByRoleId] = useState<Record<string, VisibilityScopeType>>({});

  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<RbacRole | null>(null);
  const [permRole, setPermRole] = useState<RbacRole | null>(null);
  const [scopeRole, setScopeRole] = useState<RbacRole | null>(null);
  const [scopeDraft, setScopeDraft] = useState<'' | VisibilityScopeType>('');
  const [scopeSaving, setScopeSaving] = useState(false);
  const [deleteRoleState, setDeleteRoleState] = useState<RbacRole | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [togglingActiveRoleId, setTogglingActiveRoleId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listRolesPaged({ page, size: PAGE_SIZE, sort: `${sortBy},${sortDir}` });
      setItems(res.items);
      setPageCount(res.pageCount);
      setPageSize(res.limit);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load roles');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [listRolesPaged, page, sortBy, sortDir]);

  const changeSort = (field: 'name' | 'description' | 'active') => {
    setPage(0);
    if (sortBy === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(field);
    setSortDir('asc');
  };

  const loadScopes = useCallback(async () => {
    setScopeLoadError(null);
    try {
      const rows = await listRoleVisibilityScopes();
      const map: Record<string, VisibilityScopeType> = {};
      for (const row of rows) {
        if (row.roleId && row.scopeType) map[row.roleId] = row.scopeType;
      }
      setScopeByRoleId(map);
    } catch (e) {
      setScopeLoadError(e instanceof Error ? e.message : 'Failed to load role visibility scopes');
    }
  }, [listRoleVisibilityScopes]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadScopes();
  }, [loadScopes]);

  useEffect(() => {
    if (!scopeRole) {
      setScopeDraft('');
      return;
    }
    setScopeDraft(scopeByRoleId[scopeRole.id] ?? '');
  }, [scopeRole, scopeByRoleId]);

  const canPrev = page > 0;
  const canNext = page < pageCount - 1;
  const canWriteRoles = can([], ['roles:write']);

  const confirmDelete = async () => {
    if (!deleteRoleState) return;
    setDeleteLoading(true);
    try {
      await deleteRole(deleteRoleState.id);
      setDeleteRoleState(null);
      void load();
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleRoleActive = async (role: RbacRole, checked: boolean) => {
    if (!canWriteRoles || role.active === checked) return;
    setTogglingActiveRoleId(role.id);
    setError(null);
    try {
      await bulkSetRolesActive({
        roleIds: [role.id],
        active: checked
      });
      setItems((prev) => prev.map((r) => (r.id === role.id ? { ...r, active: checked } : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update role status');
    } finally {
      setTogglingActiveRoleId(null);
    }
  };

  const saveScope = async () => {
    if (!scopeRole || !scopeDraft) return;
    setScopeSaving(true);
    setError(null);
    try {
      const saved = await putRoleVisibilityScope(scopeRole.id, scopeDraft);
      setScopeByRoleId((prev) => ({ ...prev, [scopeRole.id]: saved.scopeType }));
      setScopeRole(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update visibility scope');
    } finally {
      setScopeSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Roles</CardTitle>
          <CardDescription>
            Create roles, attach permissions, and keep them active.
          </CardDescription>
        </div>
        <AdminRoleCreateButton
          type="button"
          size="sm"
          onClick={() => setCreateOpen(true)}
          icon={<Plus className="mr-2 h-4 w-4" />}
          label="Create role"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {scopeLoadError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {scopeLoadError}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading roles…
          </div>
        ) : (
          <>
            <Table wrapperClassName={DATA_TABLE_SCROLL_CLASS}>
              <TableHeader className={DATA_TABLE_HEAD_STICKY_CLASS}>
                <TableRow>
                  <TableHead>
                    <TableSortHeader
                      label="Name"
                      active={sortBy === 'name'}
                      direction={sortDir}
                      onClick={() => changeSort('name')}
                    />
                  </TableHead>
                  <TableHead>
                    <TableSortHeader
                      label="Description"
                      active={sortBy === 'description'}
                      direction={sortDir}
                      onClick={() => changeSort('description')}
                    />
                  </TableHead>
                  <TableHead className="w-24">
                    <TableSortHeader
                      label="Status"
                      active={sortBy === 'active'}
                      direction={sortDir}
                      onClick={() => changeSort('active')}
                    />
                  </TableHead>
                  <TableHead className="min-w-[220px]"><TableSortHeader label="Visibility scope" /></TableHead>
                  <TableHead className="min-w-[28%]"><TableSortHeader label="Permissions" /></TableHead>
                  <TableHead className="w-[1%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No roles on this page.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell className="max-w-xs min-w-[8rem]">
                        <ViewMoreText text={role.description ?? ''} modalTitle="Description" />
                      </TableCell>
                      <TableCell>
                        <div className="inline-flex items-center gap-2">
                          <Badge variant={role.active === false ? 'destructive' : 'success'}>
                            {role.active === false ? 'Inactive' : 'Active'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{scopeByRoleId[role.id] ?? 'Not set'}</TableCell>
                      <TableCell>
                        <ViewMoreListModal
                          title={`Permissions — ${role.name}`}
                          items={(role.permissions ?? []).map((p) => ({
                            id: p.id,
                            label: p.name,
                            description: p.description
                          }))}
                          maxVisible={4}
                          emptyLabel="None"
                        />
                      </TableCell>
                      <TableCell>
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
                            checked={role.active !== false}
                            disabled={!canWriteRoles || togglingActiveRoleId === role.id}
                            onCheckedChange={(checked) => void toggleRoleActive(role, checked === true)}
                            aria-label={`Toggle active for ${role.name}`}
                          />
                          </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <AppButton type="button" variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open actions</span>
                            </AppButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canWriteRoles ? (
                              <>
                                <DropdownMenuItem onClick={() => setEditRole(role)}>Edit role</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setPermRole(role)}>Manage permissions</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setScopeRole(role)}>Manage visibility scope</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={() => setDeleteRoleState(role)}>
                                  Delete role
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      <RoleFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
        applicationIdFallback={user?.applicationId}
        onSaved={() => void load()}
      />
      <RoleFormModal
        open={!!editRole}
        onClose={() => setEditRole(null)}
        mode="edit"
        initial={editRole ?? undefined}
        onSaved={() => void load()}
      />
      <AppModal
        open={!!scopeRole}
        onClose={() => setScopeRole(null)}
        title={scopeRole ? `Visibility scope — ${scopeRole.name}` : 'Visibility scope'}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="role-visibility-scope" className="text-sm font-medium">
              Scope
            </label>
            <Select value={scopeDraft || '__none__'} onValueChange={(value) => setScopeDraft(value === '__none__' ? '' : (value as VisibilityScopeType))}>
              <SelectTrigger id="role-visibility-scope">
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not set</SelectItem>
                <SelectItem value="ALL">ALL</SelectItem>
                <SelectItem value="SUBTREE">SUBTREE</SelectItem>
                <SelectItem value="SELF">SELF</SelectItem>
                <SelectItem value="NONE">NONE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ModalActions>
            <AppButton type="button" variant="outline" onClick={() => setScopeRole(null)}>
              Cancel
            </AppButton>
            <AppButton type="button" disabled={!scopeDraft || scopeSaving} onClick={() => void saveScope()}>
              {scopeSaving ? 'Saving…' : 'Save'}
            </AppButton>
          </ModalActions>
        </div>
      </AppModal>
      <RolePermissionsModal
        roleId={permRole?.id ?? null}
        roleName={permRole?.name ?? ''}
        open={!!permRole}
        onClose={() => setPermRole(null)}
        onUpdated={() => void load()}
      />
      <ConfirmDialog
        open={!!deleteRoleState}
        onClose={() => setDeleteRoleState(null)}
        title="Delete role"
        message={
          deleteRoleState
            ? `Delete role “${deleteRoleState.name}”? Links to users and permissions are removed first.`
            : ''
        }
        confirmLabel="Delete"
        danger
        loading={deleteLoading}
        onConfirm={confirmDelete}
      />
    </Card>
  );
}
