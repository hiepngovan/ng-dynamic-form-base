import { computed } from '@angular/core';
import { updateState } from '@angular-architects/ngrx-toolkit';
import { signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { withStoreDevtools } from '../shared/data';

export type Role = 'MANAGER' | 'STAFF';
export type Permission =
  | 'customer.view'
  | 'customer.edit'
  | 'customer.delete'
  | 'loan.view'
  | 'loan.edit'
  | 'loan.approve';

/**
 * Hồ sơ vay theo mô hình 4 mắt: chuyên viên lập & gửi duyệt, trưởng phòng duyệt / trả lại / từ chối.
 * Trưởng phòng không lập hồ sơ (không tự duyệt hồ sơ của mình).
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  MANAGER: ['customer.view', 'customer.edit', 'customer.delete', 'loan.view', 'loan.approve'],
  STAFF: ['customer.view', 'customer.edit', 'loan.view', 'loan.edit'],
};

/** Người dùng giả cho từng vai trò (lịch sử xử lý hồ sơ hiện đúng tên người làm). */
const USERS: Record<Role, string> = {
  MANAGER: 'Trần Thu Hà',
  STAFF: 'Nguyễn Minh Quân',
};

/** MOCK: nhớ vai trò đã chọn qua F5 (khi có đăng nhập thì vai trò lấy từ token). */
const ROLE_KEY = 'mock-role';
const savedRole = (): Role => {
  try {
    const r = localStorage.getItem(ROLE_KEY);
    return r === 'STAFF' || r === 'MANAGER' ? r : 'MANAGER';
  } catch {
    return 'MANAGER';
  }
};

export const ROLE_OPTIONS = [
  { value: 'MANAGER' as Role, label: 'Trưởng phòng (duyệt)' },
  { value: 'STAFF' as Role, label: 'Chuyên viên (lập hồ sơ)' },
];

/**
 * State TOÀN ỨNG DỤNG: người dùng, quyền. Chỉ base được thêm vào đây; state của màn hình nằm
 * trong store của màn hình. Danh mục dùng chung: MasterDataService (cùng thư mục core).
 * (Mock: chưa có đăng nhập — đổi vai trò ở thanh trên cùng để thử phân quyền.)
 */
export const AppStore = signalStore(
  { providedIn: 'root' },
  withState(() => {
    const role = savedRole();
    return { user: { name: USERS[role], role } };
  }),
  withComputed(({ user }) => ({
    permissions: computed(() => ROLE_PERMISSIONS[user().role]),
  })),
  withMethods((store) => ({
    /** Dùng trong template: @if (app.can('customer.delete')) { ... } — tự cập nhật khi đổi quyền. */
    can(permission: Permission): boolean {
      return store.permissions().includes(permission);
    },
    switchRole(role: Role) {
      updateState(store, 'app: switch role', { user: { name: USERS[role], role } });
      try {
        localStorage.setItem(ROLE_KEY, role);
      } catch {
        /* bỏ qua */
      }
    },
  })),
  withStoreDevtools('app'),
);
