import type { ReactNode } from 'react';
import { AppButton } from '@/shared/components/app/AppButton';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';

interface AppModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function AppModal({ open, onClose, title, children, footer, className }: AppModalProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className={cn('max-h-[90vh] overflow-y-auto', className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
        {footer}
      </DialogContent>
    </Dialog>
  );
}

export function ModalActions({ children, className }: { children: ReactNode; className?: string }) {
  return <DialogFooter className={cn('mt-6', className)}>{children}</DialogFooter>;
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  loading,
  danger
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  danger?: boolean;
}) {
  return (
    <AppModal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-muted-foreground">{message}</p>
      <ModalActions>
        <AppButton type="button" variant="outline" onClick={onClose} disabled={loading}>
          Cancel
        </AppButton>
        <AppButton
          type="button"
          variant={danger ? 'destructive' : 'default'}
          disabled={loading}
          onClick={() => void onConfirm()}
        >
          {loading ? '…' : confirmLabel}
        </AppButton>
      </ModalActions>
    </AppModal>
  );
}
