import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FormlyAttributes } from '@ngx-formly/core';
import { Textarea } from 'primeng/textarea';
import { DfFieldType } from '../core/df-field-type';

@Component({
  selector: 'df-textarea',
  imports: [ReactiveFormsModule, FormlyAttributes, Textarea],
  template: `
    @if (readonly) {
      <div class="df-readonly df-readonly--multiline">{{ formControl.value || '—' }}</div>
    } @else {
      <textarea
        pTextarea
        [rows]="props.rows ?? 3"
        [autoResize]="true"
        [formControl]="formControl"
        [formlyAttributes]="field"
        [invalid]="showError"
        [fluid]="true"
      ></textarea>
    }
  `,
})
export class TextareaType extends DfFieldType {}
