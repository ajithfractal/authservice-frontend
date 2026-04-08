import type { User } from '@/types/auth';

export class UserModel {
  constructor(private readonly user: User) {}

  get id() {
    return this.user.id;
  }

  get name() {
    return this.user.name;
  }

  get email() {
    return this.user.email;
  }

  get role() {
    return this.user.role;
  }

  hasPermission(permissionCode: string): boolean {
    return this.user.permissions.includes(permissionCode);
  }

  toJSON(): User {
    return this.user;
  }
}
