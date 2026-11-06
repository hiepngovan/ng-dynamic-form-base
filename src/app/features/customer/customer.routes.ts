import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AppStore } from '../../core/app.store';
import { unsavedChangesGuard } from '../../shared/dynamic-form';

/** Không đủ quyền → về danh sách (thay vì trang trắng khi mở thẳng URL / F5). */
const canCreate = () =>
  inject(AppStore).can('customer.edit') || inject(Router).createUrlTree(['/customers']);

const editPage = () => import('./edit/customer-edit.page').then((m) => m.CustomerEditPage);

/**
 * Store của màn hình KHÔNG khai báo ở `providers` của route: Angular giữ injector của route suốt
 * vòng đời ứng dụng (không huỷ khi rời trang) → store sẽ giữ dữ liệu cũ. Khai báo ở `providers`
 * của component trang để store sống và chết cùng màn hình.
 */
export const CUSTOMER_ROUTES: Routes = [
  {
    path: '',
    title: 'Khách hàng',
    loadComponent: () => import('./list/customer-list.page').then((m) => m.CustomerListPage),
  },
  {
    path: 'new',
    title: 'Khách hàng mới',
    loadComponent: editPage,
    canActivate: [canCreate],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: ':id',
    title: 'Khách hàng',
    loadComponent: editPage,
    canDeactivate: [unsavedChangesGuard],
  },
];
