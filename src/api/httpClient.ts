import {
  API_BASE_URL,
  API_FETCH_CREDENTIALS,
  AUTH_LOGIN_PATH,
  AUTH_LOGOUT_PATH,
  SSO_CALLBACK_PATH,
  SSO_LOGIN_URL_PATH,
  SSO_PROVIDERS_PATH
} from '@/config/env';
import { formatHttpError } from '@/utils/apiError';

/**
 * No Bearer on password login or SSO bootstrap. `/auth/me` and other authenticated
 * `/auth/*` routes send Bearer when a readable access cookie exists.
 */
function shouldOmitBearerForPath(path: string): boolean {
  const pathname = path.split('?')[0] ?? '';
  const publicPrefixes = [
    AUTH_LOGIN_PATH,
    AUTH_LOGOUT_PATH,
    SSO_PROVIDERS_PATH,
    SSO_LOGIN_URL_PATH,
    SSO_CALLBACK_PATH
  ];
  return publicPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export class HttpClient {
  constructor(private getToken: () => string | null) {}

  private buildHeaders(path: string, options: RequestInit): Record<string, string> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined)
    };
    if (token && !shouldOmitBearerForPath(path)) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  private fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
    return fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: this.buildHeaders(path, options),
      credentials: API_FETCH_CREDENTIALS
    });
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await this.fetchWithAuth(path, options);
    if (!response.ok) {
      const message = await response.text();
      throw new Error(formatHttpError(message, response.status));
    }
    const text = await response.text();
    if (!text.trim()) {
      return undefined as T;
    }
    return JSON.parse(text) as T;
  }

  /** DELETE/POST with 204 No Content or empty body. */
  async requestVoid(path: string, options: RequestInit = {}): Promise<void> {
    const response = await this.fetchWithAuth(path, options);
    if (!response.ok) {
      const message = await response.text();
      throw new Error(formatHttpError(message, response.status));
    }
  }

  /**
   * For secured "who am I?" endpoints: 401 means no session (guest), not an app fault.
   * Other error statuses still throw.
   */
  async requestOrNullIfUnauthorized<T>(path: string, options: RequestInit = {}): Promise<T | null> {
    const response = await this.fetchWithAuth(path, options);
    if (response.status === 401) {
      return null;
    }
    if (!response.ok) {
      const message = await response.text();
      throw new Error(formatHttpError(message, response.status));
    }
    return (await response.json()) as T;
  }
}
