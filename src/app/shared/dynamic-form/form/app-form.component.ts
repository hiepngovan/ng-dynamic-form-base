import {
  afterNextRender,
  Component,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
} from '@angular/core';
import { ReactiveFormsModule, UntypedFormGroup } from '@angular/forms';
import { FormlyFieldConfig, FormlyForm, FormlyFormOptions } from '@ngx-formly/core';
import { Button } from 'primeng/button';
import { FormEvents } from '../core/form-events';

/**
 * Phần tử nhập liệu đang lỗi (input thường hoặc component PrimeNG như p-select, p-datepicker).
 * Loại trừ thẻ <form>: nó cũng mang class ng-invalid nên sẽ khớp với mọi input bên trong.
 */
const INVALID = ':not(form).ng-invalid.ng-touched';
const INVALID_SELECTOR = [
  `input${INVALID}`,
  `textarea${INVALID}`,
  `${INVALID} input:not([type=hidden])`,
  `${INVALID} [role=combobox]`,
  // Ô nhập không gắn trực tiếp formControl (vd ô ngày chưa tạo p-datepicker).
  '.df-field--error input:not([type=hidden])',
  // Field chỉ hiển thị (field tính toán) đang lỗi: không có input, chỉ cuộn tới.
  '.df-field--error .df-readonly',
].join(', ');

/**
 * Component bọc form dùng chung. MỌI màn hình nhập liệu đều dùng component này.
 *
 * - Submit: markAllAsTouched → lỗi thì chuyển tới tab và focus vào field lỗi đầu tiên.
 * - Dữ liệu submit lấy từ FormGroup (getRawValue), là nguồn dữ liệu chuẩn kể cả với tab chưa mở.
 * - setServerErrors(): gắn lỗi validate do backend trả về vào đúng field.
 * - readonly: chế độ xem, dùng chung cấu hình với chế độ sửa.
 */
@Component({
  selector: 'app-form',
  imports: [ReactiveFormsModule, FormlyForm, Button],
  providers: [FormEvents],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="df-form">
      <formly-form
        [form]="form"
        [fields]="fields()"
        [model]="model()"
        [options]="options"
        (modelChange)="modelChange.emit($event)"
      />
      @if (!readonly()) {
        <div class="df-form__actions">
          <ng-content select="[formActions]" />
          <p-button
            type="submit"
            [label]="submitLabel()"
            [icon]="submitIcon()"
            [loading]="loading()"
          />
        </div>
      }
    </form>
  `,
})
export class AppFormComponent<T extends object = Record<string, unknown>> {
  readonly fields = input.required<FormlyFieldConfig[]>();
  /** Model ban đầu. Formly cập nhật trực tiếp vào object này khi người dùng nhập. */
  readonly model = input.required<T>();
  readonly readonly = input(false);
  readonly loading = input(false);
  readonly submitLabel = input('Lưu');
  readonly submitIcon = input('pi pi-save');

  /** Phát khi form hợp lệ. Giá trị = form.getRawValue() (gồm cả field disabled). */
  readonly submitted = output<T>();
  readonly modelChange = output<T>();

  /** Form động: cấu trúc do cấu hình quyết định nên dùng kiểu untyped. */
  readonly form = new UntypedFormGroup({});
  readonly options: FormlyFormOptions = { formState: { readonly: false } };

  private readonly events = inject(FormEvents);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  constructor() {
    effect(() => {
      this.options.formState.readonly = this.readonly();
    });
  }

  /** Có thay đổi chưa lưu (dùng cho guard canDeactivate). */
  get dirty(): boolean {
    return this.form.dirty;
  }

  submit(): void {
    if (this.readonly()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.revealFirstError();
      return;
    }
    this.submitted.emit(this.form.getRawValue() as T);
  }

  /** Nạp lại dữ liệu (ví dụ sau khi load từ API) và đưa form về trạng thái chưa chỉnh sửa. */
  reset(model?: Partial<T>): void {
    this.options.resetModel?.(model);
    this.options.updateInitialValue?.();
  }

  /** Sau khi lưu thành công: coi giá trị hiện tại là giá trị gốc (hết cảnh báo "chưa lưu"). */
  markAsSaved(): void {
    this.form.markAsPristine();
    this.options.updateInitialValue?.();
  }

  /**
   * Gắn lỗi từ backend: { phone: 'Số điện thoại đã tồn tại' } hoặc path lồng: { 'extra.code': '...' }.
   * Lỗi tự mất khi người dùng sửa giá trị (Angular chạy lại validator).
   */
  setServerErrors(errors: Record<string, string>): void {
    for (const [path, message] of Object.entries(errors)) {
      const control = this.form.get(path);
      if (!control) continue;
      control.setErrors({ ...control.errors, server: message });
      control.markAsTouched();
    }
    this.revealFirstError();
  }

  private revealFirstError(): void {
    // Tabs (nếu có) chuyển tới tab chứa lỗi; sau khi render xong thì focus vào field lỗi đầu tiên.
    this.events.submitFailed$.next();
    afterNextRender(
      () => {
        const el = this.host.nativeElement.querySelector<HTMLElement>(INVALID_SELECTOR);
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }
}
