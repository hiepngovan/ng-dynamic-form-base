import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Checkbox } from 'primeng/checkbox';
import { DfFieldType } from './df-field-type';
import { CheckboxProps } from '../props';

@Component({
  selector: 'df-checkbox',
  imports: [ReactiveFormsModule, Checkbox],
  template: `
    @if (readonly) {
      <div class="df-readonly">
        <i
          class="pi"
          [class.pi-check-square]="formControl.value"
          [class.pi-stop]="!formControl.value"
        ></i>
        {{ props.checkboxLabel }}
      </div>
    } @else {
      <div class="df-check">
        <p-checkbox
          [formControl]="formControl"
          [binary]="true"
          [inputId]="id"
          [invalid]="showError"
          (onChange)="emitChange($event)"
        />
        @if (props.checkboxLabel) {
          <label [for]="id">{{ props.checkboxLabel }}</label>
        }
      </div>
    }
  `,
})
export class CheckboxType extends DfFieldType<CheckboxProps> {}
