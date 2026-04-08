import type { NavigateFunction } from 'react-router-dom';

/** Let AuthProvider commit user state before protected routes read context. */
export function navigateAfterAuthCommit(navigate: NavigateFunction, to: string) {
  queueMicrotask(() => {
    requestAnimationFrame(() => navigate(to, { replace: true }));
  });
}
