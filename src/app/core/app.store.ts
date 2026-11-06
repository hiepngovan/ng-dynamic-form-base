import { computed } from '@angular/core';
import { updateState } from '@angular-architects/ngrx-toolkit';
import { signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { withStoreDevtools } from '../shared/data';

export type Role = 'MANAGER' | 'STAFF';
export type Permission = 'customer.view' | 'customer.edit' | 'customer.delete';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  MANAGER: ['customer.view', 'customer.edit', 'customer.delete'],
  STAFF: ['customer.view', 'customer.edit'],
};

export const ROLE_OPTIONS = [
  { value: 'MANAGER' as Role, label: 'Quản lý' },
  { value: 'STAFF' as Role, label: 'Nhân viên' },
];

/**
 * State TOÀN ỨNG DỤNG: người dùng, quyền. Chỉ base được thêm vào đây; state của màn hình nằm
 * trong store của màn hình. Danh mục dùng chung: MasterDataService (cùng thư mục core).
 * (Mock: chưa có đăng nhập — đổi vai trò ở thanh trên cùng để thử phân quyền.)
 */
export const AppStore = signalStore(
  { providedIn: 'root' },
  withState({ user: { name: 'Nguyễn Minh Quân', role: 'MANAGER' as Role } }),
  withComputed(({ user }) => ({
    permissions: computed(() => ROLE_PERMISSIONS[user().role]),
  })),
  withMethods((store) => ({
    /** Dùng trong template: @if (app.can('customer.delete')) { ... } — tự cập nhật khi đổi quyền. */
    can(permission: Permission): boolean {
      return store.permissions().includes(permission);
    },
    switchRole(role: Role) {
      updateState(store, 'app: switch role', { user: { ...store.user(), role } });
    },
  })),
  withStoreDevtools('app'),
);
