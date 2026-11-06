import { FormlyFieldConfig } from '@ngx-formly/core';

export const isEmpty = (v: unknown): boolean =>
  v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

/**
 * Đếm số field đang lỗi (chỉ field lá có key, đã touched hoặc luôn hiện lỗi, không bị ẩn).
 * Dùng cho badge lỗi trên tab.
 */
export function countErrors(field: FormlyFieldConfig): number {
  if (field.hide) return 0;
  const isLeaf = !field.fieldGroup;
  const shown = field.formControl?.touched || !!field.validation?.show;
  const self = isLeaf && field.key != null && field.formControl?.invalid && shown ? 1 : 0;
  return (field.fieldGroup ?? []).reduce((sum, child) => sum + countErrors(child), self);
}

/** Field gốc của cây cấu hình (dùng để gọi checkExpressions cho toàn form). */
export function rootOf(field: FormlyFieldConfig): FormlyFieldConfig {
  let f = field;
  while (f.parent) f = f.parent;
  return f;
}

/**
 * Gán giá trị cho một field cùng nhóm, cập nhật CẢ control lẫn model.
 *
 * Lý do: Formly chỉ đồng bộ control → model cho field đang được render.
 * Field nằm ở tab chưa mở sẽ bị lệch model nếu chỉ gọi control.setValue().
 */
export function setSiblingValue(field: FormlyFieldConfig, key: string, value: unknown): void {
  field.form?.get(key)?.setValue(value);
  const model = field.model as Record<string, unknown> | undefined;
  if (model) model[key] = value;
}

/** Field (hoặc một nhóm cha của nó) đang bị ẩn. */
export function isHiddenField(field: FormlyFieldConfig): boolean {
  for (let f: FormlyFieldConfig | undefined = field; f; f = f.parent) {
    if (f.hide) return true;
  }
  return false;
}
