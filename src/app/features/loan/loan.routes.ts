import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AppStore } from '../../core/app.store';
import { unsavedChangesGuard } from '../../shared/dynamic-form';

/** Không đủ quyền → về danh sách (thay vì trang trắng khi mở thẳng URL / F5). */
const canCreate = () =>
  inject(AppStore).can('loan.edit') || inject(Router).createUrlTree(['/loans']);

const editPage = () => import('./edit/loan-edit.page').then((m) => m.LoanEditPage);

/** Store của màn hình khai báo trong providers của component trang (xem customer.routes.ts). */
export const LOAN_ROUTES: Routes = [
  {
    path: '',
    title: 'Hồ sơ vay',
    loadComponent: () => import('./list/loan-list.page').then((m) => m.LoanListPage),
  },
  {
    path: 'new',
    title: 'Hồ sơ vay mới',
    loadComponent: editPage,
    canActivate: [canCreate],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: ':id',
    title: 'Hồ sơ vay',
    loadComponent: editPage,
    canDeactivate: [unsavedChangesGuard],
  },
];
