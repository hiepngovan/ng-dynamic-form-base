import { NgComponentOutlet } from '@angular/common';
import { Component } from '@angular/core';
import { DfFieldType } from './df-field-type';
import { ComponentProps } from '../props';

/**
 * LỐI THOÁT: nhúng một component tự viết vào giữa form (khối UI đặc thù).
 * Component nhận input `field` → đọc/ghi được field.form, field.model như mọi field khác.
 * Dùng qua builder: f.component(MyComponent).
 */
@Component({
  selector: 'df-component',
  imports: [NgComponentOutlet],
  template: `
    @if (props.component) {
      <ng-container *ngComponentOutlet="props.component; inputs: { field: field }" />
    }
  `,
})
export class ComponentType extends DfFieldType<ComponentProps> {}
