import type { Role, User } from '@/types/auth';

interface DecodedToken {
  sub?: string;
  exp?: number;
  roles?: string[];
  [key: string]: unknown;
}

export function decodeJwt(token: string): DecodedToken | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as DecodedToken;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const decoded = decodeJwt(token);
  if (!decoded?.exp) return false;
  return decoded.exp * 1000 < Date.now();
}

function getKeycloakClientResourceRoles(
  payload: Record<string, unknown>,
  clientId: string
): string[] {
  const ra = payload.resource_access as Record<string, { roles?: string[] }> | undefined;
  return ra?.[clientId]?.roles ?? [];
}

/** When a user has several Keycloak client roles, pick one for app RBAC (order: HR → MANAGER → EMPLOYEE). */
export function selectPrimaryRoleFromKeycloakClientRoles(roles: string[]): Role {
  const upper = new Set(roles.map((r) => String(r).toUpperCase()));
  if (upper.has('HR')) return 'HR';
  if (upper.has('MANAGER')) return 'MANAGER';
  if (upper.has('EMPLOYEE')) return 'EMPLOYEE';
  const first = roles[0];
  return first ? String(first).toUpperCase() : 'EMPLOYEE';
}

/**
 * Overlay Keycloak access-token claims onto the API user: client roles → `user.role`, optional identity fields.
 */
export function mergeUserWithKeycloakAccessToken(
  token: string,
  user: User,
  keycloakClientId: string
): User {
  const decoded = decodeJwt(token);
  if (!decoded) return user;

  const payload = decoded as Record<string, unknown>;
  const clientId =
    keycloakClientId.trim() || (typeof payload.azp === 'string' ? payload.azp : '');
  const clientRoles = clientId ? getKeycloakClientResourceRoles(payload, clientId) : [];

  let next: User = { ...user };

  if (clientRoles.length > 0) {
    next.role = selectPrimaryRoleFromKeycloakClientRoles(clientRoles);
  }

  if (!next.id && typeof payload.sub === 'string') {
    next.id = payload.sub;
  }
  if (!next.email && typeof payload.email === 'string') {
    next.email = payload.email;
  }
  if (!next.name && typeof payload.name === 'string') {
    next.name = payload.name;
  }

  return next;
}
