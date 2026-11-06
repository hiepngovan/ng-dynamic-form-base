import { Location } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { ProgressBar } from 'primeng/progressbar';
import { Tag } from 'primeng/tag';
import { AppStore } from '../../../core/app.store';
import { MasterDataService } from '../../../core/master-data.service';
import { ApiError } from '../../../shared/data';
import { AppFormComponent, HasUnsavedChanges } from '../../../shared/dynamic-form';
import { Customer } from '../customer.model';
import { buildCustomerForm, countInputFields } from '../form/customer.form';
import { CustomerDetailStore } from './customer-detail.store';

/**
 * Màn hình xem / sửa khách hàng: /customers/new và /customers/:id.
 * Luồng: id (route) → store.load → form hiển thị bản sao → submit → store.save → toast.
 * Form KHÔNG được sửa trực tiếp state của store: model của form là bản sao (structuredClone).
 */
@Component({
  selector: 'app-customer-edit-page',
  imports: [AppFormComponent, Button, Tag, Message, ProgressBar, RouterLink],
  providers: [CustomerDetailStore],
  template: `
    <header class="page-header">
      <div>
        <a class="back-link" routerLink="/customers" (click)="back($event)">
          <i class="pi pi-arrow-left"></i> Danh sách khách hàng
        </a>
        <h1>{{ title() }}</h1>
        <p class="muted">
          @if (store.entity()?.code; as code) {
            <p-tag [value]="code" severity="secondary" />
          }
          <p-tag [value]="fieldCount + ' field'" severity="info" />
          @if (!canEdit()) {
            <p-tag value="Chỉ xem (không có quyền sửa)" severity="warn" />
          }
        </p>
      </div>
      @if (canEdit()) {
        <div class="page-header__actions">
          <p-button
            [label]="viewMode() ? 'Chuyển sang sửa' : 'Chế độ xem'"
            [icon]="viewMode() ? 'pi pi-pencil' : 'pi pi-eye'"
            severity="secondary"
            [outlined]="true"
            (onClick)="viewMode.set(!viewMode())"
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

    @if (!loadFailed()) {
      <app-form
        [fields]="fields"
        [model]="model()"
        [readonly]="!canEdit() || viewMode()"
        [loading]="store.saving()"
        submitLabel="Lưu khách hàng"
        (submitted)="save($event)"
      >
        <p-button formActions label="Huỷ" severity="secondary" [text]="true" (onClick)="back()" />
      </app-form>
    }
  `,
})
export class CustomerEditPage implements HasUnsavedChanges {
  /** Tham số :id của route (withComponentInputBinding). Không có = tạo mới. */
  readonly id = input<string>();

  protected readonly store = inject(CustomerDetailStore);
  protected readonly app = inject(AppStore);
  private readonly toast = inject(MessageService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly formRef = viewChild(AppFormComponent);

  /** Tạo cấu hình MỘT LẦN (không gọi hàm build trong template). */
  readonly fields = buildCustomerForm(inject(MasterDataService));
  readonly fieldCount = countInputFields(this.fields);

  /**
   * Bản sao dữ liệu cho form. Formly sửa trực tiếp object model; nếu đưa object của store, state
   * sẽ bị đổi ngầm (không qua store, không phát tín hiệu) — NgRx không chặn việc này lúc chạy.
   */
  readonly model = computed(() => structuredClone(this.store.entity() ?? {}));
  readonly viewMode = signal(false);
  readonly canEdit = computed(() => this.app.can('customer.edit'));
  readonly loadFailed = computed(() => !!this.store.error() && !this.store.entity());
  readonly title = computed(() =>
    this.id() ? (this.store.entity()?.fullName ?? 'Khách hàng') : 'Khách hàng mới',
  );

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => (id ? this.store.load(id) : this.store.reset()));
    });
  }

  hasUnsavedChanges(): boolean {
    return !!this.formRef()?.dirty;
  }

  async save(value: Partial<Customer>): Promise<void> {
    try {
      const saved = await this.store.save(value);
      this.formRef()?.markAsSaved();
      this.toast.add({
        severity: 'success',
        summary: 'Đã lưu',
        detail: `Mã khách hàng ${saved.code}`,
      });
      if (!this.id()) void this.router.navigate(['/customers', saved.id], { replaceUrl: true });
    } catch (e) {
      const err = e as ApiError;
      if (err.fieldErrors) {
        this.formRef()?.setServerErrors(err.fieldErrors);
        this.toast.add({
          severity: 'error',
          summary: 'Lưu không thành công',
          detail: 'Vui lòng kiểm tra các trường báo lỗi',
        });
      }
      // Lỗi khác (mạng, 5xx…): interceptor đã hiện thông báo.
    }
  }

  /** Quay lại danh sách, giữ nguyên trang / bộ lọc nếu vừa đi từ danh sách sang. */
  back(event?: Event): void {
    if (this.router.lastSuccessfulNavigation()?.previousNavigation) {
      event?.preventDefault();
      this.location.back();
    } else if (!event) {
      void this.router.navigate(['/customers']);
    }
  }
}
