import { Component } from '@angular/core';
import { FieldWrapper } from '@ngx-formly/core';
import { Fieldset } from 'primeng/fieldset';

/** Nhóm field có tiêu đề (dùng qua builder: f.section(...)). */
@Component({
  selector: 'df-section',
  imports: [Fieldset],
  template: `
    <p-fieldset [legend]="props.label" styleClass="df-section">
      <ng-container #fieldComponent />
    </p-fieldset>
  `,
})
export class SectionWrapper extends FieldWrapper {}
