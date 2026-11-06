import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FormlyAttributes } from '@ngx-formly/core';
import { InputText } from 'primeng/inputtext';
import { DfFieldType } from './df-field-type';

@Component({
  selector: 'df-input',
  imports: [ReactiveFormsModule, FormlyAttributes, InputText],
  template: `
    @if (readonly) {
      <div class="df-readonly">{{ formControl.value || '—' }}</div>
    } @else {
      <input
        pInputText
        [type]="props.type || 'text'"
        [formControl]="formControl"
        [formlyAttributes]="field"
        [invalid]="showError"
        [fluid]="true"
      />
    }
  `,
})
export class InputType extends DfFieldType {}
