import {
  HttpErrorResponse,
  HttpEvent,
  HttpEventType,
  HttpProgressEvent,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { concat, Observable, of, throwError, timer } from 'rxjs';
import { map } from 'rxjs/operators';
import { Customer } from '../features/customer/customer.model';
import { LOAN_WORKFLOW, LoanAction, LoanApplication, LoanRow } from '../features/loan/loan.model';
import { availableActions, isEditable } from '../shared/data';
import { FileRef } from '../shared/dynamic-form';
import { seedCustomers, toRow } from './mock-db';
import { CATEGORIES, packagesOf, productName, PRODUCTS, seedLoans } from './loan-db';

/**
 * "Server" giả: định tuyến theo /api/<resource>/<id>/<sub>. Nạp lười cùng dữ liệu mẫu
 * (xem mock-backend.interceptor.ts). Dữ liệu đi qua JSON như thật (ngày thành chuỗi).
 *
 * Kịch bản thử lỗi:
 *  - Lưu khách hàng có SĐT 0900000000 → 400 kèm lỗi theo field.
 *  - Tìm khách hàng với từ khoá "loi500" → 500.
 *  - Tải tệp có tên chứa "loi" → 500 (tải lên thất bại).
 *  - Gửi duyệt hồ sơ thiếu CCCD / ngày giải ngân ở quá khứ → 400 theo field (server kiểm tra lại).
 *  - Sửa hồ sơ không ở trạng thái sửa được → 409; thao tác không đúng vai trò → 403.
 */
let customers: Customer[] = seedCustomers();
let loans: LoanApplication[] = seedLoans(customers);

export function handle(req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
  const [, , resource, id, sub] = req.url.split('/'); // '', 'api', resource, id, sub
  switch (resource) {
    case 'customers':
      return customersApi(req, id);
    case 'loans':
      return loansApi(req, id, sub);
    case 'catalog':
      return catalogApi(req, id);
    case 'files':
      return req.method === 'POST' ? upload(req) : fail(405, 'Method không hỗ trợ');
    default:
      return fail(404, 'Không tìm thấy API');
  }
}

// ───────────── Khách hàng ─────────────

function customersApi(req: HttpRequest<unknown>, id: string | undefined) {
  switch (req.method) {
    case 'GET': {
      if (id) {
        const c = customers.find((x) => x.id === id);
        return c ? ok(c) : fail(404, `Không tìm thấy khách hàng ${id}`);
      }
      const p = (k: string) => req.params.get(k);
      const q = normalize(p('q') ?? '');
      if (q === 'loi500') return fail(500, 'Máy chủ gặp sự cố khi tìm kiếm (giả lập)');
      const rows = customers
        .filter((c) => !q || normalize(`${c.code} ${c.fullName} ${c.phone}`).includes(q))
        .filter((c) => !p('customerType') || c.customerType === p('customerType'))
        .filter((c) => !p('status') || c.status === p('status'))
        .filter((c) => !p('provinceId') || c.provinceId === p('provinceId'))
        .map(toRow);
      return ok(paginate(req, rows, 'createdAt,desc'));
    }
    case 'POST':
    case 'PUT':
      return saveCustomer(req.body as Customer, id ?? null);
    case 'DELETE': {
      const ids = new Set((req.params.get('ids') ?? '').split(','));
      customers = customers.filter((c) => !ids.has(c.id!));
      return ok(null);
    }
    default:
      return fail(405, 'Method không hỗ trợ');
  }
}

function saveCustomer(body: Customer, id: string | null) {
  if (body.phone === '0900000000') {
    return fail(400, 'Dữ liệu không hợp lệ', {
      phone: 'Số điện thoại đã được đăng ký cho khách hàng khác',
    });
  }
  if (id) {
    const current = customers.find((c) => c.id === id);
    if (!current) return fail(404, `Không tìm thấy khách hàng ${id}`);
    const updated = { ...current, ...body, id };
    customers = customers.map((c) => (c.id === id ? updated : c));
    return ok(updated);
  }
  const created = {
    ...body,
    id: `c${Date.now()}`,
    code: body.code || `KH${String(Date.now()).slice(-6)}`,
    status: body.status ?? 'ACTIVE',
    createdAt: new Date(),
  } as Customer;
  customers = [created, ...customers];
  return ok(created);
}

// ───────────── Hồ sơ vay ─────────────

function loansApi(req: HttpRequest<unknown>, id: string | undefined, sub: string | undefined) {
  const user = userOf(req);
  if (req.method === 'GET' && !id) {
    const p = (k: string) => req.params.get(k);
    const q = normalize(p('q') ?? '');
    const rows = loans
      .filter((l) => !q || normalize(`${l.code} ${l.customerName}`).includes(q))
      .filter((l) => !p('status') || l.status === p('status'))
      .filter((l) => !p('categoryId') || l.categoryId === p('categoryId'))
      .map(loanRow);
    return ok(paginate(req, rows, 'updatedAt,desc'));
  }
  if (req.method === 'POST' && !id) {
    const now = new Date();
    const created: LoanApplication = {
      ...(req.body as LoanApplication),
      ...derived(req.body as LoanApplication),
      id: `L${Date.now()}`,
      code: `HS${String(Date.now()).slice(-6)}`,
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
      history: [{ at: now, by: user.name, action: 'create', from: null, to: 'DRAFT' }],
    };
    loans = [created, ...loans];
    return ok(created);
  }

  const loan = loans.find((l) => l.id === id);
  if (!loan) return fail(404, `Không tìm thấy hồ sơ ${id}`);

  if (req.method === 'GET') return ok(loan);
  if (req.method === 'PUT') {
    if (!isEditable(LOAN_WORKFLOW, loan.status)) {
      const label = LOAN_WORKFLOW.states[loan.status!].label;
      return fail(409, `Hồ sơ đang ở trạng thái "${label}", không sửa được`);
    }
    const body = req.body as LoanApplication;
    return ok(update(loan.id!, { ...body, ...derived(body), updatedAt: new Date() }));
  }
  if (req.method === 'POST' && sub === 'actions') {
    const { action, comment } = req.body as { action: LoanAction; comment: string | null };
    return transition(loan, action, comment, user);
  }
  return fail(405, 'Method không hỗ trợ');
}

function transition(
  loan: LoanApplication,
  action: LoanAction,
  comment: string | null,
  user: { name: string; role: string },
) {
  const def = LOAN_WORKFLOW.actions[action];
  if (!def) return fail(400, `Thao tác không hợp lệ: ${action}`);
  // Quyền theo vai trò (server thật đọc từ token).
  const can = (p: string) =>
    p === 'loan.approve' ? user.role === 'MANAGER' : user.role === 'STAFF';
  if (!def.permission || !can(def.permission)) {
    return fail(403, `Bạn không có quyền "${def.label}"`);
  }
  if (!availableActions(LOAN_WORKFLOW, loan.status).some((a) => a.key === action)) {
    const label = LOAN_WORKFLOW.states[loan.status!].label;
    return fail(409, `Không thể "${def.label}" hồ sơ đang ở trạng thái "${label}"`);
  }
  if (def.comment === 'required' && !comment?.trim()) {
    return fail(400, 'Vui lòng nhập ý kiến');
  }
  if (action === 'submit') {
    // Server luôn kiểm tra lại, không tin hoàn toàn vào kiểm tra phía client.
    const errors: Record<string, string> = {};
    if (!loan.idDocs?.length) errors['idDocs'] = 'Thiếu CCCD của người vay';
    if (!loan.incomeDocs?.length) errors['incomeDocs'] = 'Thiếu chứng minh thu nhập';
    const disburse = loan.disburseDate ? new Date(loan.disburseDate) : null;
    if (disburse && disburse < new Date(new Date().setHours(0, 0, 0, 0))) {
      errors['disburseDate'] = 'Ngày giải ngân đã qua, vui lòng cập nhật';
    }
    if (Object.keys(errors).length) return fail(400, 'Hồ sơ chưa đủ điều kiện gửi duyệt', errors);
  }
  const now = new Date();
  return ok(
    update(loan.id!, {
      status: def.to,
      updatedAt: now,
      history: [
        ...(loan.history ?? []),
        { at: now, by: user.name, action, from: loan.status!, to: def.to, comment },
      ],
    }),
  );
}

/** Server tự điền các giá trị suy ra (tên khách hàng theo customerId). */
function derived(body: LoanApplication): Partial<LoanApplication> {
  const c = customers.find((x) => x.id === body.customerId);
  return c ? { customerName: c.fullName } : {};
}

function update(id: string, patch: Partial<LoanApplication>): LoanApplication {
  let updated!: LoanApplication;
  loans = loans.map((l) => (l.id === id ? (updated = { ...l, ...patch }) : l));
  return updated;
}

const loanRow = (l: LoanApplication): LoanRow => ({
  id: l.id!,
  code: l.code ?? '',
  customerName: l.customerName ?? '',
  productName: productName(l.productId),
  amount: l.amount ?? 0,
  termMonths: l.termMonths ?? 0,
  status: l.status ?? 'DRAFT',
  updatedAt: l.updatedAt!,
});

// ───────────── Danh mục sản phẩm ─────────────

function catalogApi(req: HttpRequest<unknown>, what: string | undefined) {
  switch (what) {
    case 'categories':
      return ok(CATEGORIES);
    case 'products':
      return ok(
        PRODUCTS.filter((p) => p.categoryId === req.params.get('categoryId')).map(
          ({ value, label }) => ({ value, label }),
        ),
      );
    case 'packages':
      return ok(packagesOf(req.params.get('productId') ?? ''));
    default:
      return fail(404, 'Không tìm thấy danh mục');
  }
}

// ───────────── Tệp ─────────────

/** Giả lập tải lên: phát tiến trình 4 lần (~1 giây) rồi trả FileRef. */
function upload(req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
  const file = (req.body as FormData).get('file') as File;
  if (/loi/i.test(file.name)) return fail(500, `Không lưu được tệp ${file.name} (giả lập)`);
  // concat chạy lần lượt → mỗi mốc cách nhau 250 ms.
  const progress = [0.25, 0.5, 0.75, 1].map((r) =>
    timer(250).pipe(
      map((): HttpProgressEvent => ({
        type: HttpEventType.UploadProgress,
        loaded: Math.round(file.size * r),
        total: file.size,
      })),
    ),
  );
  const ref: FileRef = {
    id: `F${Date.now()}${Math.round(Math.random() * 1000)}`,
    name: file.name,
    size: file.size,
    type: file.type,
    // Chỉ xem được trong phiên này (server thật trả URL tải về).
    url: URL.createObjectURL(file),
  };
  return concat(...progress, of(new HttpResponse({ status: 200, body: ref })));
}

// ───────────── Tiện ích ─────────────

function paginate<R>(req: HttpRequest<unknown>, rows: R[], defaultSort: string) {
  const [field, order] = (req.params.get('sort') ?? defaultSort).split(',') as [keyof R, string];
  const dir = order === 'desc' ? -1 : 1;
  const sorted = [...rows].sort((a, b) => {
    const x = a[field] ?? '';
    const y = b[field] ?? '';
    return (x < y ? -1 : x > y ? 1 : 0) * dir;
  });
  const page = Math.max(Number(req.params.get('page') ?? 1) - 1, 0);
  const size = Number(req.params.get('size') ?? 20);
  return { items: sorted.slice(page * size, page * size + size), total: rows.length };
}

function userOf(req: HttpRequest<unknown>) {
  return {
    name: decodeURIComponent(req.headers.get('X-User') ?? 'Không rõ'),
    role: req.headers.get('X-Role') ?? '',
  };
}

/** Đi qua JSON như dữ liệu thật trên mạng. */
const wire = <T>(v: T): T => (v === null ? v : JSON.parse(JSON.stringify(v)));
const ok = (body: unknown) => of(new HttpResponse({ status: 200, body: wire(body) }));
const fail = (status: number, message: string, fieldErrors?: Record<string, string>) =>
  throwError(() => new HttpErrorResponse({ status, error: { message, fieldErrors } }));

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
