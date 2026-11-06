import { Component } from '@angular/core';
import { FieldWrapper, FormlyValidationMessage } from '@ngx-formly/core';

/** Wrapper cho ô trong bảng (type `table`): không có label (label nằm ở header), chỉ hiện lỗi. */
@Component({
  selector: 'df-cell',
  imports: [FormlyValidationMessage],
  template: `
    <div class="df-cell" [class.df-field--error]="showError">
      <ng-container #fieldComponent />
      @if (showError) {
        <small class="df-field__error" role="alert"
          ><formly-validation-message [field]="field"
        /></small>
      }
    </div>
  `,
})
export class CellWrapper extends FieldWrapper {}
