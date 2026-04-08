import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminPageGuard } from '@/components/AdminPageGuard';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminLayout } from '@/views/layouts/AdminLayout';
import { MainLayout } from '@/views/layouts/MainLayout';
import { PermissionsPage } from '@/views/pages/admin/PermissionsPage';
import { RowLevelSecurityPage } from '@/views/pages/admin/RowLevelSecurityPage';
import { RolesPage } from '@/views/pages/admin/RolesPage';
import { UsersPage } from '@/views/pages/admin/UsersPage';
import { AdminDashboardPage } from '@/views/pages/admin/AdminDashboardPage';
import { DashboardPage } from '@/views/pages/DashboardPage';
import { LoginPage } from '@/views/pages/LoginPage';
import { ProfilePage } from '@/views/pages/ProfilePage';
import { UnauthorizedPage } from '@/views/pages/UnauthorizedPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute requireAdminHub />}>
        <Route element={<MainLayout />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route
              path="users"
              element={
                <AdminPageGuard permissions={['users:read','admin:read']}>
                  <UsersPage />
                </AdminPageGuard>
              }
            />
            <Route
              path="roles"
              element={
                <AdminPageGuard permissions={['roles:read','admin:read']}>
                  <RolesPage />
                </AdminPageGuard>
              }
            />
            <Route
              path="permissions"
              element={
                <AdminPageGuard permissions={['permissions:read','admin:read']}>
                  <PermissionsPage />
                </AdminPageGuard>
              }
            />
            <Route
              path="row-level-security"
              element={
                <AdminPageGuard permissions={['org-units:read', 'admin:read']}>
                  <RowLevelSecurityPage />
                </AdminPageGuard>
              }
            />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
