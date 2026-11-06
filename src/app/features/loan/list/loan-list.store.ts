import { inject } from '@angular/core';
import { signalStore } from '@ngrx/signals';
import { withPagedList, withStoreDevtools } from '../../../shared/data';
import { LoanApi } from '../loan.api';
import { EMPTY_LOAN_FILTER, LoanRow } from '../loan.model';

/** Store của màn hình danh sách hồ sơ vay (providers của LoanListPage). */
export const LoanListStore = signalStore(
  withPagedList<LoanRow, typeof EMPTY_LOAN_FILTER>({
    loader: () => {
      const api = inject(LoanApi);
      return (q) => api.search(q);
    },
    filter: EMPTY_LOAN_FILTER,
    pageSize: 10,
    sort: { field: 'updatedAt', order: 'desc' },
    syncUrl: true,
  }),
  withStoreDevtools('loanList'),
);
