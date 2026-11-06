import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FieldType, FormlyField } from '@ngx-formly/core';
import { Badge } from 'primeng/badge';
import { Tab, TabList, Tabs } from 'primeng/tabs';
import { countErrors } from '../core/field-utils';
import { FormEvents } from '../core/form-events';

/**
 * Tabs với LAZY RENDER + RENDER THEO LÔ.
 *
 * - Chỉ tab đang mở được render. KHÔNG dùng `hide` của Formly để ẩn tab: hide sẽ gỡ control khỏi
 *   form và xoá giá trị.
 * - Control của mọi tab đã được tạo lúc dựng form → validation vẫn chạy đủ trên toàn bộ field.
 * - Mở tab: vẽ section đầu tiên ngay, các section sau lần lượt mỗi frame một section, để tab nhiều
 *   field vẫn phản hồi nhanh (không chặn trình duyệt vài trăm ms).
 * - Badge đỏ = số field lỗi (đã touched) trong tab. Submit lỗi → tự chuyển tới tab lỗi đầu tiên
 *   và render toàn bộ tab ngay (để focus được vào field lỗi).
 */
@Component({
  selector: 'df-tabs',
  imports: [FormlyField, Tabs, TabList, Tab, Badge],
  host: { '(focusout)': 'refresh()' },
  template: `
    <p-tabs [value]="active()" (valueChange)="select(+($event ?? 0))" [scrollable]="true">
      <p-tablist>
        @for (tab of field.fieldGroup; track $index) {
          @if (!tab.hide) {
            <p-tab [value]="$index">
              <span>{{ tab.props?.label }}</span>
              @if (errors()[$index]; as n) {
                <p-badge [value]="n" severity="danger" class="df-tabs__badge" />
              }
            </p-tab>
          }
        }
      </p-tablist>
    </p-tabs>
    <div class="df-tabs__panel" role="tabpanel">
      @if (field.fieldGroup?.[active()]; as tab) {
        <div [class]="tab.fieldGroupClassName ?? ''">
          @for (child of tab.fieldGroup; track child; let i = $index) {
            @if (i < visible()) {
              <formly-field [field]="child" />
            }
          }
        </div>
      }
    </div>
  `,
})
export class TabsType extends FieldType implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly events = inject(FormEvents, { optional: true });

  readonly active = signal(0);
  /** Số phần tử con (section) của tab đang mở đã được render. */
  readonly visible = signal(0);
  private readonly tick = signal(0);
  private frame = 0;

  /** Số lỗi theo từng tab. Tính lại khi form đổi trạng thái, blur, hoặc submit lỗi. */
  readonly errors = computed(() => {
    this.tick();
    return (this.field.fieldGroup ?? []).map(countErrors);
  });

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => cancelAnimationFrame(this.frame));
    this.select(0);

    this.form.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refresh());

    this.events?.submitFailed$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.refresh();
      const errs = this.errors();
      const target = errs[this.active()] > 0 ? this.active() : errs.findIndex((n) => n > 0);
      if (target >= 0) this.select(target, false);
    });
  }

  /** Mở tab. progressive = false: render toàn bộ ngay (dùng khi cần focus vào field lỗi). */
  select(index: number, progressive = true): void {
    cancelAnimationFrame(this.frame);
    const total = this.field.fieldGroup?.[index]?.fieldGroup?.length ?? 0;
    this.active.set(index);
    if (!progressive) {
      this.visible.set(total);
      return;
    }
    this.visible.set(1);
    const step = () => {
      if (this.visible() >= total) return;
      this.visible.update((v) => v + 1);
      this.frame = requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }

  refresh(): void {
    this.tick.update((v) => v + 1);
  }
}
