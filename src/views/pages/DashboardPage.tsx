import { useAuth } from '@/services/AuthContext';
import { AdminDashboardPage } from '@/views/pages/admin/AdminDashboardPage';

export function DashboardPage() {
  const { can } = useAuth();
  const showAdminHub = can([], ['admin:read']);

  if (showAdminHub) return <AdminDashboardPage />;

  return <div className="space-y-4" />;
}
