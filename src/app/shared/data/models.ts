/** Một trang dữ liệu do API trả về. */
export interface Page<T> {
  items: T[];
  total: number;
}

export interface Sort {
  field: string;
  order: 'asc' | 'desc';
}

/** Giá trị lọc: chỉ dùng chuỗi để đồng bộ được lên URL (?status=ACTIVE). */
export type FilterValue = string | null | undefined;
export type Filter = Record<string, FilterValue>;

/** Truy vấn danh sách. page bắt đầu từ 0. */
export interface PageQuery<F extends Filter = Filter> {
  page: number;
  size: number;
  sort: Sort | null;
  filter: F;
}

/**
 * Lỗi API đã chuẩn hoá (interceptor chuyển HttpErrorResponse → ApiError).
 * status 400 kèm fieldErrors: lỗi validate theo field → gắn vào form bằng setServerErrors().
 */
export interface ApiError {
  status: number;
  message: string;
  fieldErrors?: Record<string, string>;
}

export function isApiError(e: unknown): e is ApiError {
  return typeof e === 'object' && e !== null && 'status' in e && 'message' in e;
}

/** Màu của tag / nút (theo PrimeNG). */
export type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';
