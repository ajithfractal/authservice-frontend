import { Link, Outlet, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const adminLinks = [
  { to: '/admin', label: 'All' },
  { to: '/admin/applications', label: 'Applications' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/roles', label: 'Roles' },
  { to: '/admin/permissions', label: 'Permissions' },
  { to: '/admin/row-level-security', label: 'Row Level Security' }
];

export function AdminLayout() {
  const location = useLocation();
  const pageTitle =
    adminLinks.find((l) =>
      l.to === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(l.to)
    )?.label ?? 'Masters & Base Configuration';

  return (
    <div className="space-y-6">
      <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5">
        <Link to="/" className="cursor-pointer hover:text-foreground hover:underline">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/admin" className="cursor-pointer hover:text-foreground">
          Masters &amp; Base Configuration
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="font-medium text-foreground">{pageTitle}</span>
      </div>
      <Outlet />
    </div>
  );
}
