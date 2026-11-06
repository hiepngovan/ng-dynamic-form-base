import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, shareReplay } from 'rxjs/operators';
import { SelectOption } from '../../shared/dynamic-form';

/**
 * Danh mục dùng chung — MOCK, giả lập độ trễ API 300ms.
 * Có cache: mở lại tab hoặc nhiều field cùng dùng một danh mục thì không gọi lại API.
 * Địa giới theo mô hình 2 cấp (Tỉnh/TP → Phường/Xã) sau sắp xếp hành chính 2025.
 */
@Injectable({ providedIn: 'root' })
export class MasterDataService {
  private readonly cache = new Map<string, Observable<SelectOption[]>>();

  provinces() {
    return this.cached('provinces', () => PROVINCES);
  }

  wards(provinceId: unknown) {
    return this.cached(`wards:${provinceId}`, () => {
      const province = PROVINCES.find((p) => p.value === provinceId)?.label ?? '';
      return Array.from({ length: 25 }, (_, i) => ({
        value: `${provinceId}-W${String(i + 1).padStart(2, '0')}`,
        label: `${i % 3 === 2 ? 'Xã' : 'Phường'} số ${i + 1} – ${province}`,
      }));
    });
  }

  industries() {
    return this.cached('industries', () =>
      [
        'Bán lẻ',
        'Sản xuất',
        'Xây dựng',
        'Công nghệ thông tin',
        'Logistics',
        'Giáo dục',
        'Y tế',
        'Tài chính',
      ].map((label, i) => ({ value: `IND${i + 1}`, label })),
    );
  }

  customerGroups() {
    return this.cached('groups', () =>
      [
        'Khách lẻ',
        'Đại lý cấp 1',
        'Đại lý cấp 2',
        'Khách hàng chiến lược',
        'Khách hàng nhà nước',
      ].map((label, i) => ({ value: `G${i + 1}`, label })),
    );
  }

  sources() {
    return this.cached('sources', () =>
      ['Website', 'Giới thiệu', 'Hội chợ', 'Telesale', 'Mạng xã hội'].map((label, i) => ({
        value: `S${i + 1}`,
        label,
      })),
    );
  }

  /** ~200 nhân viên → select tự bật ô tìm kiếm. */
  salesStaff() {
    const ho = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi'];
    const ten = [
      'An',
      'Bình',
      'Chi',
      'Dũng',
      'Giang',
      'Hà',
      'Hùng',
      'Lan',
      'Minh',
      'Nam',
      'Phương',
      'Quân',
      'Thảo',
      'Trang',
      'Tuấn',
      'Vy',
    ];
    return this.cached('staff', () =>
      Array.from({ length: 200 }, (_, i) => ({
        value: `NV${String(i + 1).padStart(3, '0')}`,
        label: `NV${String(i + 1).padStart(3, '0')} – ${ho[i % ho.length]} Văn ${ten[i % ten.length]}`,
      })),
    );
  }

  banks() {
    return this.cached('banks', () =>
      [
        'Vietcombank',
        'VietinBank',
        'BIDV',
        'Agribank',
        'Techcombank',
        'MB Bank',
        'ACB',
        'VPBank',
        'TPBank',
        'Sacombank',
        'HDBank',
        'VIB',
      ].map((label) => ({ value: label.toUpperCase().replace(/\s/g, ''), label })),
    );
  }

  private cached(key: string, factory: () => SelectOption[]): Observable<SelectOption[]> {
    let source = this.cache.get(key);
    if (!source) {
      source = of(factory()).pipe(delay(300), shareReplay(1));
      this.cache.set(key, source);
    }
    return source;
  }
}

const PROVINCES: SelectOption[] = [
  { value: 'HN', label: 'Hà Nội' },
  { value: 'HCM', label: 'TP. Hồ Chí Minh' },
  { value: 'HP', label: 'Hải Phòng' },
  { value: 'DN', label: 'Đà Nẵng' },
  { value: 'CT', label: 'Cần Thơ' },
  { value: 'HUE', label: 'Huế' },
  { value: 'QN', label: 'Quảng Ninh' },
  { value: 'KH', label: 'Khánh Hoà' },
];
