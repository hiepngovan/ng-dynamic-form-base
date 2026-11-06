import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

export type StepMode = 'linear' | 'free';

/**
 * Kênh sự kiện trong phạm vi một <app-form> (provide ở AppFormComponent).
 * Các type con (tabs, steps...) inject để phản ứng, ví dụ: submit lỗi → chuyển tới tab có lỗi.
 */
@Injectable()
export class FormEvents {
  readonly submitFailed$ = new Subject<void>();

  // ── Wizard (type 'steps'): app-form vẽ nút Quay lại / Tiếp tục ở thanh nút của form.
  /** Bước hiện tại; null = form không có wizard. StepsType cập nhật. */
  readonly step = signal<{ index: number; count: number } | null>(null);
  /** app-form → StepsType: người dùng bấm Quay lại / Tiếp tục. */
  readonly stepNav$ = new Subject<'back' | 'next'>();
  /** linear: phải hợp lệ mới sang bước sau, nút Lưu chỉ ở bước cuối. free: đi tự do, Lưu ở mọi bước. */
  readonly stepMode = signal<StepMode>('linear');
}
