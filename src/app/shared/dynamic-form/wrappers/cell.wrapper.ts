import { Component } from '@angular/core';
import { FieldWrapper, FormlyFieldConfig, FormlyValidationMessage } from '@ngx-formly/core';
import { DfProps } from '../props';

/** Wrapper cho ô trong bảng (type `table`): không có label (label nằm ở header), chỉ hiện lỗi. */
@Component({
  selector: 'df-cell',
  imports: [FormlyValidationMessage],
  template: `
    <div class="df-cell" [class.df-field--error]="showError" [class.df-field--calc]="props.calc">
      <ng-container #fieldComponent />
      @if (showError) {
        <small class="df-field__error" role="alert"
          ><formly-validation-message [field]="field"
        /></small>
      }
    </div>
  `,
})
export class CellWrapper extends FieldWrapper<FormlyFieldConfig<DfProps>> {}
