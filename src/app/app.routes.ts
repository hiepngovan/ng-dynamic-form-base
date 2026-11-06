import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'customers' },
  {
    path: 'customers',
    loadChildren: () =>
      import('./features/customer/customer.routes').then((m) => m.CUSTOMER_ROUTES),
  },
  {
    path: 'loans',
    loadChildren: () => import('./features/loan/loan.routes').then((m) => m.LOAN_ROUTES),
  },
  { path: '**', redirectTo: 'customers' },
];
