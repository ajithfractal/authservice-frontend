export interface OrgUnit {
  id: string;
  name: string;
  parentId: string | null;
  /**
   * Steps from this node’s tree root (`parentId == null` in that tree).
   * On `GET /org-units`, depth is per subtree, not a global rank across separate roots.
   * Children/ancestors endpoints also return depth relative to the queried subtree.
   */
  depth?: number;
}

export interface CreateOrgUnitRequest {
  name: string;
  parentId: string | null;
}

export interface MoveOrgUnitRequest {
  newParentId: string | null;
}
