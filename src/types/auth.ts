export type Role = 'MANAGER' | 'HR' | 'EMPLOYEE' | string;

export interface Permission {
  code: string;
  description?: string;
}

/** GET /api/auth/me — backend shape (JWT/session). */
export interface AuthMeResponse {
  userId: string;
  applicationId: string;
  orgUnitId: string | null;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: string[];
  applicationId?: string;
  orgUnitId?: string | null;
  /** RBAC role names from /auth/me when provided. */
  roles?: string[];
}

/** POST /api/auth/register — create user account. */
export interface RegisterUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  orgUnitId: string | null;
  applicationCode: string | null;
}

/** POST /api/auth/login — tokens; profile from GET /auth/me. */
export interface LoginResponse {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresIn?: number;
  refreshTokenExpiresIn?: number;
  /** Legacy / alternate field names */
  token?: string;
  /** Rare: inline user (most flows use cookies + /auth/me). */
  user?: User;
}
