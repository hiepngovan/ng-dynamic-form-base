import { Filter, PageQuery, Sort } from './models';

/**
 * Chuyển PageQuery ↔ tham số dạng chuỗi. Dùng chung cho query param của URL và của HTTP request,
 * để màn hình và API dùng cùng một quy ước: ?page=2&size=20&sort=code,desc&status=ACTIVE
 * (page trên URL bắt đầu từ 1 cho dễ đọc).
 */
export function toParams<F extends Filter>(q: PageQuery<F>): Record<string, string> {
  const params: Record<string, string> = { page: String(q.page + 1), size: String(q.size) };
  if (q.sort) params['sort'] = `${q.sort.field},${q.sort.order}`;
  for (const [k, v] of Object.entries(q.filter)) if (v) params[k] = v;
  return params;
}

/** Đọc PageQuery từ tham số. Chỉ nhận các key lọc có trong `defaults.filter`. */
export function fromParams<F extends Filter>(
  params: Record<string, string | undefined>,
  defaults: PageQuery<F>,
): PageQuery<F> {
  const page = Number(params['page']);
  const size = Number(params['size']);
  const filter = { ...defaults.filter };
  for (const k of Object.keys(filter)) {
    (filter as Filter)[k] = params[k] || defaults.filter[k] || null;
  }
  return {
    page: Number.isInteger(page) && page > 0 ? page - 1 : 0,
    size: Number.isInteger(size) && size > 0 ? size : defaults.size,
    sort: parseSort(params['sort']) ?? defaults.sort,
    filter,
  };
}

function parseSort(v: string | undefined): Sort | null {
  const [field, order] = v?.split(',') ?? [];
  return field && (order === 'asc' || order === 'desc') ? { field, order } : null;
}

/**
 * Chuỗi ngày dạng ISO trong JSON → Date (đệ quy). API trả ngày dạng chuỗi, form / pipe cần Date.
 * Dùng trong lớp API (xem customer.api.ts), không để component tự chuyển.
 */
export function reviveDates<T>(value: T): T {
  if (typeof value === 'string' && ISO_DATE.test(value)) return new Date(value) as T;
  if (Array.isArray(value)) return value.map(reviveDates) as T;
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, reviveDates(v)])) as T;
  }
  return value;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
