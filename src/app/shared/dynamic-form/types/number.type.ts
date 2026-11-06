import { DecimalPipe } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { InputNumber } from 'primeng/inputnumber';
import { DfFieldType } from './df-field-type';
import { NumberProps } from '../props';

/**
 * Dùng cho cả `number` và `money` (money = extends number, mode currency — xem dynamic-form.config.ts).
 */
@Component({
  selector: 'df-number',
  imports: [ReactiveFormsModule, InputNumber, DecimalPipe],
  template: `
    @if (readonly) {
      <div class="df-readonly">
        @if (formControl.value !== null && formControl.value !== undefined) {
          {{ formControl.value | number: '1.0-' + (props.maxFractionDigits ?? 2) }}
          {{
            props.mode === 'currency'
              ? props.currency === 'VND'
                ? '₫'
                : props.currency
              : (props.suffix ?? '')
          }}
        } @else {
          —
        }
      </div>
    } @else {
      <p-inputnumber
        [formControl]="formControl"
        [inputId]="id"
        [mode]="props.mode ?? 'decimal'"
        [currency]="props.currency ?? 'VND'"
        locale="vi-VN"
        [suffix]="props.suffix ?? ''"
        [minFractionDigits]="props.minFractionDigits ?? 0"
        [maxFractionDigits]="props.maxFractionDigits ?? 2"
        [placeholder]="props.placeholder ?? ''"
        [invalid]="showError"
        [fluid]="true"
        (onBlur)="emitChange($event)"
      />
    }
  `,
})
export class NumberType extends DfFieldType<NumberProps> {}
