import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';
import { ApiError } from './models';

/**
 * Chuẩn hoá MỌI lỗi HTTP thành ApiError và hiện thông báo cho các lỗi chung.
 * - 400 (lỗi validate): KHÔNG hiện toast — nơi gọi gắn lỗi vào form (setServerErrors).
 * - Còn lại (mất mạng, 401/403, 404, 5xx): hiện toast một chỗ, màn hình không phải tự xử lý.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(MessageService);
  return next(req).pipe(
    catchError((e: unknown) => {
      const err = toApiError(e);
      if (err.status !== 400) {
        toast.add({ severity: 'error', summary: TITLES[err.status] ?? 'Lỗi', detail: err.message });
      }
      return throwError(() => err);
    }),
  );
};

const TITLES: Record<number, string> = {
  0: 'Mất kết nối',
  401: 'Hết phiên đăng nhập',
  403: 'Không có quyền',
  404: 'Không tìm thấy',
  500: 'Lỗi hệ thống',
};

export function toApiError(e: unknown): ApiError {
  if (e instanceof HttpErrorResponse) {
    const body = (e.error ?? {}) as Partial<ApiError>;
    return {
      status: e.status,
      message:
        body.message ??
        (e.status === 0 ? 'Không kết nối được tới máy chủ' : `Yêu cầu thất bại (${e.status})`),
      fieldErrors: body.fieldErrors,
    };
  }
  return { status: -1, message: e instanceof Error ? e.message : 'Lỗi không xác định' };
}
