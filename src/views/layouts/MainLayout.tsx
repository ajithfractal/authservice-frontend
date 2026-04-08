import { useMemo } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/services/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import type { User } from '@/types/auth';

type NavItem = { to: string; label: string; show: (user: User) => boolean };

function hasPermission(user: User, code: string): boolean {
  const want = code.toLowerCase();
  return (user.permissions ?? []).some((p) => {
    const val = String(p).toLowerCase();
    return val === 'all' || val === want;
  });
}

const baseNavItems: NavItem[] = [
  { to: '/', label: 'Dashboard', show: () => true },
  { to: '/admin/users', label: 'Admin', show: (u) => hasPermission(u, 'admin:read') }
];

export function MainLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const roleLabel = user?.role ? String(user.role) : 'User';

  const visibleNav = useMemo(() => {
    if (!user) return [];
    return baseNavItems.filter((item) => item.show(user));
  }, [user]);

  const activeTab =
    visibleNav.find((item) =>
      item.to === '/admin/users' ? location.pathname.startsWith('/admin') : location.pathname === item.to
    )?.to ?? visibleNav[0]?.to ?? '';

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 md:px-8">
      <header className="mb-6 flex flex-col gap-4 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{`Welcome ${roleLabel} (${user?.name ?? 'User'})`}</h1>
          <p className="text-sm text-muted-foreground">Role-based access with permission enforcement</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link to="/profile" className="text-sm font-medium underline-offset-4 hover:underline">
            {user?.name}
          </Link>
          <Badge variant="secondary" className="uppercase">
            {user?.role}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => void logout()}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      {visibleNav.length > 0 ? (
        <Tabs value={activeTab} onValueChange={(value) => navigate(value)} className="mb-6">
          <TabsList>
            {visibleNav.map((item) => (
              <TabsTrigger key={item.to} value={item.to}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : null}

      <main className="pb-10">
        <Outlet />
      </main>
    </div>
  );
}
