/** Prefer backend JSON `{ "error": "..." }` when present. */
export function formatHttpError(body: string, status: number): string {
  const trimmed = body.trim();
  if (!trimmed) return `HTTP ${status}`;
  try {
    const j = JSON.parse(trimmed) as { error?: string; message?: string };
    return j.error ?? j.message ?? trimmed;
  } catch {
    return trimmed;
  }
}
