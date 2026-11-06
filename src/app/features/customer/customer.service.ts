import { Injectable } from '@angular/core';
import { Observable, of, throwError, timer } from 'rxjs';
import { delay, mergeMap } from 'rxjs/operators';
import { Customer } from './customer.model';

export interface ApiValidationError {
  status: 400;
  error: { fieldErrors: Record<string, string> };
}

/** MOCK API. SĐT 0900000000 → giả lập lỗi trùng dữ liệu từ server. */
@Injectable({ providedIn: 'root' })
export class CustomerService {
  save(value: Partial<Customer>): Observable<{ code: string }> {
    return timer(600).pipe(
      mergeMap(() => {
        if (value.phone === '0900000000') {
          const err: ApiValidationError = {
            status: 400,
            error: { fieldErrors: { phone: 'Số điện thoại đã được đăng ký cho khách hàng khác' } },
          };
          return throwError(() => err);
        }
        return of({ code: value.code ?? `KH${Date.now().toString().slice(-6)}` });
      }),
    );
  }

  getSample(): Observable<Partial<Customer>> {
    return of(sampleCustomer()).pipe(delay(200));
  }
}

function sampleCustomer(): Partial<Customer> {
  const extra: Record<string, unknown> = {};
  for (let i = 1; i <= 90; i += 5) extra[`f${String(i).padStart(3, '0')}`] = `Giá trị ${i}`;
  return {
    customerType: 'PERSONAL',
    code: 'KH000123',
    fullName: 'Nguyễn Văn An',
    shortName: 'An Nguyễn',
    dob: new Date(1990, 4, 12),
    gender: 'M',
    identityNo: '001090012345',
    identityIssueDate: new Date(2021, 6, 1),
    identityExpiryDate: new Date(2030, 4, 12),
    identityIssuePlace: 'Cục CS QLHC về TTXH',
    industryId: 'IND4',
    customerGroupId: 'G4',
    status: 'ACTIVE',
    sourceId: 'S2',
    salesStaffId: 'NV042',
    phone: '0912345678',
    email: 'an.nguyen@example.com',
    provinceId: 'HN',
    wardId: 'HN-W03',
    street: '12 Tràng Tiền',
    sameAddress: true,
    currency: 'VND',
    creditLimit: 500_000_000,
    deposit: 50_000_000,
    paymentTermDays: 30,
    discountRate: 2.5,
    paymentMethod: 'TRANSFER',
    bankId: 'VIETCOMBANK',
    bankAccountNo: '0011001234567',
    bankAccountName: 'NGUYEN VAN AN',
    vatRegistered: false,
    contacts: [
      {
        fullName: 'Trần Thị Bình',
        position: 'Kế toán',
        phone: '0987654321',
        email: 'binh@example.com',
        isPrimary: true,
      },
      {
        fullName: 'Lê Văn Chi',
        position: 'Thủ kho',
        phone: '0977000111',
        email: null,
        isPrimary: false,
      },
    ],
    extra,
  };
}
