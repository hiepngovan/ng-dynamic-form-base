import { AbstractControl, ValidationErrors, Validators } from '@angular/forms';
import { ConfigOption, FormlyFieldConfig } from '@ngx-formly/core';
import { isEmpty } from '../core/field-utils';

/** Tên các validator đã đăng ký — builder dùng type này để bắt lỗi gõ sai tên khi compile. */
export type ValidatorName = 'vnPhone' | 'cccd' | 'taxCode' | 'email' | 'lte' | 'dateAfter';

/** Tham số cho validator so sánh với một field khác CÙNG NHÓM (cùng FormGroup cha). */
export interface CompareFieldOptions {
  /** key của field để so sánh */
  field: string;
  /** nhãn của field đó, dùng trong message lỗi */
  label: string;
}

function compareTarget(c: AbstractControl, opts: Record<string, unknown> | undefined) {
  const { field, label } = (opts ?? {}) as Partial<CompareFieldOptions>;
  return { other: field ? c.parent?.get(field)?.value : undefined, label };
}

export function vnPhone(c: AbstractControl): ValidationErrors | null {
  if (isEmpty(c.value)) return null;
  const v = String(c.value).replace(/[\s.-]/g, '');
  return /^(0|\+84)(3|5|7|8|9)\d{8}$/.test(v) ? null : { vnPhone: true };
}

export function cccd(c: AbstractControl): ValidationErrors | null {
  if (isEmpty(c.value)) return null;
  return /^\d{12}$/.test(String(c.value)) ? null : { cccd: true };
}

export function taxCode(c: AbstractControl): ValidationErrors | null {
  if (isEmpty(c.value)) return null;
  return /^\d{10}(-\d{3})?$/.test(String(c.value)) ? null : { taxCode: true };
}

export function email(c: AbstractControl): ValidationErrors | null {
  return isEmpty(c.value) ? null : Validators.email(c);
}

/** Giá trị số <= field khác. Ví dụ: Đặt cọc <= Hạn mức. */
export function lte(
  c: AbstractControl,
  _field: FormlyFieldConfig,
  opts?: Record<string, unknown>,
): ValidationErrors | null {
  const { other, label } = compareTarget(c, opts);
  if (isEmpty(c.value) || isEmpty(other)) return null;
  return Number(c.value) <= Number(other) ? null : { lte: { label } };
}

/** Ngày >= ngày ở field khác. Ví dụ: Ngày hết hạn >= Ngày cấp. */
export function dateAfter(
  c: AbstractControl,
  _field: FormlyFieldConfig,
  opts?: Record<string, unknown>,
): ValidationErrors | null {
  const { other, label } = compareTarget(c, opts);
  if (isEmpty(c.value) || isEmpty(other)) return null;
  const toTime = (v: unknown) => new Date(v as string | number | Date).getTime();
  return toTime(c.value) >= toTime(other) ? null : { dateAfter: { label } };
}

export const VALIDATORS: NonNullable<ConfigOption['validators']> = [
  { name: 'vnPhone', validation: vnPhone },
  { name: 'cccd', validation: cccd },
  { name: 'taxCode', validation: taxCode },
  { name: 'email', validation: email },
  { name: 'lte', validation: lte },
  { name: 'dateAfter', validation: dateAfter },
];
