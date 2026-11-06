import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { AppStore } from '../../../core/app.store';
import { ColumnDef, DataTableComponent } from '../../../shared/data';
import { AppFormComponent, fieldsFor } from '../../../shared/dynamic-form';
import { LoanApi } from '../loan.api';
import { LOAN_WORKFLOW, LoanFilter, LoanRow } from '../loan.model';
import { LoanListStore } from './loan-list.store';

/** Danh sách hồ sơ vay: khai báo cột + bộ lọc, mọi thứ còn lại do LoanListStore lo. */
@Component({
  selector: 'app-loan-list-page',
  imports: [DataTableComponent, AppFormComponent, Button, Message, RouterLink],
  providers: [LoanListStore],
  template: `
    <header class="page-header">
      <div>
        <h1>Hồ sơ vay</h1>
        <p class="muted">{{ store.total() }} hồ sơ</p>
      </div>
      <div class="page-header__actions">
        @if (app.can('loan.edit')) {
          <p-button label="Lập hồ sơ vay" icon="pi pi-plus" routerLink="new" />
        }
      </div>
    </header>

    <app-form
      [fields]="filterFields"
      [model]="filterModel()"
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
      />
    </div>
  `,
})
export class LoanListPage {
  protected readonly store = inject(LoanListStore);
  protected readonly app = inject(AppStore);
  private readonly api = inject(LoanApi);
  private readonly f = fieldsFor<LoanFilter>();

  readonly filterModel = computed(() => ({ ...this.store.filter() }));
  readonly filterFields = [
    {
      fieldGroupClassName: 'df-grid',
      fieldGroup: [
        this.f.text('q', 'Từ khoá', { col: 5, placeholder: 'Mã hồ sơ, tên khách hàng' }),
        this.f.select('status', 'Trạng thái', {
          col: 3,
          options: Object.entries(LOAN_WORKFLOW.states).map(([value, s]) => ({
            value,
            label: s.label,
          })),
        }),
        this.f.select('categoryId', 'Nhóm sản phẩm', { col: 4, options: this.api.categories() }),
      ],
    },
  ];

  readonly columns: ColumnDef<LoanRow>[] = [
    {
      key: 'code',
      header: 'Mã hồ sơ',
      sortable: true,
      width: '130px',
      link: (r) => ['/loans', r.id],
    },
    { key: 'customerName', header: 'Khách hàng', sortable: true, link: (r) => ['/loans', r.id] },
    { key: 'productName', header: 'Sản phẩm' },
    { key: 'amount', header: 'Số tiền', format: 'money', sortable: true },
    { key: 'termMonths', header: 'Thời hạn (tháng)', width: '130px' },
    { key: 'status', header: 'Trạng thái', format: 'tag', labels: LOAN_WORKFLOW.states },
    { key: 'updatedAt', header: 'Cập nhật', format: 'date', sortable: true, width: '120px' },
  ];
}
