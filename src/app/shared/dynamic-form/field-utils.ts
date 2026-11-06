import { FormlyFieldConfig } from '@ngx-formly/core';

export const isEmpty = (v: unknown): boolean =>
  v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

/**
 * Số field đang HIỆN lỗi trong nhánh: không hợp lệ VÀ (đã touched hoặc luôn hiện lỗi).
 * Dùng cho badge lỗi trên tab, dấu ⚠ trên bước wizard.
 */
export const countShownErrors = (field: FormlyFieldConfig): number => countInvalid(field, false);

/** Số field không hợp lệ trong nhánh, kể cả field người dùng chưa chạm tới (để chặn qua bước). */
export const countAllErrors = (field: FormlyFieldConfig): number => countInvalid(field, true);

/** Chỉ đếm field lá có key, không bị ẩn. Hai hàm trên đặt tên cho cờ `includeUntouched`. */
function countInvalid(field: FormlyFieldConfig, includeUntouched: boolean): number {
  if (field.hide) return 0;
  const isLeaf = !field.fieldGroup;
  const shown = includeUntouched || field.formControl?.touched || !!field.validation?.show;
  const self = isLeaf && field.key != null && field.formControl?.invalid && shown ? 1 : 0;
  return (field.fieldGroup ?? []).reduce(
    (sum, child) => sum + countInvalid(child, includeUntouched),
    self,
  );
}

/** Đánh dấu touched mọi control trong một nhánh (vd một bước của wizard) để lỗi hiện ra. */
export function markTouched(field: FormlyFieldConfig): void {
  if (field.hide) return;
  if (field.key != null) field.formControl?.markAllAsTouched();
  else field.fieldGroup?.forEach(markTouched);
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

/**
 * NGƯỜI DÙNG vừa đổi giá trị của field. Mọi type gọi hàm này (qua DfFieldType.emitChange):
 *  1. Xoá các field phụ thuộc (props.dependsOn = key của field này), theo chuỗi: Nhóm SP → Sản phẩm
 *     → Gói vay. Field bị xoá cũng được coi là "người dùng đổi" → onChange / resets của nó chạy
 *     (ctx.option = null), nên các giá trị suy ra từ nó (vd lãi suất) cũng được xoá theo.
 *  2. Gọi props.change (resets, revalidates, onChange khai báo trong builder).
 *  3. Tính lại expressions (ẩn/hiện, required...) cho toàn form.
 */
export function notifyUserChange(field: FormlyFieldConfig, event?: unknown): void {
  cascade(field, event);
  // Handler do builder tạo (props.change) đã tự tính lại; chỉ tính khi field không có handler.
  if (!field.props?.change) field.options?.checkExpressions?.(rootOf(field));
}

function cascade(field: FormlyFieldConfig, event: unknown): void {
  for (const dep of dependentsOf(field)) {
    if (isEmpty(dep.formControl?.value)) continue;
    setSiblingValue(dep, String(dep.key), null);
    cascade(dep, { option: null });
  }
  field.props?.change?.(field, event);
}

/** Field cùng nhóm khai báo dependsOn = key của field này. */
function dependentsOf(field: FormlyFieldConfig): FormlyFieldConfig[] {
  const out: FormlyFieldConfig[] = [];
  const walk = (f: FormlyFieldConfig) => {
    if (f.props?.['dependsOn'] === field.key && f.form === field.form) out.push(f);
    f.fieldGroup?.forEach(walk);
  };
  walk(rootOf(field));
  return out;
}
