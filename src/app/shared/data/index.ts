// Public API của lớp dữ liệu. Feature chỉ import từ file này.
export { apiErrorInterceptor, toApiError } from './api-error.interceptor';
export { withStoreDevtools } from './devtools';
export { isApiError } from './models';
export type { ApiError, Filter, Page, PageQuery, Sort } from './models';
export { fromParams, reviveDates, toParams } from './query-params';
export { DataTableComponent } from './ui/data-table.component';
export type { ColumnDef, PageChange } from './ui/data-table.component';
export { withDetail } from './with-detail';
export type { DetailConfig } from './with-detail';
export { withPagedList } from './with-paged-list';
export type { PagedListConfig } from './with-paged-list';
export { withSelection } from './with-selection';
