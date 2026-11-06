import { inject } from '@angular/core';
import { signalStore } from '@ngrx/signals';
import { withDetail, withStoreDevtools } from '../../../shared/data';
import { withWorkflow } from '../../../shared/workflow';
import { LoanApi } from '../loan.api';
import { LoanAction, LoanApplication } from '../loan.model';

/** Store của màn hình xem / sửa / xử lý một hồ sơ vay (providers của LoanEditPage). */
export const LoanDetailStore = signalStore(
  withDetail<Partial<LoanApplication>>({
    load: () => {
      const api = inject(LoanApi);
      return (id) => api.get(id);
    },
    save: () => {
      const api = inject(LoanApi);
      return (value, id) => api.save(value, id);
    },
  }),
  withWorkflow<Partial<LoanApplication>>({
    transition: () => {
      const api = inject(LoanApi);
      return (id, action, comment) => api.transition(id, action as LoanAction, comment);
    },
  }),
  withStoreDevtools('loanDetail'),
);
