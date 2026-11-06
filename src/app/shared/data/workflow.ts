import { Severity } from './models';

export interface WorkflowState {
  label: string;
  severity?: Severity;
  /** Ở trạng thái này người lập được sửa nội dung bản ghi. */
  editable?: boolean;
}

export interface WorkflowAction<S extends string, P extends string> {
  label: string;
  /** Các trạng thái được phép thực hiện thao tác. */
  from: S[];
  /** Trạng thái sau khi thực hiện. */
  to: S;
  /** Quyền cần có. Không khai báo = ai xem được bản ghi cũng làm được. */
  permission?: P;
  /** Ý kiến kèm theo: bắt buộc (trả lại, từ chối) / không bắt buộc. Không khai báo = không hỏi. */
  comment?: 'required' | 'optional';
  /** Câu hỏi xác nhận trước khi thực hiện (thao tác không hoàn tác được). */
  confirm?: string;
  /** Phải lưu và hợp lệ toàn bộ form trước khi thực hiện (vd Gửi duyệt). */
  requiresValidForm?: boolean;
  icon?: string;
  severity?: Severity;
}

/**
 * Quy trình xử lý một loại bản ghi: các trạng thái + các thao tác chuyển trạng thái.
 * Khai báo MỘT LẦN (cùng file model của feature), dùng cho: nhãn / màu trạng thái trên bảng,
 * nút thao tác theo trạng thái + quyền, khoá form theo trạng thái, kiểm tra ở mock backend.
 * Server vẫn là nơi kiểm tra cuối cùng; khai báo phía client chỉ để hiển thị đúng.
 */
export interface Workflow<S extends string, A extends string, P extends string = string> {
  states: Record<S, WorkflowState>;
  actions: Record<A, WorkflowAction<S, P>>;
}

export const defineWorkflow = <S extends string, A extends string, P extends string = string>(
  w: Workflow<S, A, P>,
): Workflow<S, A, P> => w;

/** Một dòng lịch sử xử lý (server ghi). */
export interface WorkflowEvent {
  at: Date;
  by: string;
  action: string;
  from: string | null;
  to: string;
  comment?: string | null;
}

export type AvailableAction<S extends string, A extends string, P extends string> = WorkflowAction<
  S,
  P
> & { key: A };

/** Thao tác làm được với bản ghi ở trạng thái `status`, theo quyền của người dùng. */
export function availableActions<S extends string, A extends string, P extends string>(
  w: Workflow<S, A, P>,
  status: S | null | undefined,
  can: (permission: P) => boolean = () => true,
): AvailableAction<S, A, P>[] {
  if (!status) return [];
  return (Object.entries(w.actions) as [A, WorkflowAction<S, P>][])
    .filter(([, a]) => a.from.includes(status) && (!a.permission || can(a.permission)))
    .map(([key, a]) => ({ ...a, key }));
}

/** Bản ghi mới (chưa có trạng thái) hoặc trạng thái editable. */
export function isEditable<S extends string>(
  w: Workflow<S, string, string>,
  status: S | null | undefined,
): boolean {
  return !status || !!w.states[status]?.editable;
}
