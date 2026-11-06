import { Component, inject, Injector, ViewContainerRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UntypedFormGroup } from '@angular/forms';
import { FormlyFieldConfig, FormlyFormBuilder, FormlyFormOptions } from '@ngx-formly/core';

/**
 * Dựng form từ cấu hình mà KHÔNG render UI → test nhanh logic ẩn/hiện, validation, onChange.
 * Cần provideFormlyCore(DYNAMIC_FORM_CONFIG) trong TestBed.
 */
export function buildTestForm<T extends object>(
  fields: FormlyFieldConfig[],
  model: Partial<T> = {},
) {
  const form = new UntypedFormGroup({});
  const options: FormlyFormOptions = { formState: {} };
  // Type có onPopulate (vd FieldArrayType của bảng lặp) cần ViewContainerRef để Formly tạo tạm component.
  // Trong app, <formly-form> cung cấp sẵn; trong test thì lấy từ một host rỗng (thuộc tính nội bộ của Formly).
  const host = TestBed.createComponent(TestHost).componentInstance;
  Object.assign(options, { _viewContainerRef: host.vcr, _injector: TestBed.inject(Injector) });
  const root: FormlyFieldConfig = { form, model, options, fieldGroup: fields };
  TestBed.inject(FormlyFormBuilder).build(root);

  const find = (key: string, from: FormlyFieldConfig = root): FormlyFieldConfig | undefined => {
    if (from.key === key) return from;
    for (const child of from.fieldGroup ?? []) {
      const hit = find(key, child);
      if (hit) return hit;
    }
    return undefined;
  };

  return {
    form,
    model: model as T & Record<string, unknown>,
    root,
    /** Tìm field theo key (duyệt toàn cây, kể cả trong tab/section). */
    find,
    /** Gán model rồi tính lại expressions — mô phỏng người dùng đổi giá trị. */
    setModel(patch: Partial<T>) {
      Object.assign(model, patch);
      for (const [k, v] of Object.entries(patch)) form.get(k)?.setValue(v);
      options.checkExpressions?.(root);
    },
    /** Mô phỏng người dùng đổi giá trị trên UI: gán giá trị + gọi props.change như type thật. */
    userChange(key: string, value: unknown) {
      const field = find(key);
      if (!field) throw new Error(`Không tìm thấy field ${key}`);
      field.formControl?.setValue(value);
      (model as Record<string, unknown>)[key] = value;
      field.props?.change?.(field, undefined);
      options.checkExpressions?.(root);
    },
  };
}

@Component({ selector: 'df-test-host', template: '' })
class TestHost {
  readonly vcr = inject(ViewContainerRef);
}
