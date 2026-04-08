import { useMemo } from 'react';
import { useAuth } from '@/services/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ProfilePage() {
  const { user } = useAuth();

  const roleLabel = useMemo(() => {
    if (!user?.role) return 'User';
    return String(user.role);
  }, [user?.role]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your account details and access context.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="text-muted-foreground">Name</p>
          <p className="font-medium">{user?.name ?? '-'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Email</p>
          <p className="font-medium">{user?.email ?? '-'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Primary role</p>
          <p className="font-medium">{roleLabel}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Organization unit</p>
          <p className="font-medium">{user?.orgUnitId ?? '-'}</p>
        </div>
      </CardContent>
    </Card>
  );
}
