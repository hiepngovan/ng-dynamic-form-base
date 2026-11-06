import { updateState } from '@angular-architects/ngrx-toolkit';
import { signalStoreFeature, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, firstValueFrom, Observable, pipe, switchMap, tap } from 'rxjs';
import { toApiError } from './api-error.interceptor';
import { ApiError, isApiError } from './models';

export interface DetailConfig<T, ID> {
  /** Trả về hàm tải theo id. Được gọi trong injection context. */
  load: () => (id: ID) => Observable<T>;
  /** Trả về hàm lưu: id = null → tạo mới. Kết quả trả về là bản ghi đã lưu (có id). */
  save: () => (value: T, id: ID | null) => Observable<T>;
}

export interface DetailState<T, ID> {
  id: ID | null;
  entity: T | null;
  loading: boolean;
  saving: boolean;
  error: ApiError | null;
}

/**
 * Khối dựng sẵn cho màn hình xem / sửa một bản ghi.
 * save() trả về Promise và NÉM ApiError khi lỗi → màn hình bắt lỗi 400 để gắn vào form:
 *   try { await store.save(v) } catch (e) { if (e.fieldErrors) form.setServerErrors(e.fieldErrors) }
 */
export function withDetail<T extends { id?: ID | null }, ID = string>(config: DetailConfig<T, ID>) {
  return signalStoreFeature(
    withState<DetailState<T, ID>>({
      id: null,
      entity: null,
      loading: false,
      saving: false,
      error: null,
    }),
    withMethods((store) => {
      const load = config.load();
      const save = config.save();
      return {
        load: rxMethod<ID>(
          pipe(
            tap((id) => updateState(store, 'detail: load', { id, loading: true, error: null })),
            switchMap((id) =>
              load(id).pipe(
                tap((entity) => updateState(store, 'detail: loaded', { entity, loading: false })),
                catchError((e: unknown) => {
                  const error = isApiError(e) ? e : toApiError(e);
                  updateState(store, 'detail: error', { entity: null, loading: false, error });
                  return EMPTY;
                }),
              ),
            ),
          ),
        ),
        async save(value: T): Promise<T> {
          updateState(store, 'detail: save', { saving: true, error: null });
          try {
            const saved = await firstValueFrom(save(value, store.id()));
            updateState(store, 'detail: saved', {
              entity: saved,
              id: saved.id ?? store.id(),
              saving: false,
            });
            return saved;
          } catch (e) {
            const error = isApiError(e) ? e : toApiError(e);
            updateState(store, 'detail: save error', { saving: false, error });
            throw error;
          }
        },
        /** Về trạng thái "tạo mới". */
        reset() {
          updateState(store, 'detail: reset', { id: null, entity: null, error: null });
        },
      };
    }),
  );
}
