import { AbstractControl } from '@angular/forms';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { Observable } from 'rxjs';
import { OptionsSource, SelectOption } from '../props';
import { CompareFieldOptions, ValidatorName } from '../validation/validators';

/**
 * Tuỳ chọn của từng hàm trong FieldBuilder: đây là HỢP ĐỒNG mà dev nghiệp vụ dùng khi khai báo field.
 * Cách các tuỳ chọn được dịch sang cấu hình Formly nằm ở field-builder.ts.
 */

/** Key hợp lệ của model T — gõ sai tên field sẽ báo lỗi khi compile. */
export type Key<T> = Extract<keyof T, string>;
export type ColSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type ValidatorRef = ValidatorName | { name: ValidatorName; options: CompareFieldOptions };

/**
 * Quy tắc kiểm tra riêng của một field (không cần đăng ký validator dùng chung).
 * `test` trả về true = hợp lệ. Bỏ qua khi field rỗng (kết hợp `required` nếu cần bắt buộc).
 * Phụ thuộc field khác → khai báo `revalidates` ở field kia để kiểm tra lại khi nó đổi.
 */
export interface CheckRule<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- kiểu giá trị tuỳ field (số, ngày, chuỗi)
  test: (value: any, model: T) => boolean;
  message: string;
}

export interface ChangeContext<T> {
  /** Giá trị mới của field vừa đổi */
  value: unknown;
  /** Model của nhóm chứa field */
  model: T;
  field: FormlyFieldConfig;
  form: AbstractControl;
  /** Gán giá trị cho field khác cùng nhóm (cập nhật cả control lẫn model). */
  set: (key: Key<T>, value: unknown) => void;
  /**
   * select / radio / lookup: lựa chọn vừa chọn, kèm `data` (vd lãi suất của gói vay).
   * null = vừa xoá lựa chọn (người dùng bấm xoá, hoặc field cha đổi nên field này bị xoá theo).
   */
  option?: SelectOption | null;
}

export interface FieldOptions<T> {
  /** Độ rộng trên lưới 12 cột. Mặc định 4 (3 field / hàng). */
  col?: ColSpan;
  placeholder?: string;
  /** Gợi ý hiển thị dưới field */
  description?: string;
  tooltip?: string;
  required?: boolean;
  disabled?: boolean;
  defaultValue?: unknown;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string | RegExp;
  validators?: ValidatorRef[];
  /** Quy tắc kiểm tra riêng của field này, xem CheckRule. */
  check?: CheckRule<T> | CheckRule<T>[];
  /** Thay message mặc định cho field này, vd { min: 'Tỷ lệ bảo đảm phải từ 100% trở lên' }. */
  messages?: Record<string, string>;
  /** Chỉ hiển thị, không cho nhập. */
  readonly?: boolean;

  /** Bắt buộc theo điều kiện */
  requiredIf?: (model: T) => boolean;
  /** Ẩn theo điều kiện. Field ẩn: không validate, giá trị bị xoá. */
  hideIf?: (model: T) => boolean;
  /** Khoá theo điều kiện */
  disabledIf?: (model: T) => boolean;

  /** NGƯỜI DÙNG đổi field này → xoá giá trị các field sau. Ví dụ: Tỉnh → xoá Phường/Xã. */
  resets?: Key<T>[];
  /** NGƯỜI DÙNG đổi field này → validate lại các field sau. Ví dụ: Hạn mức → validate lại Đặt cọc. */
  revalidates?: Key<T>[];
  /** Xử lý khi NGƯỜI DÙNG đổi giá trị. Không chạy khi nạp dữ liệu, nên an toàn cho màn hình sửa. */
  onChange?: (ctx: ChangeContext<T>) => void;

  /** LỐI THOÁT: cấu hình Formly gốc, merge đè lên kết quả của builder. */
  extra?: Partial<FormlyFieldConfig>;
}

export interface TextOptions<T> extends FieldOptions<T> {
  inputType?: 'text' | 'password' | 'email' | 'tel' | 'url';
}

export interface TextareaOptions<T> extends FieldOptions<T> {
  rows?: number;
}

export interface NumberOptions<T> extends FieldOptions<T> {
  suffix?: string;
  minFractionDigits?: number;
  maxFractionDigits?: number;
}

export interface SelectOptions<T> extends FieldOptions<T> {
  options?: OptionsSource;
  filter?: boolean;
  /**
   * Danh sách phụ thuộc field cha: tải lại khi cha đổi, khoá khi cha rỗng. Dùng kèm loadOptions.
   * Người dùng đổi field cha → field này TỰ bị xoá (theo chuỗi nhiều cấp), không cần khai báo resets.
   */
  dependsOn?: Key<T>;
  loadOptions?: (parentValue: unknown) => Observable<SelectOption[]>;
}

export interface LookupOptions<T> extends FieldOptions<T> {
  /** Tìm trên server theo từ khoá. Dùng cho danh sách lớn (khách hàng, nhân viên...). */
  search: (query: string) => Observable<SelectOption[]>;
  /**
   * Key trong model giữ sẵn nhãn (vd 'customerName' do server trả kèm) → mở bản ghi cũ không phải
   * gọi resolve. Không bắt buộc là một field của form.
   */
  labelKey?: Key<T>;
  /** Lấy nhãn theo giá trị khi mở bản ghi cũ (khi không có labelKey). */
  resolve?: (value: unknown) => Observable<SelectOption | null>;
  /** Số ký tự tối thiểu trước khi tìm. Mặc định 2. */
  minQueryLength?: number;
}

export interface FileOptions<T> extends FieldOptions<T> {
  /** Định dạng cho phép: '.pdf,image/*' */
  accept?: string;
  /** Dung lượng tối đa mỗi tệp (MB). Mặc định 10. */
  maxSizeMb?: number;
  /** Số tệp tối đa. Mặc định 10. */
  maxFiles?: number;
}

export interface LayoutOptions<T> {
  col?: ColSpan;
  hideIf?: (model: T) => boolean;
}

export interface TableOptions<T, R> extends LayoutOptions<T> {
  /**
   * Bảng cố định số dòng (vd 12 tháng): tạo sẵn các dòng này, ẩn nút thêm / xoá.
   * Mỗi lần dựng (hoặc hiện lại sau khi ẩn) dùng một bản sao mới.
   */
  fixedRows?: Partial<R>[];
}

export type CalcFormat = 'money' | 'number' | 'percent' | 'date' | 'text';

export interface CalcOptions<T> extends Pick<
  FieldOptions<T>,
  'col' | 'description' | 'tooltip' | 'min' | 'max' | 'check' | 'messages' | 'hideIf' | 'extra'
> {
  /** Kiểu hiển thị kết quả. Mặc định 'money' (làm tròn đến đồng). */
  format?: CalcFormat;
  suffix?: string;
  /** Số chữ số thập phân khi làm tròn (number / percent). Mặc định 2. */
  digits?: number;
}
