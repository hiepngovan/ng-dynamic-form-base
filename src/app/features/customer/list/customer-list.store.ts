import { inject } from '@angular/core';
import { signalStore, withMethods } from '@ngrx/signals';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { withPagedList, withSelection, withStoreDevtools } from '../../../shared/data';
import { CustomerApi } from '../customer.api';
import { CustomerRow, EMPTY_CUSTOMER_FILTER } from '../customer.model';

/**
 * Store của MÀN HÌNH danh sách khách hàng. Khai báo trong `providers` của CustomerListPage →
 * mỗi lần vào màn hình là một bản mới, rời màn hình thì huỷ. Component con (bộ lọc, bảng)
 * inject thẳng store này, không truyền dữ liệu qua nhiều cấp.
 */
export const CustomerListStore = signalStore(
  withPagedList<CustomerRow, typeof EMPTY_CUSTOMER_FILTER>({
    loader: () => {
      const api = inject(CustomerApi);
      return (q) => api.search(q);
    },
    filter: EMPTY_CUSTOMER_FILTER,
    pageSize: 10,
    sort: { field: 'createdAt', order: 'desc' },
    syncUrl: true,
  }),
  withSelection<string>(),
  withMethods((store, api = inject(CustomerApi), toast = inject(MessageService)) => ({
    async deleteSelected(): Promise<void> {
      const ids = store.selectedIds();
      try {
        await firstValueFrom(api.delete(ids));
      } catch {
        return; // interceptor đã hiện thông báo lỗi
      }
      store.clearSelection();
      store.reload();
      toast.add({ severity: 'success', summary: `Đã xoá ${ids.length} khách hàng` });
    },
  })),
  withStoreDevtools('customerList'),
);
