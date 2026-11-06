import { Component } from '@angular/core';
import { FieldArrayType, FormlyField, FormlyFieldConfig } from '@ngx-formly/core';
import { Button } from 'primeng/button';

/**
 * Danh sách dòng dạng bảng (FormArray). Cột lấy từ fieldArray.fieldGroup.
 * Dùng qua builder: f.table('contacts', (c) => [c.text(...), ...]).
 *
 * Bảng sửa trực tiếp hàng trăm dòng → cân nhắc phân trang / grid chuyên dụng thay vì type này.
 */
@Component({
  selector: 'df-table',
  imports: [FormlyField, Button],
  template: `
    <div class="df-table">
      <table>
        <thead>
          <tr>
            <th class="df-table__idx">#</th>
            @for (col of columns; track $index) {
              <th [style.width]="col.props?.['width']">
                {{ col.props?.label }}
                @if (col.props?.required && !readonly) {
                  <span class="df-field__req">*</span>
                }
              </th>
            }
            @if (!readonly) {
              <th class="df-table__act"></th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of field.fieldGroup; track row; let i = $index) {
            <tr>
              <td class="df-table__idx">{{ i + 1 }}</td>
              @for (cell of row.fieldGroup; track $index) {
                <td><formly-field [field]="cell" /></td>
              }
              @if (!readonly) {
                <td class="df-table__act">
                  <p-button
                    icon="pi pi-trash"
                    severity="danger"
                    [text]="true"
                    [rounded]="true"
                    ariaLabel="Xoá dòng"
                    (onClick)="remove(i)"
                  />
                </td>
              }
            </tr>
          } @empty {
            <tr>
              <td class="df-table__empty" [attr.colspan]="columns.length + 2">Chưa có dữ liệu</td>
            </tr>
          }
        </tbody>
      </table>
      @if (!readonly) {
        <p-button
          label="Thêm dòng"
          icon="pi pi-plus"
          [text]="true"
          size="small"
          (onClick)="add()"
        />
      }
    </div>
  `,
})
export class TableType extends FieldArrayType {
  get readonly(): boolean {
    return !!this.formState?.readonly;
  }

  get columns(): FormlyFieldConfig[] {
    const fa = this.field.fieldArray;
    return (typeof fa === 'function' ? fa(this.field) : fa)?.fieldGroup ?? [];
  }
}
