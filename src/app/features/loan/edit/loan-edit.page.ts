import { DatePipe, Location } from '@angular/common';
import { Component, computed, effect, inject, input, untracked, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { ProgressBar } from 'primeng/progressbar';
import { Tag } from 'primeng/tag';
import { AppStore, Permission } from '../../../core/app.store';
import { MasterDataService } from '../../../core/master-data.service';
import { ApiError, isApiError } from '../../../shared/data';
import { AppFormComponent, HasUnsavedChanges } from '../../../shared/dynamic-form';
import {
  isEditable,
  WorkflowActEvent,
  WorkflowActionsComponent,
  WorkflowHistoryComponent,
} from '../../../shared/workflow';
import { buildLoanForm } from '../form/loan.form';
import { LoanApi } from '../loan.api';
import { LOAN_WORKFLOW, LoanAction, LoanApplication } from '../loan.model';
import { LoanDetailStore } from './loan-detail.store';

/**
 * Màn hình lập / sửa / xử lý hồ sơ vay: /loans/new và /loans/:id.
 *
 * - Tạo mới: wizard tuần tự 3 bước, lưu nháp tự động trên trình duyệt.
 * - Hồ sơ đã có: đi tự do giữa các bước; sửa được hay không tuỳ trạng thái (LOAN_WORKFLOW) + quyền.
 * - Nút thao tác (Gửi duyệt, Duyệt, Trả lại...) sinh từ LOAN_WORKFLOW theo trạng thái + quyền.
 */
@Component({
  selector: 'app-loan-edit-page',
  imports: [
    AppFormComponent,
    WorkflowActionsComponent,
    WorkflowHistoryComponent,
    Button,
    Tag,
    Message,
    ProgressBar,
    RouterLink,
    DatePipe,
  ],
  providers: [LoanDetailStore],
  template: `
    <header class="page-header">
      <div>
        <a class="back-link" routerLink="/loans" (click)="back($event)">
          <i class="pi pi-arrow-left"></i> Danh sách hồ sơ vay
        </a>
        <h1>{{ title() }}</h1>
        <p class="muted">
          @if (store.entity(); as e) {
            <p-tag [value]="e.code ?? ''" severity="secondary" />
            @if (e.status; as s) {
              <p-tag [value]="workflow.states[s].label" [severity]="workflow.states[s].severity" />
            }
            <span>{{ e.customerName }}</span>
          }
          @if (id() && !editable() && store.entity()) {
            <p-tag value="Chỉ xem" severity="warn" />
          }
        </p>
      </div>
      @if (store.entity(); as e) {
        <div class="page-header__actions">
          <app-workflow-actions
            [workflow]="workflow"
            [status]="e.status"
            [can]="can"
            [busy]="store.acting() ?? (store.saving() ? 'save' : null)"
            (act)="onAct($event)"
          />
        </div>
      }
    </header>

    @if (store.loading()) {
      <p-progressbar mode="indeterminate" styleClass="page-progress" />
    }

    @if (store.error(); as err) {
      @if (err.status === 404) {
        <p-message severity="warn">{{ err.message }}</p-message>
      }
    }

    @if (lastReturn(); as r) {
      <p-message severity="warn" styleClass="loan-return">
        <div>
          <strong>Hồ sơ bị trả lại để bổ sung</strong> — {{ r.by }},
          {{ r.at | date: 'HH:mm dd/MM/yyyy' }}
          <div>{{ r.comment }}</div>
        </div>
      </p-message>
    }

    @if (!loadFailed()) {
      <app-form
        [fields]="fields"
        [model]="model()"
        [readonly]="!editable()"
        [loading]="store.saving()"
        [stepMode]="id() ? 'free' : 'linear'"
        [draftKey]="draftKey()"
        [submitLabel]="id() ? 'Lưu' : 'Tạo hồ sơ'"
        (submitted)="save($event)"
      >
        <p-button formActions label="Huỷ" severity="secondary" [text]="true" (onClick)="back()" />
      </app-form>
    }

    @if (store.entity()?.history; as history) {
      <section class="loan-history">
        <h2>Lịch sử xử lý</h2>
        <app-workflow-history [workflow]="workflow" [events]="history" />
      </section>
    }
  `,
})
export class LoanEditPage implements HasUnsavedChanges {
  readonly id = input<string>();

  protected readonly store = inject(LoanDetailStore);
  protected readonly app = inject(AppStore);
  protected readonly workflow = LOAN_WORKFLOW;
  private readonly toast = inject(MessageService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly formRef = viewChild(AppFormComponent);

  readonly fields = buildLoanForm(inject(LoanApi), inject(MasterDataService));

  /** Bản sao cho form (form không được sửa trực tiếp state của store). */
  readonly model = computed(() => structuredClone(this.store.entity() ?? {}));
  readonly editable = computed(
    () => this.app.can('loan.edit') && isEditable(LOAN_WORKFLOW, this.store.entity()?.status),
  );
  readonly loadFailed = computed(() => !!this.store.error() && !this.store.entity());
  /** Lưu nháp khi sửa được và dữ liệu đã nạp xong (khôi phục nháp ghi đè lên dữ liệu đã nạp). */
  readonly draftKey = computed(() =>
    this.editable() && (!this.id() || this.store.entity()) ? `loan:${this.id() ?? 'new'}` : null,
  );
  readonly title = computed(() =>
    this.id() ? `Hồ sơ vay ${this.store.entity()?.code ?? ''}` : 'Lập hồ sơ vay',
  );
  /** Lần trả lại gần nhất, hiện khi hồ sơ đang ở trạng thái Trả lại bổ sung. */
  readonly lastReturn = computed(() => {
    const e = this.store.entity();
    if (e?.status !== 'RETURNED') return null;
    return [...(e.history ?? [])].reverse().find((h) => h.action === 'return') ?? null;
  });

  /** Truyền cho app-workflow-actions: đọc signal quyền → nút tự cập nhật khi đổi vai trò. */
  readonly can = (p: Permission) => this.app.can(p);

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => (id ? this.store.load(id) : this.store.reset()));
    });
  }

  hasUnsavedChanges(): boolean {
    return !!this.formRef()?.dirty;
  }

  async save(value: Partial<LoanApplication>): Promise<boolean> {
    try {
      const saved = await this.store.save(value);
      this.formRef()?.markAsSaved();
      this.toast.add({ severity: 'success', summary: 'Đã lưu', detail: `Hồ sơ ${saved.code}` });
      if (!this.id()) void this.router.navigate(['/loans', saved.id], { replaceUrl: true });
      return true;
    } catch (e) {
      this.showError(e, 'Lưu không thành công');
      return false;
    }
  }

  async onAct({ action, comment }: WorkflowActEvent<LoanAction>): Promise<void> {
    const def = LOAN_WORKFLOW.actions[action];
    const form = this.formRef();
    if (def.requiresValidForm && form) {
      if (!form.validate()) {
        this.toast.add({
          severity: 'warn',
          summary: 'Hồ sơ chưa đầy đủ',
          detail: `Hoàn thiện các trường báo lỗi trước khi ${def.label.toLowerCase()}`,
        });
        return;
      }
      // Có thay đổi chưa lưu → lưu trước, rồi mới chuyển trạng thái.
      if (form.dirty && !(await this.save(form.value() as Partial<LoanApplication>))) return;
    }
    try {
      await this.store.act(action, comment);
      this.formRef()?.markAsSaved();
      this.toast.add({ severity: 'success', summary: `${def.label}: thành công` });
    } catch (e) {
      this.showError(e, `${def.label} không thành công`);
    }
  }

  back(event?: Event): void {
    if (this.router.lastSuccessfulNavigation()?.previousNavigation) {
      event?.preventDefault();
      this.location.back();
    } else if (!event) {
      void this.router.navigate(['/loans']);
    }
  }

  /** 400: gắn lỗi theo field (nếu có) + thông báo. Lỗi khác: interceptor đã hiện thông báo. */
  private showError(e: unknown, summary: string): void {
    if (!isApiError(e) || e.status !== 400) return;
    const err = e as ApiError;
    if (err.fieldErrors) this.formRef()?.setServerErrors(err.fieldErrors);
    this.toast.add({ severity: 'error', summary, detail: err.message });
  }
}
