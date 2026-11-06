import { DatePipe } from '@angular/common';
import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, UntypedFormGroup } from '@angular/forms';
import { FormlyFieldConfig, FormlyForm, FormlyFormOptions } from '@ngx-formly/core';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { debounceTime } from 'rxjs/operators';
import { focusFirstError } from './focus-error';
import { FormEvents, StepMode } from './form-events';
import { clearDraft, Draft, readDraft, writeDraft } from './form-draft';

/** Thời gian chờ sau lần gõ cuối trước khi lưu nháp. */
const DRAFT_DEBOUNCE_MS = 1000;

/**
 * Component bọc form dùng chung. MỌI màn hình nhập liệu đều dùng component này.
 *
 * - Submit: markAllAsTouched → lỗi thì chuyển tới tab / bước chứa lỗi và focus vào field lỗi đầu tiên.
 * - Dữ liệu submit lấy từ FormGroup (getRawValue), là nguồn dữ liệu chuẩn kể cả với tab chưa mở.
 * - setServerErrors(): gắn lỗi validate do backend trả về vào đúng field.
 * - readonly: chế độ xem, dùng chung cấu hình với chế độ sửa.
 * - Wizard (f.steps): nút Quay lại / Tiếp tục nằm ở thanh nút; stepMode = linear | free.
 * - draftKey: tự lưu nháp trên trình duyệt khi đang nhập, lần sau mở lại thì đề nghị khôi phục.
 */
@Component({
  selector: 'app-form',
  imports: [ReactiveFormsModule, FormlyForm, Button, Message, DatePipe],
  providers: [FormEvents],
  // F5 / đóng tab ngay sau khi gõ (chưa hết thời gian chờ) → vẫn lưu được lần nhập cuối.
  host: { '(window:pagehide)': 'autosave()' },
  template: `
    @if (pendingDraft(); as d) {
      @if (!readonly()) {
        <p-message severity="info" styleClass="df-form__draft">
          <span>
            Có bản nháp chưa lưu lúc {{ d.savedAt | date: 'HH:mm dd/MM/yyyy' }}. Khôi phục để nhập
            tiếp?
          </span>
          <p-button label="Khôi phục" size="small" (onClick)="restoreDraft()" />
          <p-button
            label="Bỏ bản nháp"
            size="small"
            severity="secondary"
            [text]="true"
            (onClick)="discardDraft()"
          />
        </p-message>
      }
    }
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
          @if (draftSavedAt(); as at) {
            <span class="df-form__status muted">
              <i class="pi pi-cloud"></i> Đã lưu nháp trên máy lúc {{ at | date: 'HH:mm:ss' }}
            </span>
          }
          <ng-content select="[formActions]" />
          @if (events.step(); as s) {
            @if (s.index > 0) {
              <p-button
                label="Quay lại"
                icon="pi pi-arrow-left"
                severity="secondary"
                [outlined]="true"
                (onClick)="events.stepNav$.next('back')"
              />
            }
            @if (s.index < s.count - 1) {
              <p-button
                label="Tiếp tục"
                icon="pi pi-arrow-right"
                iconPos="right"
                [outlined]="showSubmit()"
                (onClick)="events.stepNav$.next('next')"
              />
            }
          }
          @if (showSubmit()) {
            <p-button
              type="submit"
              [label]="submitLabel()"
              [icon]="submitIcon()"
              [loading]="loading()"
            />
          }
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
  /** Form có wizard (f.steps): linear = tạo mới đi tuần tự; free = sửa, đi tự do, Lưu ở mọi bước. */
  readonly stepMode = input<StepMode>('linear');
  /**
   * Bật lưu nháp trên trình duyệt, vd 'loan:new' hoặc 'loan:' + id. null = tắt.
   * Chỉ truyền khi model đã nạp xong (khôi phục nháp ghi đè lên model hiện tại).
   */
  readonly draftKey = input<string | null>(null);

  /** Phát khi form hợp lệ. Giá trị = form.getRawValue() (gồm cả field disabled). */
  readonly submitted = output<T>();
  readonly modelChange = output<T>();

  /** Form động: cấu trúc do cấu hình quyết định nên dùng kiểu untyped. */
  readonly form = new UntypedFormGroup({});
  readonly options: FormlyFormOptions = { formState: { readonly: false } };

  protected readonly events = inject(FormEvents);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** Bản nháp tìm thấy khi mở form, đang chờ người dùng chọn khôi phục / bỏ. */
  readonly pendingDraft = signal<Draft<Partial<T>> | null>(null);
  readonly draftSavedAt = signal<Date | null>(null);

  protected readonly showSubmit = computed(() => {
    const s = this.events.step();
    return !s || this.events.stepMode() === 'free' || s.index === s.count - 1;
  });

  constructor() {
    effect(() => {
      this.options.formState.readonly = this.readonly();
    });
    effect(() => this.events.stepMode.set(this.stepMode()));
    effect(() => {
      const key = this.draftKey();
      untracked(() => {
        this.pendingDraft.set(key ? readDraft<Partial<T>>(key) : null);
        this.draftSavedAt.set(null);
      });
    });

    this.form.valueChanges
      .pipe(debounceTime(DRAFT_DEBOUNCE_MS), takeUntilDestroyed())
      .subscribe(() => this.autosave());
  }

  /** Có thay đổi chưa lưu (dùng cho guard canDeactivate). */
  get dirty(): boolean {
    return this.form.dirty;
  }

  /** Giá trị hiện tại (gồm field disabled), không validate. */
  value(): T {
    return this.form.getRawValue() as T;
  }

  /** Validate toàn form; lỗi → hiện lỗi, chuyển tới tab / bước lỗi, focus. Trả về true nếu hợp lệ. */
  validate(): boolean {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.revealFirstError();
      return false;
    }
    return true;
  }

  submit(): void {
    if (this.readonly()) return;
    // Enter ở giữa wizard tuần tự = Tiếp tục, không submit cả form.
    if (!this.showSubmit()) {
      this.events.stepNav$.next('next');
      return;
    }
    if (this.validate()) this.submitted.emit(this.value());
  }

  /** Nạp lại dữ liệu (ví dụ sau khi load từ API) và đưa form về trạng thái chưa chỉnh sửa. */
  reset(model?: Partial<T>): void {
    this.options.resetModel?.(model);
    this.options.updateInitialValue?.();
  }

  /** Sau khi lưu thành công: coi giá trị hiện tại là giá trị gốc, xoá bản nháp. */
  markAsSaved(): void {
    this.form.markAsPristine();
    this.options.updateInitialValue?.();
    const key = this.draftKey();
    if (key) clearDraft(key);
    this.pendingDraft.set(null);
    this.draftSavedAt.set(null);
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

  restoreDraft(): void {
    const draft = this.pendingDraft();
    if (!draft) return;
    // resetModel dựng lại toàn bộ control từ model → đúng cả với field ở tab / bước chưa mở.
    this.options.resetModel?.({ ...structuredClone(this.model()), ...draft.value });
    this.form.markAsDirty();
    this.pendingDraft.set(null);
    this.draftSavedAt.set(draft.savedAt);
  }

  discardDraft(): void {
    const key = this.draftKey();
    if (key) clearDraft(key);
    this.pendingDraft.set(null);
  }

  protected autosave(): void {
    const key = this.draftKey();
    if (!key || !this.form.dirty || this.readonly()) return;
    // Kèm cả các key của model không phải field (vd nhãn của lookup) để khôi phục hiển thị đúng.
    const at = writeDraft(key, { ...this.model(), ...this.value() });
    if (at) {
      // Bản nháp cũ (nếu người dùng chưa chọn) đã bị thay bằng lần nhập này.
      this.pendingDraft.set(null);
      this.draftSavedAt.set(at);
    }
  }

  private revealFirstError(): void {
    // Tabs / steps (nếu có) chuyển tới phần chứa lỗi; sau khi render xong thì focus vào field lỗi.
    this.events.submitFailed$.next();
    focusFirstError(this.host.nativeElement, this.injector);
  }
}
