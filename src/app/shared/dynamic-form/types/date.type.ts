import { DatePipe } from '@angular/common';
import { afterNextRender, Component, ElementRef, inject, Injector, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { DfFieldType } from '../core/df-field-type';

/**
 * Ngày. TẠO p-datepicker KHI CẦN: mỗi p-datepicker mất ~7 ms để khởi tạo (tab có 20 ô ngày
 * = thêm ~150 ms), nên ban đầu chỉ hiện một ô nhập nhẹ trông giống hệt. Người dùng focus / click
 * vào ô (hoặc form focus vào ô lỗi) → thay bằng p-datepicker thật và chuyển focus sang nó.
 */
@Component({
  selector: 'df-date',
  imports: [ReactiveFormsModule, DatePicker, DatePipe, IconField, InputIcon, InputText],
  template: `
    @if (readonly) {
      <div class="df-readonly">{{ (formControl.value | date: 'dd/MM/yyyy') || '—' }}</div>
    } @else if (picker()) {
      <p-datepicker
        [formControl]="formControl"
        [inputId]="id"
        dateFormat="dd/mm/yy"
        placeholder="dd/mm/yyyy"
        [showIcon]="true"
        iconDisplay="input"
        [showButtonBar]="true"
        appendTo="body"
        [invalid]="showError"
        [fluid]="true"
        (onSelect)="emitChange($event)"
        (onClear)="emitChange()"
      />
    } @else {
      <p-iconfield>
        <input
          pInputText
          [id]="id"
          [value]="formControl.value | date: 'dd/MM/yyyy'"
          placeholder="dd/mm/yyyy"
          [disabled]="formControl.disabled"
          [invalid]="showError"
          [fluid]="true"
          (focus)="activate()"
        />
        <p-inputicon class="pi pi-calendar" />
      </p-iconfield>
    }
  `,
})
export class DateType extends DfFieldType {
  readonly picker = signal(false);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  activate(): void {
    this.picker.set(true);
    afterNextRender(() => this.host.nativeElement.querySelector('input')?.focus(), {
      injector: this.injector,
    });
  }
}
