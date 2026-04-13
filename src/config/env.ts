export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

// Matches backend controller base path: /api/rbac/permissions
export const RBAC_PERMISSIONS_PATH =
  import.meta.env.VITE_RBAC_PERMISSIONS_PATH ?? '/rbac/permissions';

export const RBAC_ROLES_PATH = import.meta.env.VITE_RBAC_ROLES_PATH?.trim() ?? '/rbac/roles';

/** GET — compact role list for filters (e.g. `/rbac/roles/dropdown`). */
export const RBAC_ROLES_DROPDOWN_PATH =
  import.meta.env.VITE_RBAC_ROLES_DROPDOWN_PATH?.trim() ?? `${RBAC_ROLES_PATH}/dropdown`;

export const RBAC_USERS_PATH = import.meta.env.VITE_RBAC_USERS_PATH?.trim() ?? '/rbac/users';
export const REGISTERED_APPLICATIONS_PATH =
  import.meta.env.VITE_REGISTERED_APPLICATIONS_PATH?.trim() ?? '/registered-applications';
export const RBAC_ROLE_VISIBILITY_SCOPES_PATH =
  import.meta.env.VITE_RBAC_ROLE_VISIBILITY_SCOPES_PATH?.trim() ?? '/rbac/role-visibility-scopes';
export const RLS_CONFIG_PATH = import.meta.env.VITE_RLS_CONFIG_PATH?.trim() ?? '/rls/config';

/** Org hierarchy / row-level-security endpoints. */
export const ORG_UNITS_PATH = import.meta.env.VITE_ORG_UNITS_PATH?.trim() ?? '/org-units';

export const SSO_PROVIDERS_PATH =
  import.meta.env.VITE_SSO_PROVIDERS_PATH ?? '/auth/sso/providers';

export const SSO_LOGIN_URL_PATH =
  import.meta.env.VITE_SSO_LOGIN_URL_PATH ?? '/auth/sso/login-url';

/**
 * Must match the Keycloak / OAuth redirect URI registered for this app and your backend
 * `buildCallbackRedirectUri` / `GET …/callback` handler. Keycloak redirects here with `code` + `state`;
 * the server exchanges the code, sets cookies, then redirects the browser to the SPA (see backend).
 */
export const SSO_CALLBACK_PATH =
  import.meta.env.VITE_SSO_CALLBACK_PATH ?? '/auth/sso/callback';

/** Email/password login (not SSO). SSO uses SSO_* paths below. */
export const AUTH_LOGIN_PATH = import.meta.env.VITE_AUTH_LOGIN_PATH?.trim() || '/auth/login';

/** JSON key for the login identifier; Spring often expects `username`. */
export const AUTH_LOGIN_ID_FIELD =
  import.meta.env.VITE_AUTH_LOGIN_ID_FIELD?.trim() || 'email';

/** Current user when using cookie sessions (backend SSO redirect flow). */
export const AUTH_ME_PATH = import.meta.env.VITE_AUTH_ME_PATH?.trim() || '/auth/me';

/** Clears ACCESS_TOKEN / REFRESH_TOKEN via Set-Cookie; backend reads refresh from REFRESH_TOKEN cookie. */
export const AUTH_LOGOUT_PATH = import.meta.env.VITE_AUTH_LOGOUT_PATH?.trim() || '/auth/logout';

/** POST — admin/user registration (body: email, password, firstName, lastName, orgUnitId, applicationCode). */
export const AUTH_REGISTER_PATH = import.meta.env.VITE_AUTH_REGISTER_PATH?.trim() || '/auth/register';

/** Keycloak client id (`azp`); used to read `resource_access[clientId].roles` from the access token. */
export const KEYCLOAK_CLIENT_ID =
  import.meta.env.VITE_KEYCLOAK_CLIENT_ID?.trim() || 'hrapp';

/**
 * Readable access-token cookie on the SPA origin → sent as Authorization Bearer to the API.
 * Default `ACCESS_TOKEN`. Set `VITE_AUTH_TOKEN_COOKIE=` (empty) to disable Bearer-from-cookie.
 */
const rawAccessCookie = import.meta.env.VITE_AUTH_TOKEN_COOKIE as string | undefined;
export const AUTH_TOKEN_COOKIE_NAME =
  rawAccessCookie === ''
    ? ''
    : rawAccessCookie != null && rawAccessCookie.trim() !== ''
      ? rawAccessCookie.trim()
      : 'ACCESS_TOKEN';

/** Default include so API can also receive cookies when they are set for the API host. */
export const API_FETCH_CREDENTIALS: RequestCredentials =
  import.meta.env.VITE_API_WITH_CREDENTIALS === 'false' ? 'same-origin' : 'include';
