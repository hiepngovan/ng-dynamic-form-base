import { inject } from '@angular/core';
import { signalStore } from '@ngrx/signals';
import { withDetail, withStoreDevtools } from '../../../shared/data';
import { CustomerApi } from '../customer.api';
import { Customer } from '../customer.model';

/** Store của MÀN HÌNH xem / sửa một khách hàng (khai báo trong providers của CustomerEditPage). */
export const CustomerDetailStore = signalStore(
  withDetail<Partial<Customer>>({
    load: () => {
      const api = inject(CustomerApi);
      return (id) => api.get(id);
    },
    save: () => {
      const api = inject(CustomerApi);
      return (value, id) => api.save(value, id);
    },
  }),
  withStoreDevtools('customerDetail'),
);
