import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AppStore } from './app.store';

/**
 * Gắn danh tính người dùng vào mọi request /api.
 * MOCK: chưa có đăng nhập nên gửi tên + vai trò (mock backend ghi vào lịch sử xử lý).
 * Khi có SSO/JWT: thay bằng `Authorization: Bearer <token>`, server tự biết người dùng.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) return next(req);
  const { name, role } = inject(AppStore).user();
  // Header chỉ nhận ký tự ASCII → mã hoá tên tiếng Việt.
  return next(req.clone({ setHeaders: { 'X-User': encodeURIComponent(name), 'X-Role': role } }));
};
