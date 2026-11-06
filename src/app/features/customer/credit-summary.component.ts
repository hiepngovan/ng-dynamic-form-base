import { DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { ProgressBar } from 'primeng/progressbar';
import { Customer } from './customer.model';

/**
 * Ví dụ LỐI THOÁT (type `component`): khối UI đặc thù nhúng vào giữa form.
 * Nhận `field` → đọc model của form để hiển thị số liệu tính toán.
 */
@Component({
  selector: 'app-credit-summary',
  imports: [DecimalPipe, ProgressBar],
  template: `
    @let m = model;
    <div class="credit-summary">
      <div class="credit-summary__item">
        <span class="muted">Hạn mức</span>
        <strong>{{ m.creditLimit ?? 0 | number: '1.0-0' }} {{ unit }}</strong>
      </div>
      <div class="credit-summary__item">
        <span class="muted">Đặt cọc</span>
        <strong>{{ m.deposit ?? 0 | number: '1.0-0' }} {{ unit }}</strong>
      </div>
      <div class="credit-summary__item">
        <span class="muted">Hạn mức khả dụng</span>
        <strong [class.text-danger]="available < 0"
          >{{ available | number: '1.0-0' }} {{ unit }}</strong
        >
      </div>
      <div class="credit-summary__bar">
        <span class="muted">Tỷ lệ đặt cọc / hạn mức: {{ ratio | number: '1.0-1' }}%</span>
        <p-progressbar [value]="ratio > 100 ? 100 : ratio" [showValue]="false" />
      </div>
    </div>
  `,
})
export class CreditSummaryComponent {
  readonly field = input.required<FormlyFieldConfig>();

  get model(): Partial<Customer> {
    return (this.field().model ?? {}) as Partial<Customer>;
  }

  get unit(): string {
    return this.model.currency === 'USD' ? 'USD' : '₫';
  }

  get available(): number {
    return (this.model.creditLimit ?? 0) - (this.model.deposit ?? 0);
  }

  get ratio(): number {
    const limit = this.model.creditLimit ?? 0;
    return limit > 0 ? ((this.model.deposit ?? 0) / limit) * 100 : 0;
  }
}
