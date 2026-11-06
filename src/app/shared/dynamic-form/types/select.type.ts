import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { DfFieldType } from './df-field-type';
import { labelOf, optionOf, OptionsPipe } from './options.pipe';
import { SelectProps } from '../props';

/**
 * Select dùng chung. props.options nhận mảng hoặc Observable (API).
 * Danh sách phụ thuộc (Tỉnh → Phường/Xã) cấu hình qua builder: { dependsOn, loadOptions }.
 */
@Component({
  selector: 'df-select',
  imports: [ReactiveFormsModule, Select, AsyncPipe, OptionsPipe],
  template: `
    @let opts = (props.options | dfOptions | async) ?? [];
    @if (readonly) {
      <div class="df-readonly">{{ labelOf(opts, formControl.value) || '—' }}</div>
    } @else {
      <p-select
        [formControl]="formControl"
        [inputId]="id"
        [options]="opts"
        optionLabel="label"
        optionValue="value"
        optionDisabled="disabled"
        [filter]="props.filter ?? opts.length > 10"
        filterBy="label"
        [showClear]="!props.required"
        [placeholder]="props.placeholder ?? '-- Chọn --'"
        emptyMessage="Không có dữ liệu"
        emptyFilterMessage="Không tìm thấy"
        appendTo="body"
        [invalid]="showError"
        [fluid]="true"
        (onChange)="emitChange({ option: optionOf(opts, $event.value) })"
      />
    }
  `,
})
export class SelectType extends DfFieldType<SelectProps> {
  protected readonly labelOf = labelOf;
  protected readonly optionOf = optionOf;
}
