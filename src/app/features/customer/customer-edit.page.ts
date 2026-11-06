import { JsonPipe } from '@angular/common';
import { afterNextRender, Component, inject, signal, viewChild } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Panel } from 'primeng/panel';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { finalize } from 'rxjs/operators';
import { AppFormComponent, HasUnsavedChanges } from '../../shared/dynamic-form';
import { Customer } from './customer.model';
import { ApiValidationError, CustomerService } from './customer.service';
import { buildCustomerForm, countInputFields } from './form/customer.form';
import { MasterDataService } from './master-data.service';

/**
 * Màn hình nghiệp vụ: chỉ khai báo cấu hình + xử lý lưu. Không có template form viết tay.
 */
@Component({
  selector: 'app-customer-edit-page',
  imports: [AppFormComponent, Button, Panel, Tag, Toast, JsonPipe],
  providers: [MessageService],
  template: `
    <p-toast />
    <header class="page-header">
      <div>
        <h1>Hồ sơ khách hàng</h1>
        <p class="muted">
          PoC dynamic form · Angular 21 · Formly v10 · PrimeNG 21
          <p-tag [value]="fieldCount + ' field'" severity="info" />
          <p-tag [value]="'Dựng form: ' + renderMs() + ' ms'" severity="secondary" />
        </p>
      </div>
      <div class="page-header__actions">
        <p-button
          label="Thêm mới"
          icon="pi pi-file"
          severity="secondary"
          [outlined]="true"
          (onClick)="newCustomer()"
        />
        <p-button
          label="Nạp dữ liệu mẫu"
          icon="pi pi-download"
          severity="secondary"
          [outlined]="true"
          (onClick)="loadSample()"
        />
        <p-button
          [label]="readonly() ? 'Chuyển sang sửa' : 'Chế độ xem'"
          [icon]="readonly() ? 'pi pi-pencil' : 'pi pi-eye'"
          severity="secondary"
          [outlined]="true"
          (onClick)="readonly.set(!readonly())"
        />
      </div>
    </header>

    <app-form
      [fields]="fields"
      [model]="model"
      [readonly]="readonly()"
      [loading]="saving()"
      submitLabel="Lưu khách hàng"
      (submitted)="save($event)"
    >
      <p-button
        formActions
        label="Huỷ"
        severity="secondary"
        [text]="true"
        (onClick)="newCustomer()"
      />
    </app-form>

    <p-panel
      header="Model hiện tại (debug)"
      [toggleable]="true"
      [collapsed]="true"
      class="debug-panel"
    >
      <pre>{{ model | json }}</pre>
    </p-panel>
  `,
})
export class CustomerEditPage implements HasUnsavedChanges {
  private readonly md = inject(MasterDataService);
  private readonly api = inject(CustomerService);
  private readonly toast = inject(MessageService);
  private readonly formRef = viewChild.required(AppFormComponent);

  /** Tạo cấu hình MỘT LẦN (không gọi hàm build trong template). */
  readonly fields = buildCustomerForm(this.md);
  readonly fieldCount = countInputFields(this.fields);
  readonly model: Partial<Customer> = {};

  readonly readonly = signal(false);
  readonly saving = signal(false);
  readonly renderMs = signal(0);

  constructor() {
    const start = performance.now();
    afterNextRender(() => this.renderMs.set(Math.round(performance.now() - start)));
  }

  hasUnsavedChanges(): boolean {
    return this.formRef().dirty;
  }

  newCustomer(): void {
    this.readonly.set(false);
    this.formRef().reset({});
  }

  loadSample(): void {
    this.api.getSample().subscribe((data) => {
      this.formRef().reset(data);
      this.toast.add({
        severity: 'info',
        summary: 'Đã nạp dữ liệu mẫu',
        detail: data.fullName ?? '',
      });
    });
  }

  save(value: Partial<Customer>): void {
    this.saving.set(true);
    this.api
      .save(value)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: ({ code }) => {
          this.formRef().reset({ ...value, code });
          this.toast.add({
            severity: 'success',
            summary: 'Đã lưu',
            detail: `Mã khách hàng ${code}`,
          });
        },
        error: (err: ApiValidationError) => {
          if (err.status === 400) this.formRef().setServerErrors(err.error.fieldErrors);
          this.toast.add({
            severity: 'error',
            summary: 'Lưu không thành công',
            detail: 'Vui lòng kiểm tra các trường báo lỗi',
          });
        },
      });
  }
}
