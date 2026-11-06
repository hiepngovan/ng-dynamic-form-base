import { Component, computed, inject } from '@angular/core';
import { Button } from 'primeng/button';
import { MasterDataService } from '../../../core/master-data.service';
import { AppFormComponent, fieldsFor } from '../../../shared/dynamic-form';
import { CustomerFilter } from '../customer.model';
import { CustomerListStore } from './customer-list.store';

/**
 * Bộ lọc — component CONTAINER lồng trong trang: inject thẳng store của màn hình.
 * Form lọc dùng lại fieldsFor → cùng loại field, cùng giao diện với form sửa.
 */
@Component({
  selector: 'app-customer-filter-panel',
  imports: [AppFormComponent, Button],
  template: `
    <app-form
      [fields]="fields"
      [model]="model()"
      submitLabel="Tìm kiếm"
      submitIcon="pi pi-search"
      (submitted)="store.setFilter($event)"
    >
      @if (store.filtered()) {
        <p-button
          formActions
          label="Xoá lọc"
          icon="pi pi-filter-slash"
          severity="secondary"
          [text]="true"
          (onClick)="store.resetFilter()"
        />
      }
    </app-form>
  `,
})
export class CustomerFilterPanel {
  protected readonly store = inject(CustomerListStore);
  private readonly md = inject(MasterDataService);
  private readonly f = fieldsFor<CustomerFilter>();

  /** Bản sao bộ lọc hiện tại (Back / F5 → form lọc hiện đúng giá trị trên URL). */
  readonly model = computed(() => ({ ...this.store.filter() }));

  readonly fields = [
    {
      fieldGroupClassName: 'df-grid',
      fieldGroup: [
        this.f.text('q', 'Từ khoá', { placeholder: 'Mã, tên, số điện thoại' }),
        this.f.select('customerType', 'Loại khách hàng', {
          col: 2,
          options: [
            { value: 'PERSONAL', label: 'Cá nhân' },
            { value: 'COMPANY', label: 'Doanh nghiệp' },
          ],
        }),
        this.f.select('status', 'Trạng thái', {
          col: 3,
          options: [
            { value: 'ACTIVE', label: 'Đang hoạt động' },
            { value: 'SUSPENDED', label: 'Tạm ngưng' },
            { value: 'CLOSED', label: 'Ngừng giao dịch' },
          ],
        }),
        this.f.select('provinceId', 'Tỉnh/TP', { col: 3, options: this.md.provinces() }),
      ],
    },
  ];
}
