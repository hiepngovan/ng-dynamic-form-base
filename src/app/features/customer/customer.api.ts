import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Page, PageQuery, reviveDates, toParams } from '../../shared/data';
import { Customer, CustomerFilter, CustomerRow } from './customer.model';

/**
 * Lớp gọi API của feature khách hàng — NƠI DUY NHẤT trong feature được dùng HttpClient
 * (lint chặn HttpClient ở các file khác). Không giữ state → providedIn root được phép.
 * Chuyển đổi DTO ↔ model (chuỗi ngày → Date) làm ở đây, component không phải tự xử lý.
 * Khi backend có OpenAPI: thay phần thân bằng service sinh tự động, giữ nguyên chữ ký hàm.
 */
@Injectable({ providedIn: 'root' })
export class CustomerApi {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/customers';

  search(q: PageQuery<CustomerFilter>): Observable<Page<CustomerRow>> {
    return this.http
      .get<Page<CustomerRow>>(this.url, { params: toParams(q) })
      .pipe(map(reviveDates));
  }

  get(id: string): Observable<Partial<Customer>> {
    return this.http.get<Partial<Customer>>(`${this.url}/${id}`).pipe(map(reviveDates));
  }

  save(value: Partial<Customer>, id: string | null): Observable<Partial<Customer>> {
    const req = id
      ? this.http.put<Partial<Customer>>(`${this.url}/${id}`, value)
      : this.http.post<Partial<Customer>>(this.url, value);
    return req.pipe(map(reviveDates));
  }

  delete(ids: string[]): Observable<void> {
    return this.http.delete<void>(this.url, { params: { ids: ids.join(',') } });
  }
}
