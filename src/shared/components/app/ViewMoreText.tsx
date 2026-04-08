import { useMemo, useState } from 'react';
import { AppModal } from '@/shared/components/app/AppModal';
import { AppButton } from '@/shared/components/app/AppButton';
import { cn } from '@/lib/utils';

interface ViewMoreTextProps {
  text: string;
  /** Approximate max length before showing View more (plain text). */
  maxLength?: number;
  modalTitle?: string;
  className?: string;
  lineClamp?: 1 | 2 | 3;
}

export function ViewMoreText({
  text,
  maxLength = 80,
  modalTitle = 'Description',
  className,
  lineClamp = 2
}: ViewMoreTextProps) {
  const [open, setOpen] = useState(false);
  const trimmed = text?.trim() ?? '';
  const needsMore = useMemo(() => trimmed.length > maxLength, [trimmed, maxLength]);

  const preview =
    needsMore && trimmed.length > maxLength ? `${trimmed.slice(0, maxLength).trimEnd()}…` : trimmed;

  if (!trimmed) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <>
      <div className={cn('min-w-0', className)}>
        <p
          className={cn(
            'text-sm text-muted-foreground',
            lineClamp === 1 && 'line-clamp-1',
            lineClamp === 2 && 'line-clamp-2',
            lineClamp === 3 && 'line-clamp-3'
          )}
          title={needsMore ? undefined : trimmed}
        >
          {needsMore ? preview : trimmed}
        </p>
        {needsMore && (
          <AppButton
            type="button"
            variant="ghost"
            className="h-auto px-0 py-0 text-xs font-normal text-primary hover:bg-transparent hover:underline"
            onClick={() => setOpen(true)}
          >
            View more
          </AppButton>
        )}
      </div>
      <AppModal open={open} onClose={() => setOpen(false)} title={modalTitle}>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{trimmed}</p>
      </AppModal>
    </>
  );
}
