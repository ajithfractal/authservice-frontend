import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/services/AuthContext';
import type { RbacRole, RbacUserDetail } from '@/types/rbac';
import type { OrgUnit } from '@/types/orgUnits';
import { AppButton } from '@/shared/components/app/AppButton';
import { AppModal, ModalActions } from '@/shared/components/app/AppModal';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';

const CATALOG_SIZE = 200;

interface UserManageModalProps {
  userId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  mode?: 'roles' | 'org';
}

export function UserManageModal({ userId, open, onClose, onUpdated, mode = 'roles' }: UserManageModalProps) {
  const {
    getRbacUser,
    bulkAssignUsersOrgUnit,
    bulkAssignUserRoles,
    listRolesPaged,
    listOrgUnits
  } = useAuth();

  const [detail, setDetail] = useState<RbacUserDetail | null>(null);
  const [catalogRoles, setCatalogRoles] = useState<RbacRole[]>([]);
  const [catalogOrgUnits, setCatalogOrgUnits] = useState<OrgUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleToAdd, setRoleToAdd] = useState('');
  const [selectedOrgUnitId, setSelectedOrgUnitId] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [u, rolesPage, orgUnits] = await Promise.all([
        getRbacUser(userId),
        listRolesPaged({ page: 0, size: CATALOG_SIZE }),
        listOrgUnits()
      ]);
      setDetail(u);
      setCatalogRoles(rolesPage.items);
      setCatalogOrgUnits(
        [...orgUnits].sort((a, b) => {
          const d = (a.depth ?? 0) - (b.depth ?? 0);
          if (d !== 0) return d;
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        })
      );
      setSelectedOrgUnitId(u.orgUnitId ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load user');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [userId, getRbacUser, listRolesPaged, listOrgUnits]);

  useEffect(() => {
    if (open && userId) void load();
  }, [open, userId, load]);

  const assignedIds = new Set(detail?.roles.map((r) => r.id) ?? []);
  const availableOptions = catalogRoles.filter((r) => r.active !== false && !assignedIds.has(r.id));

  const addRole = async () => {
    if (!userId || !roleToAdd || !detail) return;
    setSaving(true);
    setError(null);
    try {
      const nextRoleIds = Array.from(new Set([...(detail.roles ?? []).map((r) => r.id), roleToAdd]));
      await bulkAssignUserRoles({
        userIds: [userId],
        roleIds: nextRoleIds
      });
      const next = await getRbacUser(userId);
      setDetail(next);
      setRoleToAdd('');
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not assign role');
    } finally {
      setSaving(false);
    }
  };

  const saveOrgUnit = async () => {
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      await bulkAssignUsersOrgUnit({
        userIds: [userId],
        orgUnitId: selectedOrgUnitId
      });
      const next = await getRbacUser(userId);
      setDetail(next);
      setSelectedOrgUnitId(next.orgUnitId ?? '');
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update org unit');
    } finally {
      setSaving(false);
    }
  };

  const removeRole = async (roleId: string) => {
    if (!userId || !detail) return;
    setSaving(true);
    setError(null);
    try {
      const nextRoleIds = (detail.roles ?? []).map((r) => r.id).filter((id) => id !== roleId);
      await bulkAssignUserRoles({
        userIds: [userId],
        roleIds: nextRoleIds
      });
      const next = await getRbacUser(userId);
      setDetail(next);
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={mode === 'org' ? 'Manage org unit' : 'Manage roles'}
      className="max-w-xl"
    >
      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : detail ? (
        <div className="space-y-6">
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div>
            <p className="text-sm font-medium">{detail.email}</p>
            <p className="text-xs text-muted-foreground">
              {detail.firstName} {detail.lastName}
            </p>
          </div>

          {mode === 'org' ? (
            <div className="space-y-2 rounded-md">
              <h3 className="text-sm font-medium">Org unit assignment</h3>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={selectedOrgUnitId || '__none__'} onValueChange={(value) => setSelectedOrgUnitId(value === '__none__' ? '' : value)} disabled={saving}>
                  <SelectTrigger className="min-w-[240px]">
                    <SelectValue placeholder="Select an org unit..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select an org unit...</SelectItem>
                    {catalogOrgUnits.map((ou) => (
                      <SelectItem key={ou.id} value={ou.id}>
                        {`${'  '.repeat(ou.depth ?? 0)}${ou.name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <AppButton
                  type="button"
                  size="sm"
                  disabled={saving || !selectedOrgUnitId}
                  onClick={() => void saveOrgUnit()}
                >
                  Save org unit
                </AppButton>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h3 className="mb-2 text-sm font-medium">Assigned roles</h3>
                <div className="flex flex-wrap gap-2">
                  {detail.roles.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No roles</span>
                  ) : (
                    detail.roles.map((r) => (
                      <Badge key={r.id} variant="secondary" className="gap-1 pr-1 font-normal">
                        {r.name}
                        <button
                          type="button"
                          className="ml-1 rounded px-1 hover:bg-background/80"
                          disabled={saving}
                          onClick={() => void removeRole(r.id)}
                          aria-label={`Remove ${r.name}`}
                        >
                          ×
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium">Add role</h3>
                <div className="flex flex-wrap gap-2">
                  <Select value={roleToAdd || '__none__'} onValueChange={(value) => setRoleToAdd(value === '__none__' ? '' : value)}>
                    <SelectTrigger className="min-w-[200px]">
                      <SelectValue placeholder="Select a role..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Select a role...</SelectItem>
                      {availableOptions.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <AppButton type="button" size="sm" disabled={!roleToAdd || saving} onClick={() => void addRole()}>
                    Add
                  </AppButton>
                </div>
              </div>
            </>
          )}
          <div>
          </div>

          <ModalActions>
            <AppButton type="button" variant="outline" onClick={onClose}>
              Close
            </AppButton>
          </ModalActions>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No user loaded.</p>
      )}
    </AppModal>
  );
}
