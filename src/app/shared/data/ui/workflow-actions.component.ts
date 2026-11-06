import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Textarea } from 'primeng/textarea';
import { AvailableAction, availableActions, Workflow } from '../workflow';

export interface WorkflowActEvent<A extends string = string> {
  action: A;
  comment: string | null;
}

/**
 * Nút thao tác theo trạng thái + quyền — component TRÌNH BÀY (chỉ input / output).
 * Thao tác cần ý kiến / xác nhận → mở hộp thoại trước khi phát (act).
 *
 * @example
 * <app-workflow-actions [workflow]="LOAN_WORKFLOW" [status]="store.entity()?.status"
 *   [can]="can" [busy]="store.acting()" (act)="onAct($event)" />
 */
@Component({
  selector: 'app-workflow-actions',
  imports: [Button, Dialog, Textarea, FormsModule],
  template: `
    @for (a of actions(); track a.key) {
      <p-button
        [label]="a.label"
        [icon]="a.icon ?? ''"
        [severity]="a.severity"
        [outlined]="a.severity === 'secondary' || a.severity === 'danger'"
        [loading]="busy() === a.key"
        [disabled]="!!busy() || disabled()"
        (onClick)="start(a)"
      />
    }

    <p-dialog
      [header]="pending()?.label ?? ''"
      [visible]="!!pending()"
      (visibleChange)="$event || pending.set(null)"
      [modal]="true"
      [style]="{ width: 'min(480px, 92vw)' }"
      [draggable]="false"
    >
      @if (pending(); as a) {
        @if (a.confirm) {
          <p class="wf-dialog__confirm">{{ a.confirm }}</p>
        }
        @if (a.comment) {
          <label class="df-field__label" for="wf-comment">
            Ý kiến
            @if (a.comment === 'required') {
              <span class="df-field__req">*</span>
            }
          </label>
          <textarea
            pTextarea
            id="wf-comment"
            rows="4"
            [fluid]="true"
            [(ngModel)]="comment"
            [invalid]="tried() && !commentOk()"
          ></textarea>
          @if (tried() && !commentOk()) {
            <small class="df-field__error">Vui lòng nhập ý kiến</small>
          }
        }
      }
      <ng-template #footer>
        <p-button label="Huỷ" severity="secondary" [text]="true" (onClick)="pending.set(null)" />
        <p-button
          [label]="pending()?.label ?? 'Đồng ý'"
          [severity]="pending()?.severity"
          (onClick)="confirm()"
        />
      </ng-template>
    </p-dialog>
  `,
  host: { class: 'wf-actions' },
})
export class WorkflowActionsComponent<S extends string, A extends string, P extends string> {
  readonly workflow = input.required<Workflow<S, A, P>>();
  readonly status = input<S | null | undefined>(null);
  /** Kiểm tra quyền, vd (p) => app.can(p). Đọc signal bên trong → nút tự cập nhật khi đổi quyền. */
  readonly can = input<(permission: P) => boolean>(() => true);
  /** Thao tác đang chạy (store.acting()) → nút đó quay, các nút khác khoá. */
  readonly busy = input<string | null>(null);
  readonly disabled = input(false);

  readonly act = output<WorkflowActEvent<A>>();

  readonly actions = computed(() => availableActions(this.workflow(), this.status(), this.can()));
  readonly pending = signal<AvailableAction<S, A, P> | null>(null);
  readonly tried = signal(false);
  comment = '';

  start(a: AvailableAction<S, A, P>): void {
    if (!a.comment && !a.confirm) {
      this.act.emit({ action: a.key, comment: null });
      return;
    }
    this.comment = '';
    this.tried.set(false);
    this.pending.set(a);
  }

  commentOk(): boolean {
    return this.pending()?.comment !== 'required' || this.comment.trim().length > 0;
  }

  confirm(): void {
    const a = this.pending();
    if (!a) return;
    this.tried.set(true);
    if (!this.commentOk()) return;
    this.pending.set(null);
    this.act.emit({ action: a.key, comment: this.comment.trim() || null });
  }
}
