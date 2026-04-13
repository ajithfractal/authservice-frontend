import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/services/AuthContext';
import type { RegisteredApplication } from '@/types/registeredApplications';
import { AppButton } from '@/shared/components/app/AppButton';
import { AppModal, ModalActions } from '@/shared/components/app/AppModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/shared/components/ui/table';

export function RegisteredApplicationsPage() {
  const { listRegisteredApplications, createRegisteredApplication, getRegisteredApplicationById } = useAuth();
  const [items, setItems] = useState<RegisteredApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [applicationName, setApplicationName] = useState('');
  const [applicationCode, setApplicationCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [lookupId, setLookupId] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listRegisteredApplications();
      setItems(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load applications');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [listRegisteredApplications]);

  useEffect(() => {
    void load();
  }, [load]);

  const onOpenCreate = () => {
    setCreateOpen(true);
    setApplicationName('');
    setApplicationCode('');
    setCreateError(null);
  };

  const onSubmitCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setCreateError(null);
    try {
      await createRegisteredApplication({
        applicationName: applicationName.trim(),
        applicationCode: applicationCode.trim()
      });
      setCreateOpen(false);
      await load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const onLookupById = async () => {
    const id = lookupId.trim();
    if (!id) return;
    setLookupLoading(true);
    setLookupError(null);
    try {
      const row = await getRegisteredApplicationById(id);
      setItems([row]);
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : 'Could not find application');
      setItems([]);
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Applications</CardTitle>
          <CardDescription>Register and manage available applications.</CardDescription>
        </div>
        <AppButton type="button" size="sm" onClick={onOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Register application
        </AppButton>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto] md:items-end">
          <div>
            <label htmlFor="application-id-search" className="text-xs text-muted-foreground">
              Get application by id
            </label>
            <Input
              id="application-id-search"
              placeholder="2f4f71d3-31a3-4a53-9fa5-7d3c2c2d8f1a"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
            />
          </div>
          <AppButton type="button" variant="outline" onClick={() => void onLookupById()} disabled={lookupLoading}>
            {lookupLoading ? 'Searching…' : 'Get by id'}
          </AppButton>
          <AppButton type="button" variant="ghost" onClick={() => void load()} disabled={loading}>
            Refresh list
          </AppButton>
        </div>

        {(error || lookupError) && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {lookupError ?? error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading applications…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Application Name</TableHead>
                <TableHead>Application Code</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No applications found.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-mono text-xs">{app.id}</TableCell>
                    <TableCell>{app.applicationName}</TableCell>
                    <TableCell className="font-mono">{app.applicationCode}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AppModal open={createOpen} onClose={() => setCreateOpen(false)} title="Register application">
        <form className="space-y-4" onSubmit={onSubmitCreate}>
          <div className="space-y-1">
            <label htmlFor="app-name" className="text-sm font-medium">
              Application name
            </label>
            <Input
              id="app-name"
              value={applicationName}
              onChange={(e) => setApplicationName(e.target.value)}
              placeholder="Inventory"
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="app-code" className="text-sm font-medium">
              Application code
            </label>
            <Input
              id="app-code"
              value={applicationCode}
              onChange={(e) => setApplicationCode(e.target.value)}
              placeholder="inventory"
              required
            />
          </div>
          {createError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {createError}
            </div>
          ) : null}
          <ModalActions>
            <AppButton type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancel
            </AppButton>
            <AppButton type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create'}
            </AppButton>
          </ModalActions>
        </form>
      </AppModal>
    </Card>
  );
}
