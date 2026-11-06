import { HttpInterceptorFn } from '@angular/common/http';
import { from, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

/**
 * MOCK BACKEND — thay cho server thật trong PoC (bỏ khỏi app.config khi có API).
 * "Server" và dữ liệu mẫu (mock-api.ts) được tải lười → không nằm trong bundle ban đầu.
 */
const LATENCY = 350;

export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) return next(req);
  return from(import('./mock-api')).pipe(
    mergeMap((api) => timer(LATENCY).pipe(mergeMap(() => api.handle(req)))),
  );
};
