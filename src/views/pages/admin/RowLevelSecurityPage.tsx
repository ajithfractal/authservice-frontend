import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/services/AuthContext';
import type { OrgUnit } from '@/types/orgUnits';
import { AppButton } from '@/shared/components/app/AppButton';
import { AppModal, ModalActions } from '@/shared/components/app/AppModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/lib/utils';
import { OrgUnitsD3Tree } from '@/views/pages/admin/OrgUnitsD3Tree';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';

/** Backgrounds for org unit circles / dots — cycles by depth so same level shares hue. */
const DEPTH_ACCENT_BG = [
  'bg-violet-600',
  'bg-blue-600',
  'bg-cyan-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600'
] as const;

function depthAccentClass(depth: number): string {
  const i = ((depth ?? 0) % DEPTH_ACCENT_BG.length) + DEPTH_ACCENT_BG.length;
  return DEPTH_ACCENT_BG[i % DEPTH_ACCENT_BG.length];
}

function orgInitials(name: string): string {
  const t = name.trim();
  if (!t) return '?';
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
}

function OrgUnitCircle({
  name,
  depth,
  size = 'md',
  selected
}: {
  name: string;
  depth: number;
  size?: 'sm' | 'md';
  selected?: boolean;
}) {
  const initials = orgInitials(name);
  const bg = depthAccentClass(depth);
  const sizeClass = size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs';
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-sm',
        sizeClass,
        bg,
        selected && 'ring-2 ring-primary-foreground ring-offset-2 ring-offset-primary'
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}

function byDepthDescending(a: OrgUnit, b: OrgUnit): number {
  return (b.depth ?? 0) - (a.depth ?? 0);
}

function byName(a: OrgUnit, b: OrgUnit): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

/** Matches `GET /api/org-units`: depth ascending, then name (case-insensitive). */
function byDepthThenName(a: OrgUnit, b: OrgUnit): number {
  const d = (a.depth ?? 0) - (b.depth ?? 0);
  if (d !== 0) return d;
  return byName(a, b);
}

/** Walk `parentId` until root; handles missing parents in the catalog as a local root. */
function treeRootIdFor(nodeId: string, byId: Map<string, OrgUnit>): string {
  let id = nodeId;
  const visited = new Set<string>();
  while (true) {
    if (visited.has(id)) return id;
    visited.add(id);
    const n = byId.get(id);
    if (!n || n.parentId == null) return id;
    if (!byId.has(n.parentId)) return id;
    id = n.parentId;
  }
}

function catalogGroupsByTree(catalog: OrgUnit[]): { root: OrgUnit; units: OrgUnit[] }[] {
  const byId = new Map(catalog.map((u) => [u.id, u]));
  const groups = new Map<string, OrgUnit[]>();
  for (const u of catalog) {
    const rootId = treeRootIdFor(u.id, byId);
    if (!groups.has(rootId)) groups.set(rootId, []);
    groups.get(rootId)!.push(u);
  }
  for (const list of groups.values()) list.sort(byDepthThenName);
  const rootIds = [...new Set(catalog.map((u) => treeRootIdFor(u.id, byId)))];
  const rootNodes = rootIds
    .map((rid) => byId.get(rid))
    .filter((n): n is OrgUnit => n != null)
    .sort(byName);
  return rootNodes.map((root) => ({
    root,
    units: groups.get(root.id) ?? []
  }));
}

function buildChildrenMap(nodes: OrgUnit[]): Map<string, OrgUnit[]> {
  const ids = new Set(nodes.map((n) => n.id));
  const map = new Map<string, OrgUnit[]>();
  for (const row of nodes) {
    if (!row.parentId || !ids.has(row.parentId)) continue;
    if (!map.has(row.parentId)) map.set(row.parentId, []);
    map.get(row.parentId)!.push(row);
  }
  for (const list of map.values()) list.sort(byName);
  return map;
}

function descendantIdsOf(rootId: string, childrenByParent: Map<string, OrgUnit[]>): Set<string> {
  const out = new Set<string>();
  const stack = [...(childrenByParent.get(rootId) ?? []).map((c) => c.id)];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    for (const c of childrenByParent.get(id) ?? []) stack.push(c.id);
  }
  return out;
}

function uniqueById(nodes: OrgUnit[]): OrgUnit[] {
  const seen = new Set<string>();
  const out: OrgUnit[] = [];
  for (const n of nodes) {
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    out.push(n);
  }
  return out;
}

type CreateModalMode = 'free' | 'child-of' | 'insert-above' | 'insert-on-link';

function CreateOrgUnitModal({
  open,
  onClose,
  canWrite,
  loading,
  error,
  mode,
  anchorNode,
  linkInsert,
  catalogNodes,
  treeNodes,
  onSubmit
}: {
  open: boolean;
  onClose: () => void;
  canWrite: boolean;
  loading: boolean;
  error: string | null;
  mode: CreateModalMode;
  anchorNode: OrgUnit | null;
  linkInsert: { parent: OrgUnit; child: OrgUnit } | null;
  catalogNodes: OrgUnit[];
  treeNodes: OrgUnit[];
  onSubmit: (name: string, parentId: string | null) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    setName('');
    if (mode === 'child-of' && anchorNode) {
      setParentId(anchorNode.id);
    } else if (mode === 'insert-above' && anchorNode) {
      setParentId(anchorNode.parentId ?? '');
    } else if (mode === 'insert-on-link' && linkInsert) {
      setParentId(linkInsert.parent.id);
    } else {
      setParentId('');
    }
  }, [open, mode, anchorNode, linkInsert]);

  const parentOptions = useMemo(() => {
    if (mode === 'free') {
      return uniqueById([...catalogNodes, ...treeNodes]).sort(byDepthThenName);
    }
    return uniqueById([...treeNodes, ...(anchorNode ? [anchorNode] : [])]).sort(byDepthThenName);
  }, [mode, catalogNodes, treeNodes, anchorNode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !canWrite) return;
    const pid = parentId.trim() === '' ? null : parentId.trim();
    await onSubmit(name.trim(), pid);
  };

  const title =
    mode === 'child-of'
      ? `Add child under “${anchorNode?.name ?? '…'}”`
      : mode === 'insert-above'
        ? `Insert level above “${anchorNode?.name ?? '…'}”`
        : mode === 'insert-on-link' && linkInsert
          ? `Insert between “${linkInsert.parent.name}” and “${linkInsert.child.name}”`
          : 'Create org unit';

  const hint =
    mode === 'insert-above' && anchorNode
      ? 'Creates a new unit between this node and its current parent, then moves this node under the new unit.'
      : mode === 'insert-on-link' && linkInsert
        ? `A new unit is created under “${linkInsert.parent.name}”, then “${linkInsert.child.name}” is moved under it.`
        : null;

  return (
    <AppModal open={open} onClose={onClose} title={title}>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="org-create-name">
            Name
          </label>
          <Input
            id="org-create-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. HR Department"
            required
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="org-create-parent">
            Parent
          </label>
          <Select
            value={parentId || '__root__'}
            onValueChange={(value) => setParentId(value === '__root__' ? '' : value)}
            disabled={mode === 'child-of' || mode === 'insert-above' || mode === 'insert-on-link'}
          >
            <SelectTrigger id="org-create-parent">
              <SelectValue placeholder="(root - no parent)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__root__">(root - no parent)</SelectItem>
              {parentOptions.map((n) => (
                <SelectItem key={n.id} value={n.id}>
                  {n.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {mode === 'child-of' || mode === 'insert-above' || mode === 'insert-on-link' ? (
            <p className="text-xs text-muted-foreground">Parent is fixed for this action.</p>
          ) : null}
        </div>
        <ModalActions>
          <AppButton type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </AppButton>
          <AppButton type="submit" disabled={loading || !canWrite}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create
          </AppButton>
        </ModalActions>
      </form>
    </AppModal>
  );
}

function MoveOrgUnitModal({
  open,
  onClose,
  node,
  catalogNodes,
  treeNodes,
  canWrite,
  loading,
  error,
  onSubmit
}: {
  open: boolean;
  onClose: () => void;
  node: OrgUnit | null;
  catalogNodes: OrgUnit[];
  treeNodes: OrgUnit[];
  canWrite: boolean;
  loading: boolean;
  error: string | null;
  onSubmit: (newParentId: string | null) => Promise<void>;
}) {
  const [newParentId, setNewParentId] = useState('');

  const allNodes = useMemo(() => uniqueById([...catalogNodes, ...treeNodes]), [catalogNodes, treeNodes]);

  const childrenByParent = useMemo(() => buildChildrenMap(allNodes), [allNodes]);

  const blockedIds = useMemo(() => {
    if (!node) return new Set<string>();
    const d = descendantIdsOf(node.id, childrenByParent);
    d.add(node.id);
    return d;
  }, [node, childrenByParent]);

  const parentOptions = useMemo(() => {
    return [...allNodes].filter((n) => !blockedIds.has(n.id)).sort(byDepthThenName);
  }, [allNodes, blockedIds]);

  useEffect(() => {
    if (open) setNewParentId('');
  }, [open, node?.id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!node || !canWrite) return;
    const pid = newParentId.trim() === '' ? null : newParentId.trim();
    await onSubmit(pid);
  };

  return (
    <AppModal open={open} onClose={onClose} title={node ? `Move “${node.name}”` : 'Move org unit'}>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="org-move-parent">
            New parent
          </label>
          <Select value={newParentId || '__root__'} onValueChange={(value) => setNewParentId(value === '__root__' ? '' : value)}>
            <SelectTrigger id="org-move-parent">
              <SelectValue placeholder="(root)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__root__">(root)</SelectItem>
              {parentOptions.map((n) => (
                <SelectItem key={n.id} value={n.id}>
                  {n.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ModalActions>
          <AppButton type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </AppButton>
          <AppButton type="submit" disabled={loading || !canWrite || !node}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Move
          </AppButton>
        </ModalActions>
      </form>
    </AppModal>
  );
}

function DeleteOrgUnitModal({
  open,
  onClose,
  node,
  canWrite,
  loading,
  error,
  onSubmit
}: {
  open: boolean;
  onClose: () => void;
  node: OrgUnit | null;
  canWrite: boolean;
  loading: boolean;
  error: string | null;
  onSubmit: (cascade: boolean) => Promise<void>;
}) {
  const [cascade, setCascade] = useState(false);

  useEffect(() => {
    if (open) setCascade(false);
  }, [open, node?.id]);

  return (
    <AppModal open={open} onClose={onClose} title={node ? `Delete “${node.name}”?` : 'Delete org unit'}>
      <div className="space-y-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <p className="text-sm text-muted-foreground">
          {cascade
            ? 'This removes the unit and its descendants from the hierarchy.'
            : 'This removes only this node (children must be moved or deleted first, depending on backend rules).'}
        </p>
        <div className="flex items-center gap-2">
          <Checkbox id="org-cascade-delete" checked={cascade} onCheckedChange={(checked) => setCascade(checked === true)} />
          <Label htmlFor="org-cascade-delete" className="font-normal">
            Cascade delete
          </Label>
        </div>
        <ModalActions>
          <AppButton type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </AppButton>
          <AppButton
            type="button"
            variant="destructive"
            disabled={loading || !canWrite || !node}
            onClick={() => void onSubmit(cascade)}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Delete
          </AppButton>
        </ModalActions>
      </div>
    </AppModal>
  );
}

function OrgUnitNodeMenuModal({
  open,
  onClose,
  unit,
  canWrite,
  onAddChild,
  onInsertAbove,
  onMove,
  onDelete
}: {
  open: boolean;
  onClose: () => void;
  unit: OrgUnit | null;
  canWrite: boolean;
  onAddChild: (n: OrgUnit) => void;
  onInsertAbove: (n: OrgUnit) => void;
  onMove: (n: OrgUnit) => void;
  onDelete: (n: OrgUnit) => void;
}) {
  return (
    <AppModal open={open} onClose={onClose} title={unit ? unit.name : 'Org unit'}>
      {unit ? (
        <p className="text-sm text-muted-foreground">
          {canWrite
            ? 'Add a child, insert a level above, reparent, or remove this unit.'
            : 'You can view this unit. Changes require org-units:write.'}
        </p>
      ) : null}
      <div className="mt-4 flex flex-col gap-2">
        {canWrite && unit ? (
          <>
            <AppButton type="button" onClick={() => onAddChild(unit)}>
              Add child
            </AppButton>
            <AppButton type="button" onClick={() => onInsertAbove(unit)}>
              Insert level above
            </AppButton>
            <AppButton type="button" onClick={() => onMove(unit)}>
              Reparent (move)
            </AppButton>
            <AppButton type="button" onClick={() => onDelete(unit)}>
              Remove
            </AppButton>
          </>
        ) : null}
      </div>
      <ModalActions>
        <AppButton type="button" variant="outline" onClick={onClose}>
          Close
        </AppButton>
      </ModalActions>
    </AppModal>
  );
}

export function RowLevelSecurityPage() {
  const {
    can,
    listOrgUnits,
    createOrgUnit,
    listOrgUnitChildren,
    listOrgUnitAncestors,
    moveOrgUnit,
    deleteOrgUnit,
    getRlsConfig,
    patchRlsConfig
  } = useAuth();

  const canWrite = can([], ['org-units:write']);

  const [catalog, setCatalog] = useState<OrgUnit[]>([]);
  const [catalogFromApi, setCatalogFromApi] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [bootstrapId, setBootstrapId] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [treeRows, setTreeRows] = useState<OrgUnit[]>([]);
  const [ancestorRows, setAncestorRows] = useState<OrgUnit[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [modalError, setModalError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<CreateModalMode>('free');
  const [createAnchor, setCreateAnchor] = useState<OrgUnit | null>(null);
  const [linkInsertPair, setLinkInsertPair] = useState<{ parent: OrgUnit; child: OrgUnit } | null>(null);
  const [nodeMenuUnit, setNodeMenuUnit] = useState<OrgUnit | null>(null);

  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<OrgUnit | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OrgUnit | null>(null);

  const [rlsEnabled, setRlsEnabled] = useState(false);
  const [rlsLoading, setRlsLoading] = useState(true);
  const [rlsSaving, setRlsSaving] = useState(false);
  const [rlsError, setRlsError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const rows = await listOrgUnits();
      setCatalogFromApi(true);
      setCatalog([...rows].sort(byDepthThenName));
    } catch (e) {
      setCatalogFromApi(false);
      setCatalogError(e instanceof Error ? e.message : 'Could not load org unit list');
      setCatalog([]);
    } finally {
      setCatalogLoading(false);
    }
  }, [listOrgUnits]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    let alive = true;
    setRlsLoading(true);
    setRlsError(null);
    void getRlsConfig()
      .then((cfg) => {
        if (!alive) return;
        setRlsEnabled(Boolean(cfg.hierarchyFilteringEnabled));
      })
      .catch((e) => {
        if (!alive) return;
        setRlsError(e instanceof Error ? e.message : 'Could not load RLS config');
      })
      .finally(() => {
        if (alive) setRlsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [getRlsConfig]);

  const loadTreeFor = useCallback(
    async (orgUnitId: string) => {
      setTreeLoading(true);
      setError(null);
      try {
        const [children, ancestors] = await Promise.all([
          listOrgUnitChildren(orgUnitId),
          listOrgUnitAncestors(orgUnitId)
        ]);
        setTreeRows(children);
        setAncestorRows(ancestors);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load hierarchy');
        setTreeRows([]);
        setAncestorRows([]);
      } finally {
        setTreeLoading(false);
      }
    },
    [listOrgUnitChildren, listOrgUnitAncestors]
  );

  const applyBootstrapFromChildren = useCallback((rows: OrgUnit[]) => {
    const unique = uniqueById(rows);
    setCatalogFromApi(false);
    setCatalog([...unique].sort(byDepthThenName));
    setCatalogError(null);
  }, []);

  const onBootstrapSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const id = bootstrapId.trim();
    if (!id) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const rows = await listOrgUnitChildren(id);
      applyBootstrapFromChildren(rows);
      setSelectedId(id);
      setTreeRows(rows);
      const ancestors = await listOrgUnitAncestors(id);
      setAncestorRows(ancestors);
      setSuccess('Loaded hierarchy from that org unit. You can pick any row in the list to explore.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setBusy(false);
    }
  };

  const onSelectCatalog = (id: string) => {
    setSelectedId(id);
    void loadTreeFor(id);
  };

  const saveRlsConfig = async () => {
    if (!canWrite) return;
    setRlsSaving(true);
    setRlsError(null);
    try {
      const next = await patchRlsConfig({ hierarchyFilteringEnabled: rlsEnabled });
      setRlsEnabled(Boolean(next.hierarchyFilteringEnabled));
      setSuccess(`Hierarchy filtering ${next.hierarchyFilteringEnabled ? 'enabled' : 'disabled'}.`);
    } catch (e) {
      setRlsError(e instanceof Error ? e.message : 'Could not update RLS config');
    } finally {
      setRlsSaving(false);
    }
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    setCreateAnchor(null);
    setLinkInsertPair(null);
    setCreateMode('free');
    setModalError(null);
  };

  const openCreateFree = () => {
    setCreateMode('free');
    setCreateAnchor(null);
    setLinkInsertPair(null);
    setModalError(null);
    setCreateOpen(true);
  };

  const openCreateChild = (n: OrgUnit) => {
    setCreateMode('child-of');
    setCreateAnchor(n);
    setLinkInsertPair(null);
    setModalError(null);
    setCreateOpen(true);
  };

  const openInsertAbove = (n: OrgUnit) => {
    setCreateMode('insert-above');
    setCreateAnchor(n);
    setLinkInsertPair(null);
    setModalError(null);
    setCreateOpen(true);
  };

  const handleCreateSubmit = async (name: string, parentId: string | null) => {
    if (!canWrite) return;
    setModalError(null);
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await createOrgUnit({ name, parentId });
      if (createMode === 'insert-on-link' && linkInsertPair) {
        await moveOrgUnit(linkInsertPair.child.id, { newParentId: created.id });
        setSuccess(
          `Inserted “${created.name}” between “${linkInsertPair.parent.name}” and “${linkInsertPair.child.name}”.`
        );
      } else if (createMode === 'insert-above' && createAnchor) {
        await moveOrgUnit(createAnchor.id, { newParentId: created.id });
        setSuccess(`Inserted “${created.name}” and moved “${createAnchor.name}” under it.`);
      } else {
        setSuccess(`Created org unit “${created.name}”.`);
      }
      closeCreateModal();
      await loadCatalog();
      if (selectedId) await loadTreeFor(selectedId);
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  };

  const closeMoveModal = () => {
    setMoveOpen(false);
    setMoveTarget(null);
    setModalError(null);
  };

  const handleMoveSubmit = async (newParentId: string | null) => {
    if (!moveTarget || !canWrite) return;
    setModalError(null);
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const moved = await moveOrgUnit(moveTarget.id, { newParentId });
      setSuccess(`Moved “${moved.name}”.`);
      closeMoveModal();
      await loadCatalog();
      if (selectedId) await loadTreeFor(selectedId);
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Move failed');
    } finally {
      setBusy(false);
    }
  };

  const closeDeleteModal = () => {
    setDeleteOpen(false);
    setDeleteTarget(null);
    setModalError(null);
  };

  const handleDeleteSubmit = async (cascade: boolean) => {
    if (!deleteTarget || !canWrite) return;
    setModalError(null);
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteOrgUnit(deleteTarget.id, cascade);
      setSuccess(`Deleted org unit (${cascade ? 'cascade' : 'single'}).`);
      closeDeleteModal();
      await loadCatalog();
      if (selectedId === deleteTarget.id) {
        setSelectedId(null);
        setTreeRows([]);
        setAncestorRows([]);
      } else if (selectedId) {
        await loadTreeFor(selectedId);
      }
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const chain = useMemo(() => [...ancestorRows].sort(byDepthDescending), [ancestorRows]);

  const catalogTreeGroups = useMemo(() => {
    if (!catalogFromApi || catalog.length === 0) return null;
    return catalogGroupsByTree(catalog);
  }, [catalog, catalogFromApi]);

  const showBootstrap =
    !catalogLoading && (!catalogFromApi || catalog.length === 0) && (catalogError != null || catalog.length === 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Row Level Security</CardTitle>
            <CardDescription>
              Org units come from the full list API (depth is per tree; multiple roots mean separate hierarchies). Pick a
              unit to load its subtree and edit it.
            </CardDescription>
          </div>
          <AppButton
            type="button"
            variant="outline"
            size="sm"
            disabled={catalogLoading || busy}
            onClick={() => void loadCatalog()}
          >
            {catalogLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh list
          </AppButton>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>
        )}
        {success && (
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm text-emerald-700">{success}</div>
        )}
        {rlsError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{rlsError}</div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/10 p-4">
          <div>
            <p className="text-sm font-medium">Hierarchy filtering</p>
            <p className="text-xs text-muted-foreground">
              Toggle global row-level hierarchy filtering (`GET/PATCH /rls/config`).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="hierarchy-filter-toggle"
                checked={rlsEnabled}
                disabled={rlsLoading || rlsSaving || !canWrite}
                onCheckedChange={(checked) => setRlsEnabled(checked === true)}
              />
              <Label htmlFor="hierarchy-filter-toggle" className="font-normal">
                <Badge variant={rlsEnabled ? 'success' : 'destructive'}>
                  {rlsEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </Label>
            </div>
            <AppButton type="button" size="sm" disabled={rlsLoading || rlsSaving || !canWrite} onClick={() => void saveRlsConfig()}>
              {rlsLoading || rlsSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </AppButton>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,260px)_1fr]">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Org units</h3>
              {canWrite ? (
                <AppButton type="button" size="sm" disabled={busy} onClick={openCreateFree}>
                  New unit
                </AppButton>
              ) : null}
            </div>

            {catalogLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : catalogError && catalogFromApi ? (
              <p className="text-sm text-destructive">{catalogError}</p>
            ) : null}

            {showBootstrap ? (
              <form onSubmit={(e) => void onBootstrapSubmit(e)} className="space-y-2 rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">
                  If your API does not expose a full list, enter any org unit ID you know to load its subtree and build a
                  local list.
                </p>
                <Input
                  placeholder="Org unit ID"
                  value={bootstrapId}
                  onChange={(e) => setBootstrapId(e.target.value)}
                  className="font-mono text-xs"
                />
                <AppButton type="submit" size="sm" disabled={busy || !bootstrapId.trim()}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Load from ID
                </AppButton>
              </form>
            ) : null}

            <div className="max-h-[min(420px,50vh)] space-y-3 overflow-y-auto rounded-lg border p-2">
              {catalog.length === 0 && !catalogLoading && !showBootstrap ? (
                <p className="px-2 py-4 text-center text-sm text-muted-foreground">No org units returned.</p>
              ) : catalogTreeGroups && catalogTreeGroups.length > 1 ? (
                catalogTreeGroups.map(({ root, units }) => (
                  <div key={root.id}>
                    <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Tree · {root.name}
                    </p>
                    <ul className="space-y-1">
                      {units.map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            title={u.name}
                            onClick={() => onSelectCatalog(u.id)}
                            style={{ paddingLeft: `${8 + (u.depth ?? 0) * 10}px` }}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-md py-2 pr-3 text-left text-sm transition-colors',
                              selectedId === u.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                            )}
                          >
                            <OrgUnitCircle
                              name={u.name}
                              depth={u.depth ?? 0}
                              size="sm"
                              selected={selectedId === u.id}
                            />
                            <span className="min-w-0 flex-1 truncate font-medium">{u.name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <ul className="space-y-1">
                  {catalog.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        title={u.name}
                        onClick={() => onSelectCatalog(u.id)}
                        style={{ paddingLeft: `${8 + (u.depth ?? 0) * 10}px` }}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md py-2 pr-3 text-left text-sm transition-colors',
                          selectedId === u.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                        )}
                      >
                        <OrgUnitCircle
                          name={u.name}
                          depth={u.depth ?? 0}
                          size="sm"
                          selected={selectedId === u.id}
                        />
                        <span className="min-w-0 flex-1 truncate font-medium">{u.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            {selectedId ? (
              <>
                {treeLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading hierarchy…
                  </div>
                ) : null}

                {chain.length > 0 ? (
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <h4 className="mb-2 text-sm font-semibold">Path to selected</h4>
                    <div className="flex flex-wrap items-center gap-2">
                      {chain.map((node, i) => (
                        <div key={node.id} className="flex items-center gap-2">
                          <button
                            type="button"
                            title={node.name}
                            onClick={() => onSelectCatalog(node.id)}
                            className="flex max-w-[11rem] items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-left hover:bg-muted"
                          >
                            <OrgUnitCircle name={node.name} depth={node.depth ?? 0} size="sm" />
                            <span className="min-w-0 flex-1 truncate text-xs font-medium">{node.name}</span>
                          </button>
                          {i < chain.length - 1 ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {treeRows.length > 0 ? (
                  <OrgUnitsD3Tree
                    rows={treeRows}
                    canWrite={canWrite}
                    onNodeOrgUnitClick={(u) => setNodeMenuUnit(u)}
                    onLinkInsertClick={(parentUnit, childUnit) => {
                      setCreateMode('insert-on-link');
                      setLinkInsertPair({ parent: parentUnit, child: childUnit });
                      setCreateAnchor(null);
                      setModalError(null);
                      setCreateOpen(true);
                    }}
                  />
                ) : (
                  <OrgUnitsD3Tree
                    rows={treeRows}
                    canWrite={canWrite}
                    onNodeOrgUnitClick={(u) => setNodeMenuUnit(u)}
                    onLinkInsertClick={(parentUnit, childUnit) => {
                      setCreateMode('insert-on-link');
                      setLinkInsertPair({ parent: parentUnit, child: childUnit });
                      setCreateAnchor(null);
                      setModalError(null);
                      setCreateOpen(true);
                    }}
                  />
                )}
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Select an org unit on the left to view its hierarchy.
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <CreateOrgUnitModal
        open={createOpen}
        onClose={closeCreateModal}
        canWrite={canWrite}
        loading={busy}
        error={modalError}
        mode={createMode}
        anchorNode={createAnchor}
        linkInsert={linkInsertPair}
        catalogNodes={catalog}
        treeNodes={treeRows}
        onSubmit={handleCreateSubmit}
      />

      <OrgUnitNodeMenuModal
        open={nodeMenuUnit != null}
        onClose={() => setNodeMenuUnit(null)}
        unit={nodeMenuUnit}
        canWrite={canWrite}
        onAddChild={(u) => {
          setNodeMenuUnit(null);
          openCreateChild(u);
        }}
        onInsertAbove={(u) => {
          setNodeMenuUnit(null);
          openInsertAbove(u);
        }}
        onMove={(u) => {
          setNodeMenuUnit(null);
          setMoveTarget(u);
          setModalError(null);
          setMoveOpen(true);
        }}
        onDelete={(u) => {
          setNodeMenuUnit(null);
          setDeleteTarget(u);
          setModalError(null);
          setDeleteOpen(true);
        }}
      />

      <MoveOrgUnitModal
        open={moveOpen}
        onClose={closeMoveModal}
        node={moveTarget}
        catalogNodes={catalog}
        treeNodes={treeRows}
        canWrite={canWrite}
        loading={busy}
        error={modalError}
        onSubmit={handleMoveSubmit}
      />

      <DeleteOrgUnitModal
        open={deleteOpen}
        onClose={closeDeleteModal}
        node={deleteTarget}
        canWrite={canWrite}
        loading={busy}
        error={modalError}
        onSubmit={handleDeleteSubmit}
      />
    </Card>
  );
}
