import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { from, Observable, of, throwError, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { Customer } from '../features/customer/customer.model';

/**
 * MOCK BACKEND — thay cho server thật trong PoC (bỏ khỏi app.config khi có API).
 * Dữ liệu đi qua JSON như thật (ngày thành chuỗi) để lớp API phải chuyển đổi đúng.
 *
 * Kịch bản thử lỗi:
 *  - Lưu khách hàng có SĐT 0900000000 → 400 kèm lỗi theo field.
 *  - Tìm với từ khoá "loi500" → 500 (toast lỗi hệ thống, bảng hiện trạng thái lỗi).
 */
export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) return next(req);
  // Dữ liệu giả tải lười → không nằm trong bundle ban đầu.
  return from(import('./mock-db')).pipe(
    mergeMap((m) => {
      mockDb ??= m;
      db ??= m.seedCustomers();
      return timer(LATENCY);
    }),
    mergeMap(() => handle(req)),
  );
};

const LATENCY = 350;
let mockDb: typeof import('./mock-db') | null = null;
let db: Customer[] | null = null;
const table = () => db!;
const toRow = (c: Customer) => mockDb!.toRow(c);

function handle(req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
  const [, , resource, id] = req.url.split('/'); // '', 'api', 'customers', ':id'
  if (resource !== 'customers') return fail(404, 'Không tìm thấy API');

  switch (req.method) {
    case 'GET':
      return id ? getOne(id) : search(req);
    case 'POST':
      return save(req.body as Customer, null);
    case 'PUT':
      return save(req.body as Customer, id);
    case 'DELETE': {
      const ids = new Set((req.params.get('ids') ?? '').split(','));
      db = table().filter((c) => !ids.has(c.id!));
      return ok(null);
    }
    default:
      return fail(405, 'Method không hỗ trợ');
  }
}

function search(req: HttpRequest<unknown>) {
  const p = (k: string) => req.params.get(k);
  const q = normalize(p('q') ?? '');
  if (q === 'loi500') return fail(500, 'Máy chủ gặp sự cố khi tìm kiếm (giả lập)');

  let rows = table()
    .filter((c) => !q || normalize(`${c.code} ${c.fullName} ${c.phone}`).includes(q))
    .filter((c) => !p('customerType') || c.customerType === p('customerType'))
    .filter((c) => !p('status') || c.status === p('status'))
    .filter((c) => !p('provinceId') || c.provinceId === p('provinceId'))
    .map(toRow);

  const [field, order] = (p('sort') ?? 'createdAt,desc').split(',') as [
    keyof (typeof rows)[0],
    string,
  ];
  const dir = order === 'desc' ? -1 : 1;
  rows = [...rows].sort((a, b) => {
    const x = a[field] ?? '';
    const y = b[field] ?? '';
    return (x < y ? -1 : x > y ? 1 : 0) * dir;
  });

  const page = Math.max(Number(p('page') ?? 1) - 1, 0);
  const size = Number(p('size') ?? 20);
  return ok({ items: rows.slice(page * size, page * size + size), total: rows.length });
}

function getOne(id: string) {
  const c = table().find((x) => x.id === id);
  return c ? ok(c) : fail(404, `Không tìm thấy khách hàng ${id}`);
}

function save(body: Customer, id: string | null) {
  if (body.phone === '0900000000') {
    return fail(400, 'Dữ liệu không hợp lệ', {
      phone: 'Số điện thoại đã được đăng ký cho khách hàng khác',
    });
  }
  if (id) {
    const i = table().findIndex((c) => c.id === id);
    if (i < 0) return fail(404, `Không tìm thấy khách hàng ${id}`);
    const updated = { ...table()[i], ...body, id };
    db = table().map((c, j) => (j === i ? updated : c));
    return ok(updated);
  }
  const created = {
    ...body,
    id: `c${Date.now()}`,
    code: body.code || `KH${String(Date.now()).slice(-6)}`,
    status: body.status ?? 'ACTIVE',
    createdAt: new Date(),
  } as Customer;
  db = [created, ...table()];
  return ok(created);
}

/** Đi qua JSON như dữ liệu thật trên mạng. */
const wire = <T>(v: T): T => (v === null ? v : JSON.parse(JSON.stringify(v)));
const ok = (body: unknown) => of(new HttpResponse({ status: 200, body: wire(body) }));
const fail = (status: number, message: string, fieldErrors?: Record<string, string>) =>
  throwError(() => new HttpErrorResponse({ status, error: { message, fieldErrors } }));

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
