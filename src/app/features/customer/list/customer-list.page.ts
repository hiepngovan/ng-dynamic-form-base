import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Message } from 'primeng/message';
import { AppStore } from '../../../core/app.store';
import { ColumnDef, DataTableComponent } from '../../../shared/data';
import { CUSTOMER_STATUS_LABELS, CUSTOMER_TYPE_LABELS, CustomerRow } from '../customer.model';
import { CustomerFilterPanel } from './customer-filter.panel';
import { CustomerListStore } from './customer-list.store';

/**
 * Màn hình danh sách: chỉ khai báo cột + nối store với bảng. Không gọi API, không tự giữ
 * loading / error / trang — tất cả nằm trong CustomerListStore (khai báo ở providers bên dưới).
 */
@Component({
  selector: 'app-customer-list-page',
  imports: [DataTableComponent, CustomerFilterPanel, Button, ConfirmDialog, Message, RouterLink],
  providers: [CustomerListStore, ConfirmationService],
  template: `
    <p-confirmdialog />
    <header class="page-header">
      <div>
        <h1>Khách hàng</h1>
        <p class="muted">{{ store.total() }} khách hàng</p>
      </div>
      <div class="page-header__actions">
        @if (app.can('customer.delete') && store.selectedCount()) {
          <p-button
            [label]="'Xoá ' + store.selectedCount() + ' khách hàng'"
            icon="pi pi-trash"
            severity="danger"
            [outlined]="true"
            (onClick)="confirmDelete()"
          />
        }
        @if (app.can('customer.edit')) {
          <p-button label="Thêm khách hàng" icon="pi pi-plus" routerLink="new" />
        }
      </div>
    </header>

    <app-customer-filter-panel />

    @if (store.error(); as err) {
      <p-message severity="error" styleClass="list-error">
        <span>{{ err.message }}</span>
        <p-button label="Thử lại" size="small" [text]="true" (onClick)="store.reload()" />
      </p-message>
    }

    <div class="list-table">
      <app-data-table
        [columns]="columns"
        [rows]="store.items()"
        [total]="store.total()"
        [page]="store.page()"
        [size]="store.size()"
        [sort]="store.sort()"
        [loading]="store.loading()"
        (pageChange)="store.changePage($event)"
        [selectable]="app.can('customer.delete')"
        [selectedIds]="store.selectedIds()"
        (selectedIdsChange)="store.setSelected($event)"
      />
    </div>
  `,
})
export class CustomerListPage {
  protected readonly store = inject(CustomerListStore);
  protected readonly app = inject(AppStore);
  private readonly confirm = inject(ConfirmationService);

  readonly columns: ColumnDef<CustomerRow>[] = [
    {
      key: 'code',
      header: 'Mã KH',
      sortable: true,
      width: '120px',
      link: (r) => ['/customers', r.id],
    },
    {
      key: 'fullName',
      header: 'Tên khách hàng',
      sortable: true,
      link: (r) => ['/customers', r.id],
    },
    { key: 'customerType', header: 'Loại', format: 'tag', labels: CUSTOMER_TYPE_LABELS },
    { key: 'phone', header: 'Điện thoại' },
    { key: 'provinceName', header: 'Tỉnh/TP' },
    { key: 'creditLimit', header: 'Hạn mức', format: 'money', sortable: true },
    { key: 'status', header: 'Trạng thái', format: 'tag', labels: CUSTOMER_STATUS_LABELS },
    { key: 'createdAt', header: 'Ngày tạo', format: 'date', sortable: true, width: '120px' },
  ];

  confirmDelete(): void {
    this.confirm.confirm({
      header: 'Xoá khách hàng',
      message: `Xoá ${this.store.selectedCount()} khách hàng đã chọn? Thao tác không hoàn tác được.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xoá',
      rejectLabel: 'Huỷ',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', text: true },
      accept: () => void this.store.deleteSelected(),
    });
  }
}
