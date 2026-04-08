/** Scrollable table shell: fixed max height, inner scroll, pairs with sticky `TableHeader`. */
export const DATA_TABLE_SCROLL_CLASS =
  'max-h-[min(60vh,30rem)] overflow-y-auto rounded-xl border bg-card';

/** Sticky header row for tables inside `DATA_TABLE_SCROLL_CLASS`. */
export const DATA_TABLE_HEAD_STICKY_CLASS =
  'sticky top-0 z-10 bg-card shadow-[0_1px_0_0_hsl(var(--border))] [&_th]:bg-muted/30';
