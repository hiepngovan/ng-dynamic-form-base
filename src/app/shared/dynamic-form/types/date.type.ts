import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { DfFieldType } from '../core/df-field-type';

@Component({
  selector: 'df-date',
  imports: [ReactiveFormsModule, DatePicker, DatePipe],
  template: `
    @if (readonly) {
      <div class="df-readonly">{{ (formControl.value | date: 'dd/MM/yyyy') || '—' }}</div>
    } @else {
      <p-datepicker
        [formControl]="formControl"
        [inputId]="id"
        dateFormat="dd/mm/yy"
        placeholder="dd/mm/yyyy"
        [showIcon]="true"
        [showButtonBar]="true"
        appendTo="body"
        [invalid]="showError"
        [fluid]="true"
        (onSelect)="emitChange($event)"
        (onClear)="emitChange()"
      />
    }
  `,
})
export class DateType extends DfFieldType {}
