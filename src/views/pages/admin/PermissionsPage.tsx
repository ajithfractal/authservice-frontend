import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, MoreHorizontal, Plus } from 'lucide-react';
import { useAuth } from '@/services/AuthContext';
import type { RbacPermissionRow } from '@/types/rbac';
import { AppButton } from '@/shared/components/app/AppButton';
import { AdminPermissionCreateButton } from '@/shared/components/app/AdminButtons';
import { AppModal, ConfirmDialog, ModalActions } from '@/shared/components/app/AppModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DATA_TABLE_HEAD_STICKY_CLASS, DATA_TABLE_SCROLL_CLASS } from '@/shared/components/app/dataTableScroll';
import { TableSortHeader } from '@/shared/components/app/TableSortHeader';
import { ViewMoreText } from '@/shared/components/app/ViewMoreText';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

const PAGE_SIZE = 20;

export function PermissionsPage() {
  const { can, listPermissionsPaged, createPermission, patchPermission, deletePermission } = useAuth();
  const [items, setItems] = useState<RbacPermissionRow[]>([]);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sortBy, setSortBy] = useState<'name' | 'description'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editRow, setEditRow] = useState<RbacPermissionRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteRow, setDeleteRow] = useState<RbacPermissionRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listPermissionsPaged({ page, size: PAGE_SIZE, sort: `${sortBy},${sortDir}` });
      setItems(res.items);
      setPageCount(res.pageCount);
      setPageSize(res.limit);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load permissions');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [listPermissionsPaged, page, sortBy, sortDir]);

  const changeSort = (field: 'name' | 'description') => {
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
    if (editRow) {
      setEditName(editRow.name);
      setEditDescription(editRow.description ?? '');
      setEditError(null);
    }
  }, [editRow]);

  const canPrev = page > 0;
  const canNext = page < pageCount - 1;
  const canWritePermissions = can([], ['permissions:write']);

  const onCreateOpen = () => {
    setCreateOpen(true);
    setName('');
    setDescription('');
    setCreateError(null);
  };

  const submitCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setCreateError(null);
    try {
      await createPermission({ name: name.trim(), description: description.trim() });
      setCreateOpen(false);
      void load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editRow) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await patchPermission(editRow.id, {
        name: editName.trim(),
        description: editDescription.trim()
      });
      setEditRow(null);
      void load();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setEditSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    setDeleteLoading(true);
    try {
      await deletePermission(deleteRow.id);
      setDeleteRow(null);
      void load();
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Permissions</CardTitle>
          <CardDescription>
            Catalog of permission codes.
          </CardDescription>
        </div>
        <AdminPermissionCreateButton
          type="button"
          size="sm"
          onClick={onCreateOpen}
          icon={<Plus className="mr-2 h-4 w-4" />}
          label="Create permission"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading permissions…
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
                  <TableHead className="w-[1%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No permissions on this page.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-sm font-medium">{p.name}</TableCell>
                      <TableCell className="max-w-xl min-w-[8rem]">
                        <ViewMoreText text={p.description ?? ''} modalTitle="Description" />
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
                            {canWritePermissions ? (
                              <>
                                <DropdownMenuItem onClick={() => setEditRow(p)}>Edit permission</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={() => setDeleteRow(p)}>
                                  Delete permission
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

      <AppModal open={createOpen} onClose={() => setCreateOpen(false)} title="Create permission">
        <form onSubmit={(e) => void submitCreate(e)} className="space-y-4">
          {createError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {createError}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="perm-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="perm-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. reports:read"
              required
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="perm-desc" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="perm-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
            />
          </div>
          <ModalActions>
            <AppButton type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </AppButton>
            <AppButton type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create'}
            </AppButton>
          </ModalActions>
        </form>
      </AppModal>

      <AppModal open={!!editRow} onClose={() => setEditRow(null)} title="Edit permission">
        <form onSubmit={(e) => void submitEdit(e)} className="space-y-4">
          {editError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {editError}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="perm-edit-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="perm-edit-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="e.g. reports:read"
              required
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="perm-edit-desc" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="perm-edit-desc"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              required
            />
          </div>
          <ModalActions>
            <AppButton type="button" variant="outline" onClick={() => setEditRow(null)}>
              Cancel
            </AppButton>
            <AppButton type="submit" disabled={editSaving}>
              {editSaving ? 'Saving…' : 'Save'}
            </AppButton>
          </ModalActions>
        </form>
      </AppModal>

      <ConfirmDialog
        open={!!deleteRow}
        onClose={() => setDeleteRow(null)}
        title="Delete permission"
        message={
          deleteRow
            ? `Delete “${deleteRow.name}”? Role links are removed first. This cannot be undone from the UI.`
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
