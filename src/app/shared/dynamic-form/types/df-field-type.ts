import { Directive } from '@angular/core';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';
import { notifyUserChange } from '../field-utils';
import { DfProps } from '../props';

/**
 * Base class cho mọi field type của base project.
 * - `readonly`: form đang ở chế độ xem (formState.readonly) HOẶC field chỉ hiển thị (props.readonly,
 *   vd field tính toán) → type hiển thị dạng text.
 * - `emitChange`: báo NGƯỜI DÙNG vừa đổi giá trị (xoá field phụ thuộc, chạy onChange...).
 *   Component PrimeNG không phát sự kiện DOM 'change' chuẩn nên type phải tự gọi hàm này từ
 *   output của component. Xem notifyUserChange.
 */
@Directive()
export abstract class DfFieldType<P extends DfProps = DfProps> extends FieldType<
  FieldTypeConfig<P>
> {
  get readonly(): boolean {
    return !!this.formState?.readonly || !!this.props.readonly;
  }

  emitChange(event?: unknown): void {
    notifyUserChange(this.field, event);
  }
}
