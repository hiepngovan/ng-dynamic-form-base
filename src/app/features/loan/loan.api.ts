import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, shareReplay } from 'rxjs';
import { Page, PageQuery, reviveDates, toParams } from '../../shared/data';
import { SelectOption } from '../../shared/dynamic-form';
import { LoanAction, LoanApplication, LoanFilter, LoanRow } from './loan.model';

export interface CustomerHit {
  id: string;
  code: string;
  fullName: string;
  phone: string | null;
}

/**
 * API của feature hồ sơ vay — nơi duy nhất trong feature dùng HttpClient.
 * Danh mục sản phẩm cũng lấy qua đây (dữ liệu của nghiệp vụ cho vay, không phải danh mục chung).
 */
@Injectable({ providedIn: 'root' })
export class LoanApi {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/loans';
  private readonly categories$ = this.http
    .get<SelectOption[]>('/api/catalog/categories')
    .pipe(shareReplay(1));

  search(q: PageQuery<LoanFilter>): Observable<Page<LoanRow>> {
    return this.http.get<Page<LoanRow>>(this.url, { params: toParams(q) }).pipe(map(reviveDates));
  }

  get(id: string): Observable<Partial<LoanApplication>> {
    return this.http.get<Partial<LoanApplication>>(`${this.url}/${id}`).pipe(map(reviveDates));
  }

  save(value: Partial<LoanApplication>, id: string | null): Observable<Partial<LoanApplication>> {
    const req = id
      ? this.http.put<Partial<LoanApplication>>(`${this.url}/${id}`, value)
      : this.http.post<Partial<LoanApplication>>(this.url, value);
    return req.pipe(map(reviveDates));
  }

  transition(
    id: string,
    action: LoanAction,
    comment: string | null,
  ): Observable<Partial<LoanApplication>> {
    return this.http
      .post<Partial<LoanApplication>>(`${this.url}/${id}/actions`, { action, comment })
      .pipe(map(reviveDates));
  }

  /** Tìm khách hàng cho ô lookup (dùng API danh sách khách hàng, lấy 10 dòng đầu). */
  findCustomers(q: string): Observable<SelectOption[]> {
    return this.http
      .get<Page<CustomerHit>>('/api/customers', { params: { q, page: 1, size: 10 } })
      .pipe(
        map((p) =>
          p.items.map((c) => ({
            value: c.id,
            label: c.fullName,
            description: [c.code, c.phone].filter(Boolean).join(' · '),
            data: c,
          })),
        ),
      );
  }

  categories(): Observable<SelectOption[]> {
    return this.categories$;
  }

  products(categoryId: unknown): Observable<SelectOption[]> {
    return this.http.get<SelectOption[]>('/api/catalog/products', {
      params: { categoryId: String(categoryId) },
    });
  }

  /** Gói vay của sản phẩm; option.data = LoanPackage (lãi suất, thời hạn, số tiền tối đa). */
  packages(productId: unknown): Observable<SelectOption<string>[]> {
    return this.http.get<SelectOption<string>[]>('/api/catalog/packages', {
      params: { productId: String(productId) },
    });
  }
}
