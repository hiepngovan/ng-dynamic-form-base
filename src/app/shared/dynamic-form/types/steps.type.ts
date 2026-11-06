import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FieldType, FormlyField } from '@ngx-formly/core';
import { countErrors, markTouched } from '../field-utils';
import { focusFirstError } from '../form/focus-error';
import { FormEvents } from '../form/form-events';

/**
 * Wizard nhiều bước. Cấu hình qua builder: f.steps(f.step('Bước 1', [...]), f.step(...)).
 *
 * - Giống tabs: chỉ bước đang mở được render, control của mọi bước có sẵn → validate đủ.
 * - Chế độ (input stepMode của app-form):
 *   · linear (tạo mới): bấm Tiếp tục → bước hiện tại phải hợp lệ; không nhảy cóc qua bước lỗi;
 *     nút Lưu chỉ hiện ở bước cuối.
 *   · free (sửa bản ghi đã có): đi tới bước bất kỳ, Lưu ở mọi bước.
 *   Chế độ xem (readonly): luôn đi tự do.
 * - Nút Quay lại / Tiếp tục do app-form vẽ ở thanh nút (giao tiếp qua FormEvents).
 * - Submit lỗi → chuyển tới bước có lỗi đầu tiên.
 * - Không hỗ trợ ẩn cả một bước (hideIf trên step): đánh số bước sẽ nhảy, khó theo dõi.
 */
@Component({
  selector: 'df-steps',
  imports: [FormlyField],
  host: { '(focusout)': 'refresh()' },
  template: `
    <ol class="df-steps">
      @for (step of field.fieldGroup; track $index; let i = $index) {
        <li
          class="df-steps__item"
          [class.df-steps__item--active]="i === active()"
          [class.df-steps__item--done]="state()[i] === 'done'"
          [class.df-steps__item--error]="state()[i] === 'error'"
        >
          <button
            type="button"
            class="df-steps__btn"
            [attr.aria-current]="i === active() ? 'step' : null"
            (click)="goTo(i)"
          >
            <span class="df-steps__num">
              @switch (state()[i]) {
                @case ('done') {
                  <i class="pi pi-check"></i>
                }
                @case ('error') {
                  <i class="pi pi-exclamation-triangle"></i>
                }
                @default {
                  {{ i + 1 }}
                }
              }
            </span>
            <span class="df-steps__label">{{ step.props?.label }}</span>
          </button>
        </li>
      }
    </ol>
    <div class="df-steps__panel" role="region" [attr.aria-label]="current()?.props?.label">
      @if (current(); as step) {
        <div [class]="step.fieldGroupClassName ?? ''">
          @for (child of step.fieldGroup; track child) {
            <formly-field [field]="child" />
          }
        </div>
      }
    </div>
  `,
})
export class StepsType extends FieldType implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  // Formly có thể tạo tạm component khi dựng form (ngoài <app-form>) → không bắt buộc có FormEvents.
  private readonly events = inject(FormEvents, { optional: true }) ?? new FormEvents();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly active = signal(0);
  /** Bước xa nhất đã tới (để đánh dấu ✓ cho các bước đã qua). */
  private readonly reached = signal(0);
  private readonly tick = signal(0);

  readonly current = computed(() => this.field.fieldGroup?.[this.active()]);

  /** Trạng thái hiển thị của từng bước: lỗi (đã touched) / đã xong / chưa tới. */
  readonly state = computed(() => {
    this.tick();
    return (this.field.fieldGroup ?? []).map((step, i) =>
      countErrors(step) > 0
        ? 'error'
        : i < this.reached() && i !== this.active() && countErrors(step, true) === 0
          ? 'done'
          : 'todo',
    );
  });

  private get free(): boolean {
    return !!this.formState?.readonly || this.events.stepMode() === 'free';
  }

  ngOnInit(): void {
    this.publish();
    this.destroyRef.onDestroy(() => this.events.step.set(null));

    this.events.stepNav$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((dir) =>
        dir === 'next' ? this.goTo(this.active() + 1) : this.show(this.active() - 1),
      );

    this.form.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refresh());

    this.events.submitFailed$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.refresh();
      const first = this.steps().findIndex((s) => countErrors(s, true) > 0);
      if (first >= 0) this.show(first);
    });
  }

  /**
   * Tới bước `target`. Đi lùi luôn được. Đi tới (linear): kiểm tra lần lượt các bước ở giữa,
   * dừng ở bước lỗi đầu tiên và focus vào field lỗi.
   */
  goTo(target: number): void {
    const steps = this.steps();
    if (target < 0 || target >= steps.length) return;
    if (this.free || target <= this.active()) {
      this.show(target);
      return;
    }
    for (let i = this.active(); i < target; i++) {
      markTouched(steps[i]);
      if (countErrors(steps[i], true) > 0) {
        this.show(i);
        this.refresh();
        focusFirstError(this.host.nativeElement, this.injector);
        return;
      }
    }
    this.show(target);
  }

  refresh(): void {
    this.tick.update((v) => v + 1);
  }

  private show(index: number): void {
    if (index < 0 || index >= this.steps().length) return;
    this.active.set(index);
    this.reached.update((r) => Math.max(r, index));
    this.publish();
    this.host.nativeElement.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  private publish(): void {
    this.events.step.set({ index: this.active(), count: this.steps().length });
  }

  private steps() {
    return this.field.fieldGroup ?? [];
  }
}
