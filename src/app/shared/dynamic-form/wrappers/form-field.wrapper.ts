import { Component } from '@angular/core';
import { FieldWrapper, FormlyFieldConfig, FormlyValidationMessage } from '@ngx-formly/core';
import { Tooltip } from 'primeng/tooltip';
import { DfProps } from '../core/props';

/**
 * Wrapper mặc định của mọi field: label, dấu *, tooltip, lỗi, gợi ý.
 * Sửa ở đây = toàn bộ form trong hệ thống đổi theo.
 */
@Component({
  selector: 'df-form-field',
  imports: [FormlyValidationMessage, Tooltip],
  template: `
    <div class="df-field" [class.df-field--error]="showError">
      @if (props.label) {
        <label class="df-field__label" [attr.for]="id">
          {{ props.label }}
          @if (props.required && !formState?.readonly) {
            <span class="df-field__req" aria-hidden="true">*</span>
          }
          @if (props.tooltip) {
            <i
              class="pi pi-info-circle df-field__tip"
              [pTooltip]="props.tooltip"
              tooltipPosition="top"
            ></i>
          }
        </label>
      }
      <ng-container #fieldComponent />
      @if (showError) {
        <small class="df-field__error" role="alert"
          ><formly-validation-message [field]="field"
        /></small>
      } @else if (props.description && !formState?.readonly) {
        <small class="df-field__hint">{{ props.description }}</small>
      }
    </div>
  `,
})
export class FormFieldWrapper extends FieldWrapper<FormlyFieldConfig<DfProps>> {}
