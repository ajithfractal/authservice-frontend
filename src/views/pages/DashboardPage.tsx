import { PermissionGate } from '@/components/PermissionGate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/services/AuthContext';
import { Link } from 'react-router-dom';
import { AppButton } from '@/shared/components/app/AppButton';

function displayName(user: { name?: string | null; email?: string | null } | null | undefined): string {
  const n = user?.name?.trim();
  if (n) return n;
  const e = user?.email?.trim();
  if (e) return e;
  return 'there';
}

export function DashboardPage() {
  const { user, can } = useAuth();
  const showAdminHub = can([], ['admin:read']);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAdminHub ? (
            <div className="pt-1">
              <AppButton asChild size="sm">
                <Link to="/admin">Open Masters &amp; Base Configuration</Link>
              </AppButton>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
