import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FieldArrayType,
  FieldArrayTypeConfig,
  FormlyField,
  FormlyFieldConfig,
} from '@ngx-formly/core';
import { Button } from 'primeng/button';
import { FormEvents } from '../core/form-events';
import { TableProps } from '../core/props';

/**
 * Danh sách dòng dạng bảng (FormArray). Cột lấy từ fieldArray.fieldGroup.
 * Dùng qua builder: f.table('contacts', (c) => [c.text(...), ...]).
 *
 * Render theo lô: vài dòng mỗi frame (bảng 12 dòng × 7 cột vẽ một lần mất ~150 ms).
 * Submit lỗi → render hết ngay để focus được vào ô lỗi.
 *
 * Bảng sửa trực tiếp hàng trăm dòng → cân nhắc phân trang / grid chuyên dụng thay vì type này.
 */
/** Số dòng render thêm mỗi frame. */
const ROW_BATCH = 3;

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
            @if (editable) {
              <th class="df-table__act"></th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of field.fieldGroup; track row; let i = $index) {
            @if (i < shown()) {
              <tr>
                <td class="df-table__idx">{{ i + 1 }}</td>
                @for (cell of row.fieldGroup; track $index) {
                  <td><formly-field [field]="cell" /></td>
                }
                @if (editable) {
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
            }
          } @empty {
            <tr>
              <td class="df-table__empty" [attr.colspan]="columns.length + 2">Chưa có dữ liệu</td>
            </tr>
          }
        </tbody>
      </table>
      @if (editable) {
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
export class TableType extends FieldArrayType<FieldArrayTypeConfig<TableProps>> implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly events = inject(FormEvents, { optional: true });
  /** Số dòng đã render. Infinity = render hết (kể cả dòng thêm sau). */
  readonly shown = signal(ROW_BATCH);
  private frame = 0;

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => cancelAnimationFrame(this.frame));
    this.events?.submitFailed$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.showAll());
    const step = () => {
      if (this.shown() >= (this.field.fieldGroup?.length ?? 0)) return this.showAll();
      this.shown.update((n) => n + ROW_BATCH);
      this.frame = requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }

  private showAll(): void {
    cancelAnimationFrame(this.frame);
    this.shown.set(Infinity);
  }

  get readonly(): boolean {
    return !!this.formState?.readonly;
  }

  /** Được thêm / xoá dòng: không ở chế độ xem và bảng không cố định số dòng. */
  get editable(): boolean {
    return !this.readonly && !this.props.fixed;
  }

  get columns(): FormlyFieldConfig[] {
    const fa = this.field.fieldArray;
    return (typeof fa === 'function' ? fa(this.field) : fa)?.fieldGroup ?? [];
  }
}
