import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Kênh sự kiện trong phạm vi một <app-form> (provide ở AppFormComponent).
 * Các type con (tabs, ...) inject để phản ứng, ví dụ: submit lỗi → chuyển tới tab có lỗi.
 */
@Injectable()
export class FormEvents {
  readonly submitFailed$ = new Subject<void>();
}
