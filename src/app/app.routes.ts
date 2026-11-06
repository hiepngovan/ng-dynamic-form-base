import { Routes } from '@angular/router';
import { unsavedChangesGuard } from './shared/dynamic-form';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/customer/customer-edit.page').then((m) => m.CustomerEditPage),
    canDeactivate: [unsavedChangesGuard],
  },
  { path: '**', redirectTo: '' },
];
