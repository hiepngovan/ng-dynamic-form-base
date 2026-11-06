import { FormlyFieldConfig, ValidationMessageOption } from '@ngx-formly/core';

const labelOf = (f: FormlyFieldConfig) => f.props?.label || 'Trường này';

/**
 * Message lỗi dùng chung cho toàn hệ thống.
 * Feature KHÔNG tự viết message cho các lỗi này. Cần i18n thì thay chuỗi bằng translate.instant(...).
 */
export const VALIDATION_MESSAGES: ValidationMessageOption[] = [
  { name: 'required', message: (_e, f) => `${labelOf(f)} là bắt buộc` },
  { name: 'minLength', message: (e) => `Tối thiểu ${e.requiredLength} ký tự` },
  { name: 'maxLength', message: (e) => `Tối đa ${e.requiredLength} ký tự` },
  { name: 'min', message: (e) => `Giá trị nhỏ nhất là ${e.min}` },
  { name: 'max', message: (e) => `Giá trị lớn nhất là ${e.max}` },
  { name: 'pattern', message: 'Sai định dạng' },
  { name: 'vnPhone', message: 'Số điện thoại không hợp lệ' },
  { name: 'cccd', message: 'CCCD phải gồm đúng 12 chữ số' },
  { name: 'taxCode', message: 'Mã số thuế gồm 10 số, hoặc 10 số-3 số (chi nhánh)' },
  { name: 'email', message: 'Email không hợp lệ' },
  { name: 'lte', message: (e) => `Không được lớn hơn ${e.label}` },
  { name: 'dateAfter', message: (e) => `Phải bằng hoặc sau ${e.label}` },
  /** Lỗi do backend trả về — xem AppFormComponent.setServerErrors() */
  { name: 'server', message: (e) => String(e) },
];
