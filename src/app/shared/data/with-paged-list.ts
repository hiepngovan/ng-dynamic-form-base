import { computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { updateState } from '@angular-architects/ngrx-toolkit';
import { signalStoreFeature, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  catchError,
  distinctUntilChanged,
  EMPTY,
  map,
  Observable,
  pipe,
  switchMap,
  tap,
} from 'rxjs';
import { toApiError } from './api-error.interceptor';
import { ApiError, Filter, isApiError, Page, PageQuery, Sort } from './models';
import { fromParams, toParams } from './query-params';

export interface PagedListConfig<T, F extends Filter> {
  /** Trả về hàm tải một trang. Được gọi trong injection context → dùng inject() bên trong được. */
  loader: () => (query: PageQuery<F>) => Observable<Page<T>>;
  /** Bộ lọc mặc định, đồng thời là danh sách key lọc (chỉ các key này được đọc từ URL). */
  filter: F;
  pageSize?: number;
  sort?: Sort | null;
  /**
   * Đồng bộ trang / sắp xếp / bộ lọc với query param của URL: F5, gửi link, nút Back đều giữ
   * đúng trạng thái. Khi bật, URL là nguồn sự thật: setPage / setFilter… đổi URL, URL đổi thì tải.
   */
  syncUrl?: boolean;
}

export interface PagedListState<T, F extends Filter> extends PageQuery<F> {
  items: T[];
  total: number;
  loading: boolean;
  error: ApiError | null;
}

/**
 * Khối dựng sẵn cho MỌI màn hình danh sách: phân trang, sắp xếp, lọc phía server.
 * Tải lại hủy request cũ (switchMap) → không bị kết quả cũ về sau ghi đè kết quả mới.
 *
 * @example
 * signalStore(withPagedList({ loader: () => { const api = inject(CustomerApi); return (q) => api.search(q); },
 *                             filter: { q: null, status: null }, syncUrl: true }))
 */
export function withPagedList<T, F extends Filter>(config: PagedListConfig<T, F>) {
  const defaults: PageQuery<F> = {
    page: 0,
    size: config.pageSize ?? 20,
    sort: config.sort ?? null,
    filter: config.filter,
  };

  return signalStoreFeature(
    withState<PagedListState<T, F>>({
      ...defaults,
      items: [],
      total: 0,
      loading: false,
      error: null,
    }),
    withComputed(({ page, size, sort, filter, total }) => ({
      query: computed<PageQuery<F>>(() => ({
        page: page(),
        size: size(),
        sort: sort(),
        filter: filter(),
      })),
      pageCount: computed(() => Math.ceil(total() / size())),
      /** Đang lọc khác mặc định (để hiện nút "Xoá lọc"). */
      filtered: computed(() => JSON.stringify(filter()) !== JSON.stringify(config.filter)),
    })),
    withMethods((store) => {
      const load = config.loader();
      const router = config.syncUrl ? inject(Router) : null;
      const route = config.syncUrl ? inject(ActivatedRoute, { optional: true }) : null;

      const fetch = rxMethod<PageQuery<F>>(
        pipe(
          tap((q) => updateState(store, 'list: load', { ...q, loading: true, error: null })),
          switchMap((q) =>
            load(q).pipe(
              tap((p) =>
                updateState(store, 'list: loaded', {
                  items: p.items,
                  total: p.total,
                  loading: false,
                }),
              ),
              catchError((e: unknown) => {
                const error = isApiError(e) ? e : toApiError(e);
                updateState(store, 'list: error', { items: [], total: 0, loading: false, error });
                return EMPTY;
              }),
            ),
          ),
        ),
      );

      const go = (patch: Partial<PageQuery<F>>) => {
        const q = { ...store.query(), ...patch };
        if (router) void router.navigate([], { relativeTo: route, queryParams: toParams(q) });
        else fetch(q);
      };

      return {
        /** Nội bộ (tiền tố _ → không lộ ra ngoài store). */
        _fetch: fetch,
        /** Đổi trang / số dòng / sắp xếp cùng lúc (sự kiện của bảng). */
        changePage(change: { page: number; size: number; sort: Sort | null }) {
          go(change);
        },
        setFilter(filter: Partial<F>) {
          go({ filter: { ...store.filter(), ...filter }, page: 0 });
        },
        resetFilter() {
          go({ filter: config.filter, page: 0 });
        },
        /** Tải lại đúng trang hiện tại (vd sau khi xoá). */
        reload() {
          fetch(store.query());
        },
      };
    }),
    withHooks((store) => {
      const route = config.syncUrl ? inject(ActivatedRoute) : null;
      const destroyRef = inject(DestroyRef);
      return {
        onInit() {
          if (!route) return store.reload();
          route.queryParamMap
            .pipe(
              map((pm) =>
                fromParams(Object.fromEntries(pm.keys.map((k) => [k, pm.get(k)!])), defaults),
              ),
              distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
              takeUntilDestroyed(destroyRef),
            )
            .subscribe((q) => store._fetch(q));
        },
      };
    }),
  );
}
