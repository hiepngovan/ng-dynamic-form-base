import { Component, inject, Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { patchState, signalStore } from '@ngrx/signals';
import { Subject } from 'rxjs';
import { Page, PageQuery } from './models';
import { withPagedList } from './with-paged-list';
import { withSelection } from './with-selection';

interface Row {
  id: string;
}
interface F {
  [k: string]: string | null;
  q: string | null;
}

/** Loader giả: mỗi lần gọi trả về một Subject → test tự quyết định khi nào / thứ tự trả kết quả. */
@Injectable()
class FakeApi {
  readonly calls: { q: PageQuery<F>; res: Subject<Page<Row>> }[] = [];
  search(q: PageQuery<F>) {
    const res = new Subject<Page<Row>>();
    this.calls.push({ q, res });
    return res;
  }
  last() {
    return this.calls[this.calls.length - 1];
  }
}

const rows = (...ids: string[]): Page<Row> => ({ items: ids.map((id) => ({ id })), total: 42 });

const config = (syncUrl = false) => ({
  loader: () => {
    const api = inject(FakeApi);
    return (q: PageQuery<F>) => api.search(q);
  },
  filter: { q: null } as F,
  pageSize: 10,
  syncUrl,
});

const ListStore = signalStore(withPagedList<Row, F>(config()), withSelection());

describe('withPagedList', () => {
  let api: FakeApi;
  let store: InstanceType<typeof ListStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [FakeApi, ListStore] });
    api = TestBed.inject(FakeApi);
    store = TestBed.inject(ListStore);
  });

  it('tự tải trang đầu khi khởi tạo; loading bật rồi tắt', () => {
    expect(api.calls).toHaveLength(1);
    expect(api.last().q).toEqual({ page: 0, size: 10, sort: null, filter: { q: null } });
    expect(store.loading()).toBe(true);

    api.last().res.next(rows('a', 'b'));
    expect(store.loading()).toBe(false);
    expect(store.items().map((r) => r.id)).toEqual(['a', 'b']);
    expect(store.total()).toBe(42);
    expect(store.pageCount()).toBe(5);
  });

  it('đổi bộ lọc → về trang đầu; filtered bật', () => {
    store.changePage({ page: 3, size: 10, sort: null });
    store.setFilter({ q: 'an' });
    expect(api.last().q.page).toBe(0);
    expect(api.last().q.filter).toEqual({ q: 'an' });
    expect(store.filtered()).toBe(true);
    store.resetFilter();
    expect(store.filtered()).toBe(false);
  });

  it('kết quả của request cũ về sau KHÔNG ghi đè kết quả mới (huỷ request cũ)', () => {
    const first = api.last();
    store.setFilter({ q: 'moi' });
    const second = api.last();

    second.res.next(rows('moi'));
    first.res.next(rows('cu')); // về muộn
    expect(store.items().map((r) => r.id)).toEqual(['moi']);
  });

  it('lỗi → state error, xoá dữ liệu cũ; reload thì hết lỗi', () => {
    api.last().res.next(rows('a'));
    store.reload();
    api.last().res.error({ status: 500, message: 'Lỗi hệ thống' });
    expect(store.error()).toEqual({ status: 500, message: 'Lỗi hệ thống' });
    expect(store.items()).toEqual([]);
    expect(store.loading()).toBe(false);

    store.reload();
    expect(store.error()).toBeNull();
  });

  it('state chỉ sửa được bên trong store (kiểm tra lúc compile)', () => {
    // Lúc compile: ngoài store không patchState / set được (bỏ bảo vệ → 2 dòng dưới hết lỗi → test không build).
    // @ts-expect-error store không phải WritableStateSource
    const patchFromOutside = () => patchState(store, { items: [] });
    // @ts-expect-error signal của state chỉ có kiểu Signal (không có set)
    const setFromOutside = () => store.items.set([]);
    expect([patchFromOutside, setFromOutside]).toHaveLength(2);
    // Lưu ý: NgRx 21 KHÔNG đóng băng object trong state lúc chạy → đừng truyền object của store
    // cho code sửa trực tiếp (vd model của Formly) — luôn đưa bản sao (xem CustomerEditPage).
  });

  it('chọn nhiều dòng', () => {
    store.toggle('a');
    store.toggle('b');
    store.toggle('a');
    expect(store.selectedIds()).toEqual(['b']);
    expect(store.selectedCount()).toBe(1);
    store.clearSelection();
    expect(store.selectedCount()).toBe(0);
  });
});

const UrlStore = signalStore(withPagedList<Row, F>(config(true)));

@Component({ template: '', providers: [UrlStore] })
class ListHost {
  readonly store = inject(UrlStore);
}

describe('withPagedList — đồng bộ URL', () => {
  it('đọc trạng thái từ URL; đổi trang → đổi URL → tải', async () => {
    TestBed.configureTestingModule({
      providers: [FakeApi, provideRouter([{ path: 'list', component: ListHost }])],
    });
    const api = TestBed.inject(FakeApi);
    const harness = await RouterTestingHarness.create();
    const host = await harness.navigateByUrl(
      '/list?page=3&size=20&sort=code,asc&q=an&x=1',
      ListHost,
    );

    expect(api.last().q).toEqual({
      page: 2,
      size: 20,
      sort: { field: 'code', order: 'asc' },
      filter: { q: 'an' }, // key lạ (x) bị bỏ qua
    });

    host.store.changePage({ page: 4, size: 20, sort: null });
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/list?page=5&size=20&q=an');
    expect(api.last().q.page).toBe(4);
    expect(api.calls).toHaveLength(2);
  });
});
