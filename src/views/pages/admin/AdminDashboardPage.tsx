import { Link } from 'react-router-dom';
import { AppWindow, KeyRound, type LucideIcon, Shield, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '@/services/AuthContext';
import { AppButton } from '@/shared/components/app/AppButton';
import { Card, CardContent } from '@/components/ui/card';

type AdminModule = {
  title: string;
  description: string;
  to: string;
  permission: string;
  roles?: string[];
  icon: LucideIcon;
};

const adminModules: AdminModule[] = [
  {
    title: 'Applications',
    description: 'Register and browse applications available in the system.',
    to: '/admin/applications',
    permission: 'applications:read',
    roles: ['superAdmin'],
    icon: AppWindow
  },
  {
    title: 'Users',
    description: 'Manage user accounts, access status, and hierarchy assignment.',
    to: '/admin/users',
    permission: 'users:read',
    icon: Users
  },
  {
    title: 'Roles',
    description: 'Configure role definitions and access scope policies.',
    to: '/admin/roles',
    permission: 'roles:read',
    icon: ShieldCheck
  },
  {
    title: 'Permissions',
    description: 'Maintain permission catalog and operation-level controls.',
    to: '/admin/permissions',
    permission: 'permissions:read',
    icon: KeyRound
  },
  {
    title: 'Row Level Security',
    description: 'Manage org hierarchy and runtime hierarchy filtering settings.',
    to: '/admin/row-level-security',
    permission: 'org-units:read',
    icon: Shield
  }
];

export function AdminDashboardPage() {
  const { can } = useAuth();
  const visibleModules = adminModules.filter((m) => can(m.roles ?? [], [m.permission]));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {visibleModules.map((module) => (
          <Card key={module.to} className="rounded-3xl border border-slate-200/90 shadow-sm">
            <CardContent className="space-y-4 p-7">
              <module.icon className="h-6 w-6 text-slate-900" />
              <p className="text-[15px] font-semibold text-[#5c7298]">Configure</p>
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-slate-950">{module.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#5c7298] h-20">{module.description}</p>
              </div>
              <AppButton
                asChild
                size="sm"
                className="group/card mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-slate-700 to-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:from-slate-800 hover:to-slate-950 hover:text-white hover:shadow-xl hover:shadow-slate-900/40"
              >
                <Link to={module.to}>Manage →</Link>
              </AppButton>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
