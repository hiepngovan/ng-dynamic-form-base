import { updateState } from '@angular-architects/ngrx-toolkit';
import { signalStoreFeature, type, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom, Observable } from 'rxjs';
import { DetailState, isApiError, toApiError } from '../data';

export interface WorkflowConfig<T, ID> {
  /** Trả về hàm gọi API chuyển trạng thái. Server trả về bản ghi sau khi chuyển. */
  transition: () => (id: ID, action: string, comment: string | null) => Observable<T>;
}

/**
 * Thêm thao tác chuyển trạng thái (gửi duyệt, duyệt, trả lại...) cho store chi tiết.
 * PHẢI đặt sau withDetail (dùng chung id / entity / error).
 *
 * @example
 * signalStore(withDetail({...}), withWorkflow({ transition: () => { const api = inject(LoanApi); return (id, a, c) => api.transition(id, a, c); } }))
 * await store.act('approve', 'Đồng ý');   // lỗi → NÉM ApiError (giống save)
 */
export function withWorkflow<T extends { id?: ID | null }, ID = string>(
  config: WorkflowConfig<T, ID>,
) {
  return signalStoreFeature(
    { state: type<DetailState<T, ID>>() },
    withState({ acting: null as string | null }),
    withMethods((store) => {
      const transition = config.transition();
      return {
        async act(action: string, comment: string | null = null): Promise<T> {
          const id = store.id();
          if (id === null) throw new Error('withWorkflow: bản ghi chưa được lưu');
          updateState(store, `workflow: ${action}`, { acting: action, error: null });
          try {
            const entity = await firstValueFrom(transition(id, action, comment));
            updateState(store, 'workflow: done', { entity, acting: null });
            return entity;
          } catch (e) {
            const error = isApiError(e) ? e : toApiError(e);
            updateState(store, 'workflow: error', { acting: null, error });
            throw error;
          }
        },
      };
    }),
  );
}
