import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AutoComplete } from 'primeng/autocomplete';
import { EMPTY, Observable, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, startWith, switchMap } from 'rxjs/operators';
import { DfFieldType } from './df-field-type';
import { isEmpty } from '../field-utils';
import { LookupProps, SelectOption } from '../props';

/**
 * Chọn từ danh sách LỚN trên server: gõ từ khoá → props.search(query) → chọn một dòng.
 * Giá trị của control là `value` của lựa chọn (vd id khách hàng); ô hiển thị nhãn.
 *
 * Nhãn của giá trị đang có (mở bản ghi cũ, nạp bản nháp): lấy từ model[labelKey] nếu có (không cần
 * là một field — vd server trả kèm customerName), nếu không thì gọi props.resolve(value).
 * Khi người dùng chọn, onChange nên gán lại model[labelKey] (ctx.set) để nhãn luôn khớp.
 */
@Component({
  selector: 'df-lookup',
  imports: [FormsModule, AutoComplete],
  template: `
    @if (readonly) {
      <div class="df-readonly">{{ selected()?.label || '—' }}</div>
    } @else {
      <p-autocomplete
        [inputId]="id"
        [ngModel]="selected()"
        (ngModelChange)="typed($event)"
        [suggestions]="suggestions()"
        optionLabel="label"
        [forceSelection]="true"
        [minQueryLength]="props.minQueryLength ?? 2"
        [delay]="300"
        [showClear]="true"
        [placeholder]="props.placeholder ?? 'Gõ để tìm…'"
        emptyMessage="Không tìm thấy"
        [showEmptyMessage]="true"
        appendTo="body"
        [disabled]="formControl.disabled"
        [invalid]="showError"
        [fluid]="true"
        (completeMethod)="query$.next($event.query)"
        (onSelect)="pick($event.value)"
        (onClear)="pick(null)"
        (onBlur)="formControl.markAsTouched()"
      >
        <ng-template #item let-o>
          <div class="df-lookup__item">
            <span>{{ o.label }}</span>
            @if (o.description) {
              <small class="muted">{{ o.description }}</small>
            }
          </div>
        </ng-template>
      </p-autocomplete>
    }
  `,
})
export class LookupType extends DfFieldType<LookupProps> implements OnInit {
  readonly selected = signal<SelectOption | null>(null);
  readonly suggestions = signal<SelectOption[]>([]);
  readonly query$ = new Subject<string>();
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    // Tìm kiếm: chỉ giữ kết quả của lần gõ mới nhất.
    this.query$
      .pipe(
        switchMap((q) => (this.props.search?.(q) ?? of([])).pipe(catchError(() => of([])))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((list) => this.suggestions.set(list));

    // Giá trị đổi từ bên ngoài (nạp bản ghi, khôi phục nháp) → cập nhật nhãn hiển thị.
    this.formControl.valueChanges
      .pipe(
        startWith(this.formControl.value),
        distinctUntilChanged(),
        switchMap((v) => this.labelFor(v)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((o) => this.selected.set(o));
  }

  /** Người dùng chọn một dòng (hoặc xoá: null). */
  pick(option: SelectOption | null): void {
    this.selected.set(option);
    this.formControl.setValue(option?.value ?? null);
    this.formControl.markAsDirty();
    this.formControl.markAsTouched();
    this.emitChange({ option });
  }

  /** ngModel phát chuỗi khi đang gõ; phát null khi forceSelection xoá chữ không khớp. */
  typed(v: unknown): void {
    if (isEmpty(v) && !isEmpty(this.formControl.value)) this.pick(null);
  }

  private labelFor(value: unknown): Observable<SelectOption | null> {
    if (isEmpty(value)) return of(null);
    const current = this.selected();
    if (current?.value === value) return of(current);
    const labelKey = this.props.labelKey;
    const label = labelKey ? (this.model as Record<string, unknown>)?.[labelKey] : null;
    if (!isEmpty(label)) return of({ value, label: String(label) });
    return this.props.resolve
      ? this.props.resolve(value).pipe(catchError(() => EMPTY))
      : of({ value, label: String(value) });
  }
}
