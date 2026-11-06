import { Type } from '@angular/core';
import { FormlyFieldProps } from '@ngx-formly/core';
import { Observable } from 'rxjs';

/** Một lựa chọn trong select / radio. */
export interface SelectOption<V = unknown> {
  label: string;
  value: V;
  disabled?: boolean;
  /** Dòng phụ dưới nhãn (ô tìm kiếm lookup), vd "KH000123 · 0912 345 678". */
  description?: string;
  /** Dữ liệu kèm theo lựa chọn (vd lãi suất của gói vay) → đọc trong onChange qua ctx.option. */
  data?: unknown;
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
  /** Key của field cha (danh sách phụ thuộc). Người dùng đổi field cha → field này bị xoá. */
  dependsOn?: string;
}

export interface LookupProps extends DfProps {
  /** Tìm trên server theo từ khoá (danh sách lớn, không tải hết về). */
  search?: (query: string) => Observable<SelectOption[]>;
  /** Lấy nhãn của giá trị đang có (khi mở bản ghi đã lưu). Bỏ qua nếu dùng labelKey. */
  resolve?: (value: unknown) => Observable<SelectOption | null>;
  /** Field cùng nhóm đang giữ sẵn nhãn (vd customerName) → hiển thị ngay, không gọi resolve. */
  labelKey?: string;
  minQueryLength?: number;
  dependsOn?: string;
}

/** Tệp đã tải lên — giá trị của field files() là mảng FileRef. */
export interface FileRef {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface FileProps extends DfProps {
  /** Định dạng cho phép, như thuộc tính accept của <input type=file>: '.pdf,image/*' */
  accept?: string;
  maxSizeMb?: number;
  maxFiles?: number;
  /** Số tệp đang tải lên (type tự cập nhật; validator 'uploading' chặn submit khi > 0). */
  uploading?: number;
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
