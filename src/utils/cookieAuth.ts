/** Read a non-HttpOnly cookie. HttpOnly cookies are invisible to JS and cannot be used here. */
export function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const parts = `; ${document.cookie}`.split(`; ${name}=`);
  if (parts.length < 2) return null;
  const value = parts.pop()?.split(';').shift();
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Clears a host-visible cookie (best effort; cannot clear HttpOnly). */
export function eraseCookieBestEffort(name: string, path = '/') {
  if (typeof document === 'undefined') return;
  document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; Path=${path}`;
}
