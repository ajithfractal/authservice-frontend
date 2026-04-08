import type { ReactNode } from 'react';
import type { ButtonProps } from '@/components/ui/button';
import { useAuth } from '@/services/AuthContext';
import { AppButton } from '@/shared/components/app/AppButton';

interface AdminPermissionButtonProps extends Omit<ButtonProps, 'children'> {
  permission: string;
  label?: string;
  icon?: ReactNode;
  children?: ReactNode;
  hideIfUnauthorized?: boolean;
}

function AdminPermissionButton({
  permission,
  label,
  icon,
  children,
  hideIfUnauthorized = true,
  className,
  ...props
}: AdminPermissionButtonProps) {
  const { can } = useAuth();
  const allowed = can([], [permission]);
  if (!allowed && hideIfUnauthorized) return null;

  const content = children ?? (
    <>
      {icon}
      {label ? <span>{label}</span> : null}
    </>
  );

  return (
    <AppButton {...props} className={className} disabled={props.disabled || !allowed}>
      {content}
    </AppButton>
  );
}

type ActionButtonProps = Omit<AdminPermissionButtonProps, 'permission'>;

export function AdminUserCreateButton(props: ActionButtonProps) {
  return <AdminPermissionButton permission="users:create" {...props} />;
}

export function AdminUserManageButton(props: ActionButtonProps) {
  return <AdminPermissionButton permission="users:manage" {...props} />;
}

export function AdminUserDeleteButton(props: ActionButtonProps) {
  return <AdminPermissionButton permission="users:delete" {...props} />;
}

export function AdminRoleCreateButton(props: ActionButtonProps) {
  return <AdminPermissionButton permission="roles:write" {...props} />;
}

export function AdminRoleEditButton(props: ActionButtonProps) {
  return <AdminPermissionButton permission="roles:write" {...props} />;
}

export function AdminRoleManagePermissionsButton(props: ActionButtonProps) {
  return <AdminPermissionButton permission="roles:write" {...props} />;
}

export function AdminRoleDeleteButton(props: ActionButtonProps) {
  return <AdminPermissionButton permission="roles:write" {...props} />;
}

export function AdminPermissionCreateButton(props: ActionButtonProps) {
  return <AdminPermissionButton permission="permissions:write" {...props} />;
}

export function AdminPermissionEditButton(props: ActionButtonProps) {
  return <AdminPermissionButton permission="permissions:write" {...props} />;
}

export function AdminPermissionDeleteButton(props: ActionButtonProps) {
  return <AdminPermissionButton permission="permissions:write" {...props} />;
}
