import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { PageQuery } from '../../../shared/data';
import { CustomerApi } from '../customer.api';
import { CustomerFilter } from '../customer.model';
import { CustomerListStore } from './customer-list.store';

/** Ví dụ test store của màn hình: thay API bằng bản giả, không render UI. */
describe('CustomerListStore', () => {
  let searches: PageQuery<CustomerFilter>[];
  let deleted: string[][];
  let failDelete: boolean;

  const setup = () => {
    searches = [];
    deleted = [];
    const api: Partial<CustomerApi> = {
      search: (q) => {
        searches.push(q);
        return of({ items: [], total: 0 });
      },
      delete: (ids) => {
        deleted.push(ids);
        return failDelete ? throwError(() => ({ status: 500, message: 'x' })) : of(undefined);
      },
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        MessageService,
        CustomerListStore,
        { provide: CustomerApi, useValue: api },
      ],
    });
    return TestBed.inject(CustomerListStore);
  };

  beforeEach(() => (failDelete = false));

  it('tải trang đầu theo mặc định: 10 dòng, mới nhất trước', () => {
    setup();
    expect(searches[0]).toMatchObject({
      page: 0,
      size: 10,
      sort: { field: 'createdAt', order: 'desc' },
    });
  });

  it('xoá các dòng đã chọn → gọi API, bỏ chọn, tải lại', async () => {
    const store = setup();
    store.setSelected(['c1', 'c2']);
    await store.deleteSelected();
    expect(deleted).toEqual([['c1', 'c2']]);
    expect(store.selectedCount()).toBe(0);
    expect(searches).toHaveLength(2);
  });

  it('xoá lỗi → giữ nguyên lựa chọn, không tải lại', async () => {
    failDelete = true;
    const store = setup();
    store.setSelected(['c1']);
    await store.deleteSelected();
    expect(store.selectedIds()).toEqual(['c1']);
    expect(searches).toHaveLength(1);
  });
});
