import { type ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { HierarchyPointNode } from 'd3-hierarchy';
import Tree, { type RawNodeDatum, type TreeNodeDatum } from 'react-d3-tree';
import type { OrgUnit } from '@/types/orgUnits';
import { cn } from '@/lib/utils';

/** Bundled from `react-d3-tree` globalCss (not exported on package types path). */
const RD3T_BASE_CSS = `
.rd3t-tree-container { width: 100%; height: 100%; }
.rd3t-grabbable { cursor: grab; }
.rd3t-grabbable:active { cursor: grabbing; }
.rd3t-node { cursor: pointer; fill: #777; stroke: #000; stroke-width: 2; }
.rd3t-leaf-node { cursor: pointer; fill: transparent; stroke: #000; stroke-width: 1; }
.rd3t-label__title { fill: #000; stroke: none; font-weight: bolder; }
.rd3t-label__attributes { fill: #777; stroke: none; font-weight: bolder; font-size: smaller; }
.rd3t-link { fill: none; stroke: #000; }
`;

const DEPTH_FILL = ['#7c3aed', '#2563eb', '#0891b2', '#059669', '#d97706', '#e11d48'] as const;

function depthFill(depth: number): string {
  const i = ((depth ?? 0) % DEPTH_FILL.length) + DEPTH_FILL.length;
  return DEPTH_FILL[i % DEPTH_FILL.length];
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

function byDepthAscending(a: OrgUnit, b: OrgUnit): number {
  return (a.depth ?? 0) - (b.depth ?? 0);
}

function byName(a: OrgUnit, b: OrgUnit): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

function byDepthThenName(a: OrgUnit, b: OrgUnit): number {
  const d = (a.depth ?? 0) - (b.depth ?? 0);
  if (d !== 0) return d;
  return byName(a, b);
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

function toRawNode(u: OrgUnit, childrenByParent: Map<string, OrgUnit[]>): RawNodeDatum {
  const kids = (childrenByParent.get(u.id) ?? []).map((c) => toRawNode(c, childrenByParent));
  const base: RawNodeDatum = {
    name: u.name,
    attributes: {
      orgUnitId: u.id,
      depth: u.depth ?? 0
    }
  };
  if (kids.length > 0) base.children = kids;
  return base;
}

function rowsToD3Data(rows: OrgUnit[]): RawNodeDatum {
  if (rows.length === 0) {
    return { name: 'No data', attributes: {} };
  }
  const sorted = [...rows].sort(byDepthAscending);
  const ids = new Set(sorted.map((r) => r.id));
  const childrenByParent = buildChildrenMap(sorted);
  const roots = sorted.filter((r) => !r.parentId || !ids.has(r.parentId)).sort(byDepthThenName);
  if (roots.length === 0) {
    return { name: 'No data', attributes: {} };
  }
  if (roots.length === 1) {
    return toRawNode(roots[0], childrenByParent);
  }
  return {
    name: 'Subtree',
    attributes: { syntheticRoot: true },
    children: roots.map((r) => toRawNode(r, childrenByParent))
  };
}

function orgUnitFromNode(
  node: HierarchyPointNode<TreeNodeDatum>,
  byId: Map<string, OrgUnit>
): OrgUnit | null {
  const id = node.data.attributes?.orgUnitId;
  if (typeof id !== 'string') return null;
  return byId.get(id) ?? null;
}

export type OrgUnitsD3TreeProps = {
  rows: OrgUnit[];
  canWrite: boolean;
  /** Single click on a real org unit (not the synthetic multi-root wrapper). */
  onNodeOrgUnitClick: (unit: OrgUnit) => void;
  /** Click on link parent → child: insert a new node between them. */
  onLinkInsertClick: (parentUnit: OrgUnit, childUnit: OrgUnit) => void;
  className?: string;
  /** Shown on the right of the title row (e.g. full screen toggle). */
  headerActions?: ReactNode;
  /** Stretch inside a flex parent with a defined height (full-screen panel). */
  fillContainer?: boolean;
  /** Omit title + help text (parent supplies chrome). */
  hideChrome?: boolean;
};

export function OrgUnitsD3Tree({
  rows,
  canWrite,
  onNodeOrgUnitClick,
  onLinkInsertClick,
  className,
  headerActions,
  fillContainer,
  hideChrome
}: OrgUnitsD3TreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 640, h: 420 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({
        w: Math.max(320, el.clientWidth),
        h: Math.max(fillContainer ? 200 : 280, el.clientHeight)
      });
    });
    ro.observe(el);
    setSize({
      w: Math.max(320, el.clientWidth),
      h: Math.max(fillContainer ? 200 : 280, el.clientHeight)
    });
    return () => ro.disconnect();
  }, [fillContainer]);

  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const d3Data = useMemo(() => rowsToD3Data(rows), [rows]);

  /**
   * Must change when hierarchy changes, not only when IDs change — otherwise rd3t skips rebuilding
   * (see TreeProps.dataKey: same key = "same tree" even if `data` shape changed).
   */
  const dataKey = useMemo(
    () =>
      [...rows]
        .map((r) => `${r.id}:${r.parentId ?? ''}:${r.depth ?? ''}:${r.name}`)
        .sort()
        .join('|'),
    [rows]
  );

  const handleNodeClick = (node: HierarchyPointNode<TreeNodeDatum>) => {
    if (node.data.attributes?.syntheticRoot === true) return;
    const u = orgUnitFromNode(node, byId);
    if (u) onNodeOrgUnitClick(u);
  };

  const handleLinkClick = (source: HierarchyPointNode<TreeNodeDatum>, target: HierarchyPointNode<TreeNodeDatum>) => {
    if (!canWrite) return;
    if (source.data.attributes?.syntheticRoot === true) {
      return;
    }
    const parentU = orgUnitFromNode(source, byId);
    const childU = orgUnitFromNode(target, byId);
    if (parentU && childU) {
      onLinkInsertClick(parentU, childU);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No hierarchy loaded. Pick an org unit from the list, or load one by ID.
      </div>
    );
  }

  const treeSvg = (
    <>
      <div
        ref={containerRef}
        className={cn(
          'rd3t-tree-container w-full overflow-hidden rounded-lg border bg-background',
          fillContainer && 'min-h-0 flex-1'
        )}
        style={fillContainer ? { height: size.h, minHeight: 200 } : { height: size.h }}
      >
        <Tree
          key={dataKey}
          data={d3Data}
          dataKey={dataKey}
          orientation="vertical"
          pathFunc="elbow"
          translate={{ x: size.w / 2, y: 56 }}
          dimensions={{ width: size.w, height: size.h }}
          collapsible={false}
          zoomable
          draggable
          scaleExtent={{ min: 0.2, max: 1.5 }}
          nodeSize={{ x: 200, y: 120 }}
          separation={{ siblings: 1.1, nonSiblings: 1.25 }}
          hasInteractiveNodes
          renderCustomNodeElement={(rd3tProps) => {
            const { nodeDatum, onNodeClick } = rd3tProps;
            const depth = Number(nodeDatum.attributes?.depth ?? 0);
            const synthetic = nodeDatum.attributes?.syntheticRoot === true;
            const fill = synthetic ? '#64748b' : depthFill(depth);
            const label = synthetic ? nodeDatum.name : orgInitials(nodeDatum.name);
            return (
              <g>
                <circle r={22} fill={fill} stroke="#cbd5e1" strokeWidth={2} onClick={onNodeClick} />
                {!synthetic ? (
                  <text
                    fill="#fff"
                    fontSize={11}
                    fontWeight={600}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {label}
                  </text>
                ) : (
                  <text
                    fill="#fff"
                    fontSize={9}
                    fontWeight={600}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    …
                  </text>
                )}
                <text
                  y={36}
                  className="fill-foreground"
                  fontSize={11}
                  fontWeight={500}
                  textAnchor="middle"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {nodeDatum.name.length > 18 ? `${nodeDatum.name.slice(0, 16)}…` : nodeDatum.name}
                </text>
              </g>
            );
          }}
          onNodeClick={(node) => {
            handleNodeClick(node);
          }}
          onLinkClick={(source, target, evt) => {
            evt.stopPropagation();
            handleLinkClick(source, target);
          }}
          pathClassFunc={() =>
            canWrite ? 'org-tree-link' : 'org-tree-link org-tree-link--readonly'
          }
          svgClassName="org-d3-tree-svg"
        />
      </div>
    </>
  );

  return (
    <div
      className={cn(
        'rounded-xl border bg-muted/20 p-4',
        fillContainer && 'flex min-h-0 flex-1 flex-col',
        hideChrome && 'border-0 bg-transparent p-0 shadow-none',
        className
      )}
    >
      <style>{RD3T_BASE_CSS}</style>
      {!hideChrome ? (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <h4 className="text-sm font-semibold">Hierarchy</h4>
            <p className="max-w-xl text-xs text-muted-foreground">
              Click a <span className="font-medium text-foreground">node</span> to add a child, move, or remove. Click a{' '}
              <span className="font-medium text-foreground">link</span> to insert a new unit between parent and child.
              Drag and scroll to pan and zoom.
            </p>
          </div>
          {headerActions ? <div className="flex shrink-0 items-center gap-2">{headerActions}</div> : null}
        </div>
      ) : null}
      {treeSvg}
      <style>{`
        .org-d3-tree-svg .org-tree-link {
          stroke: hsl(var(--muted-foreground) / 0.45);
          stroke-width: 2px;
        }
        .org-d3-tree-svg .org-tree-link--readonly {
          pointer-events: none;
        }
        .org-d3-tree-svg .org-tree-link:hover {
          stroke: hsl(var(--primary));
          stroke-width: 2.5px;
        }
        .org-d3-tree-svg .rd3t-node,
        .org-d3-tree-svg .rd3t-leaf-node {
          fill: transparent;
          stroke: none;
        }
      `}</style>
    </div>
  );
}
