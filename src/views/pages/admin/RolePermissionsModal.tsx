import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/services/AuthContext';
import type { RbacPermissionRef, RbacPermissionRow, RbacRole, RbacRoleDropdownItem } from '@/types/rbac';
import { AppButton } from '@/shared/components/app/AppButton';
import { AppModal, ModalActions } from '@/shared/components/app/AppModal';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';

const CATALOG_SIZE = 500;

interface RolePermissionsModalProps {
  roleId: string | null;
  roleName: string;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function RolePermissionsModal({ roleId, roleName, open, onClose, onUpdated }: RolePermissionsModalProps) {
  const { getRole, listPermissionsPaged, listRolesDropdown, addRolePermissions, removeRolePermission, copyRolePermissions } = useAuth();
  const [role, setRole] = useState<RbacRole | null>(null);
  const [catalog, setCatalog] = useState<RbacPermissionRow[]>([]);
  const [rolesCatalog, setRolesCatalog] = useState<RbacRoleDropdownItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [copySourceRoleId, setCopySourceRoleId] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(true);

  const load = useCallback(async () => {
    if (!roleId) return;
    setLoading(true);
    setError(null);
    setPicked(new Set());
    setCopySourceRoleId('');
    setReplaceExisting(true);
    try {
      const [r, permPage, roleOptions] = await Promise.all([
        getRole(roleId),
        listPermissionsPaged({ page: 0, size: CATALOG_SIZE }),
        listRolesDropdown()
      ]);
      setRole(r);
      setCatalog(permPage.items);
      setRolesCatalog(roleOptions.filter((item) => item.id !== roleId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setRole(null);
      setRolesCatalog([]);
    } finally {
      setLoading(false);
    }
  }, [roleId, getRole, listPermissionsPaged, listRolesDropdown]);

  useEffect(() => {
    if (open && roleId) void load();
  }, [open, roleId, load]);

  const assignedIds = new Set((role?.permissions ?? []).map((p: RbacPermissionRef) => p.id));
  const available = catalog.filter((p) => !assignedIds.has(p.id));

  const togglePick = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addSelected = async () => {
    if (!roleId || picked.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await addRolePermissions(roleId, [...picked]);
      setRole(updated);
      setPicked(new Set());
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add permissions');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (permissionId: string) => {
    if (!roleId) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await removeRolePermission(roleId, permissionId);
      setRole(updated);
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove');
    } finally {
      setSaving(false);
    }
  };

  const copyFromRole = async () => {
    if (!roleId || !copySourceRoleId) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await copyRolePermissions({
        sourceRoleId: copySourceRoleId,
        targetRoleId: roleId,
        replaceExisting
      });
      setRole(updated);
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not copy permissions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={`Permissions — ${roleName}`}
      className="max-w-2xl"
    >
      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div>
            <h3 className="mb-2 text-sm font-medium">On this role</h3>
            <div className="flex flex-wrap gap-2">
              {(role?.permissions ?? []).length === 0 ? (
                <span className="text-sm text-muted-foreground">None yet</span>
              ) : (
                role!.permissions.map((p) => (
                  <Badge key={p.id} variant="secondary" className="gap-1 pr-1 font-normal">
                    {p.name}
                    <button
                      type="button"
                      className="ml-1 rounded px-1 hover:bg-background/80"
                      disabled={saving}
                      onClick={() => void remove(p.id)}
                      aria-label={`Remove ${p.name}`}
                    >
                      ×
                    </button>
                </Badge>
                ))
              )}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">Copy permissions from another role</h3>
            <div className="space-y-3 rounded-md border p-3">
              <Select value={copySourceRoleId || '__none__'} onValueChange={(value) => setCopySourceRoleId(value === '__none__' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select source role</SelectItem>
                  {rolesCatalog.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="copy-role-replace-existing"
                  checked={replaceExisting}
                  onCheckedChange={(checked) => setReplaceExisting(checked === true)}
                />
                <Label htmlFor="copy-role-replace-existing">Replace existing permissions on this role</Label>
              </div>
              <AppButton
                type="button"
                size="sm"
                disabled={!copySourceRoleId || saving}
                onClick={() => void copyFromRole()}
              >
                Copy permissions
              </AppButton>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">Add from catalog</h3>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
              {available.length === 0 ? (
                <p className="text-sm text-muted-foreground">All catalog permissions are assigned (or catalog empty).</p>
              ) : (
                available.map((p) => (
                  <div key={p.id} className="flex items-start gap-2 text-sm">
                    <Checkbox
                      id={`perm-pick-${p.id}`}
                      checked={picked.has(p.id)}
                      onCheckedChange={() => togglePick(p.id)}
                      className="mt-0.5"
                    />
                    <Label htmlFor={`perm-pick-${p.id}`} className="cursor-pointer">
                      <span className="font-mono text-xs">{p.name}</span>
                      <span className="block text-muted-foreground">{p.description}</span>
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>

          <ModalActions className="justify-between">
            <AppButton
              type="button"
              size="sm"
              disabled={picked.size === 0 || saving}
              onClick={() => void addSelected()}
            >
              Add selected
            </AppButton>
            <AppButton type="button" variant="outline" onClick={onClose}>
              Close
            </AppButton>
          </ModalActions>
        </div>
      )}
    </AppModal>
  );
}
