import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RadioButton } from 'primeng/radiobutton';
import { DfFieldType } from './df-field-type';
import { labelOf, OptionsPipe } from './options.pipe';
import { SelectProps } from '../props';

@Component({
  selector: 'df-radio',
  imports: [ReactiveFormsModule, RadioButton, AsyncPipe, OptionsPipe],
  template: `
    @let opts = (props.options | dfOptions | async) ?? [];
    @if (readonly) {
      <div class="df-readonly">{{ labelOf(opts, formControl.value) || '—' }}</div>
    } @else {
      <div class="df-radio" role="radiogroup" [attr.aria-labelledby]="id">
        @for (o of opts; track o.value; let i = $index) {
          <span class="df-radio__item">
            <p-radiobutton
              [formControl]="formControl"
              [name]="id"
              [value]="o.value"
              [inputId]="id + '_' + i"
              [invalid]="showError"
              (onClick)="emitChange({ option: o })"
            />
            <label [for]="id + '_' + i">{{ o.label }}</label>
          </span>
        }
      </div>
    }
  `,
})
export class RadioType extends DfFieldType<SelectProps> {
  protected readonly labelOf = labelOf;
}
