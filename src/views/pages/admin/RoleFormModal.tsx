import { type FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/services/AuthContext';
import type { RbacRole } from '@/types/rbac';
import { AppButton } from '@/shared/components/app/AppButton';
import { AppModal, ModalActions } from '@/shared/components/app/AppModal';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface RoleFormModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initial?: RbacRole | null;
  applicationIdFallback?: string;
  onSaved: () => void;
}

export function RoleFormModal({
  open,
  onClose,
  mode,
  initial,
  applicationIdFallback,
  onSaved
}: RoleFormModalProps) {
  const { createRole, patchRole } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      setDescription(initial.description ?? '');
    } else {
      setName('');
      setDescription('');
    }
    setError(null);
  }, [open, initial]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (mode === 'create') {
        await createRole({
          name: name.trim(),
          description: description.trim(),
          ...(applicationIdFallback ? { applicationId: applicationIdFallback } : {}),
          active: true
        });
      } else if (initial) {
        await patchRole(initial.id, {
          name: name.trim(),
          description: description.trim()
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal open={open} onClose={onClose} title={mode === 'create' ? 'Create role' : 'Edit role'}>
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="space-y-2">
          <label htmlFor="role-name" className="text-sm font-medium">
            Name
          </label>
          <Input
            id="role-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="role-desc" className="text-sm font-medium">
            Description
          </label>
          <Textarea id="role-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <ModalActions>
          <AppButton type="button" variant="outline" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton type="submit" disabled={saving}>
            {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
          </AppButton>
        </ModalActions>
      </form>
    </AppModal>
  );
}
