import { useState } from 'react';
import { AppModal } from '@/shared/components/app/AppModal';
import { AppButton } from '@/shared/components/app/AppButton';
import { Badge } from '@/components/ui/badge';

interface ViewMoreListModalProps {
  title: string;
  items: { id: string; label: string; description?: string }[];
  maxVisible?: number;
  emptyLabel?: string;
}

/**
 * Shows up to `maxVisible` items as badges; overflow shows a “+N” control that opens the full list in a modal.
 */
export function ViewMoreListModal({
  title,
  items,
  maxVisible = 4,
  emptyLabel = '—'
}: ViewMoreListModalProps) {
  const [open, setOpen] = useState(false);
  if (!items.length) {
    return <span className="text-xs text-muted-foreground">{emptyLabel}</span>;
  }

  const visible = items.slice(0, maxVisible);
  const rest = items.length - visible.length;
  const openList = () => setOpen(true);

  return (
    <>
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        {visible.map((item) => (
          <Badge key={item.id} variant="secondary" className="max-w-[10rem] truncate text-xs font-normal">
            {item.label}
          </Badge>
        ))}
        {rest > 0 && (
          <>
            <button
              type="button"
              aria-label={`${rest} more — open full list`}
              className="inline-flex h-6 shrink-0 items-center rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground"
              onClick={openList}
            >
              +{rest}
            </button>
            <AppButton
              type="button"
              variant="ghost"
              className="h-auto shrink-0 px-1 py-0 text-xs font-normal text-primary hover:bg-transparent hover:underline"
              onClick={openList}
            >
              View more
            </AppButton>
          </>
        )}
      </div>
      <AppModal open={open} onClose={() => setOpen(false)} title={title} className="max-w-lg">
        <ul className="max-h-[min(50vh,20rem)] space-y-2 overflow-y-auto text-sm">
          {items.map((item) => (
            <li key={item.id} className="rounded-md border bg-muted/30 px-3 py-2">
              <div className="font-mono text-xs font-medium">{item.label}</div>
              {item.description ? (
                <div className="mt-1 text-xs text-muted-foreground">{item.description}</div>
              ) : null}
            </li>
          ))}
        </ul>
      </AppModal>
    </>
  );
}
