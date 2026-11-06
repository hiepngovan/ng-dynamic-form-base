import { Type } from '@angular/core';
import { FormlyFieldProps } from '@ngx-formly/core';
import { Observable } from 'rxjs';

/** Một lựa chọn trong select / radio. */
export interface SelectOption<V = unknown> {
  label: string;
  value: V;
  disabled?: boolean;
}

export type OptionsSource = SelectOption[] | Observable<SelectOption[]>;

/**
 * Props dùng chung cho mọi field type của base.
 * Thêm prop mới ở đây (kèm xử lý trong type/wrapper) thay vì dùng props['xxx'] rải rác.
 */
export interface DfProps extends FormlyFieldProps {
  /** Icon (i) cạnh label, hover để xem giải thích. */
  tooltip?: string;
  /** Field tính toán (FieldBuilder.calc): chỉ hiển thị, có kiểu riêng (ô kết quả). */
  calc?: boolean;
}

export interface SelectProps extends DfProps {
  options?: OptionsSource;
  /** Bật ô tìm kiếm. Mặc định bật khi có trên 10 lựa chọn. */
  filter?: boolean;
}

export interface NumberProps extends DfProps {
  mode?: 'decimal' | 'currency';
  currency?: string;
  suffix?: string;
  minFractionDigits?: number;
  maxFractionDigits?: number;
}

export interface CheckboxProps extends DfProps {
  /** Nhãn hiển thị cạnh ô tick (label của wrapper để trống cho gọn). */
  checkboxLabel?: string;
}

export interface ComponentProps extends DfProps {
  /** Component nhúng vào form. Component phải có input `field`. */
  component?: Type<unknown>;
}

export interface TableProps extends DfProps {
  /** Bảng cố định số dòng (vd 12 tháng): ẩn nút thêm / xoá dòng. */
  fixed?: boolean;
}
