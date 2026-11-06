import { Directive } from '@angular/core';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';
import { DfProps } from './props';

/**
 * Base class cho mọi field type của base project.
 * - `readonly`: form đang ở chế độ xem (formState.readonly) → type hiển thị dạng text.
 * - `emitChange`: gọi props.change khi NGƯỜI DÙNG đổi giá trị. Component PrimeNG không phát
 *   sự kiện DOM 'change' chuẩn nên type phải tự gọi hàm này từ output của component.
 */
@Directive()
export abstract class DfFieldType<P extends DfProps = DfProps> extends FieldType<
  FieldTypeConfig<P>
> {
  get readonly(): boolean {
    return !!this.formState?.readonly;
  }

  emitChange(event?: unknown): void {
    this.props.change?.(this.field, event);
  }
}
