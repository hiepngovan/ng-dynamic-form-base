import { Type } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { Observable, of } from 'rxjs';
import { distinctUntilChanged, startWith, switchMap } from 'rxjs/operators';
import { isEmpty, rootOf, setSiblingValue } from '../core/field-utils';
import { OptionsSource, SelectOption } from '../core/props';
import { CompareFieldOptions, ValidatorName } from '../validation/validators';

type FieldExpressions = NonNullable<FormlyFieldConfig['expressions']>;

/** Key hợp lệ của model T — gõ sai tên field sẽ báo lỗi khi compile. */
export type Key<T> = Extract<keyof T, string>;
export type ColSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type ValidatorRef = ValidatorName | { name: ValidatorName; options: CompareFieldOptions };

export interface ChangeContext<T> {
  /** Giá trị mới của field vừa đổi */
  value: unknown;
  /** Model của nhóm chứa field */
  model: T;
  field: FormlyFieldConfig;
  form: AbstractControl;
  /** Gán giá trị cho field khác cùng nhóm (cập nhật cả control lẫn model). */
  set: (key: Key<T>, value: unknown) => void;
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
  /** Danh sách phụ thuộc field cha: tải lại khi cha đổi, khoá khi cha rỗng. Dùng kèm loadOptions. */
  dependsOn?: Key<T>;
  loadOptions?: (parentValue: unknown) => Observable<SelectOption[]>;
}

export interface LayoutOptions<T> {
  col?: ColSpan;
  hideIf?: (model: T) => boolean;
}

/**
 * Bộ hàm khai báo field. Dev nghiệp vụ chỉ dùng class này, không viết FormlyFieldConfig tay.
 *
 * @example
 * const f = fieldsFor<Customer>();
 * f.text('fullName', 'Họ tên', { required: true, maxLength: 200 })
 */
export class FieldBuilder<T> {
  // ───────────── Field nhập liệu ─────────────

  text(key: Key<T>, label: string, o: TextOptions<T> = {}): FormlyFieldConfig {
    const { inputType, ...rest } = o;
    return this.make('input', key, label, rest, { type: inputType });
  }

  textarea(key: Key<T>, label: string, o: TextareaOptions<T> = {}): FormlyFieldConfig {
    const { rows, ...rest } = o;
    return this.make('textarea', key, label, { col: 12, ...rest }, { rows });
  }

  email(key: Key<T>, label: string, o: FieldOptions<T> = {}): FormlyFieldConfig {
    return this.text(key, label, {
      maxLength: 254,
      ...o,
      validators: ['email', ...(o.validators ?? [])],
    });
  }

  phone(key: Key<T>, label: string, o: FieldOptions<T> = {}): FormlyFieldConfig {
    return this.text(key, label, {
      placeholder: '09xx xxx xxx',
      maxLength: 15,
      ...o,
      inputType: 'tel',
      validators: ['vnPhone', ...(o.validators ?? [])],
    });
  }

  cccd(key: Key<T>, label: string, o: FieldOptions<T> = {}): FormlyFieldConfig {
    return this.text(key, label, {
      maxLength: 12,
      ...o,
      validators: ['cccd', ...(o.validators ?? [])],
    });
  }

  taxCode(key: Key<T>, label: string, o: FieldOptions<T> = {}): FormlyFieldConfig {
    return this.text(key, label, {
      maxLength: 14,
      placeholder: '0101234567',
      ...o,
      validators: ['taxCode', ...(o.validators ?? [])],
    });
  }

  number(key: Key<T>, label: string, o: NumberOptions<T> = {}): FormlyFieldConfig {
    const { suffix, minFractionDigits, maxFractionDigits, ...rest } = o;
    return this.make('number', key, label, rest, { suffix, minFractionDigits, maxFractionDigits });
  }

  money(key: Key<T>, label: string, o: FieldOptions<T> = {}): FormlyFieldConfig {
    return this.make('money', key, label, { min: 0, ...o });
  }

  percent(key: Key<T>, label: string, o: FieldOptions<T> = {}): FormlyFieldConfig {
    return this.make(
      'number',
      key,
      label,
      { min: 0, max: 100, ...o },
      { suffix: ' %', maxFractionDigits: 2 },
    );
  }

  date(key: Key<T>, label: string, o: FieldOptions<T> = {}): FormlyFieldConfig {
    return this.make('date', key, label, o);
  }

  select(key: Key<T>, label: string, o: SelectOptions<T> = {}): FormlyFieldConfig {
    const { options, filter, dependsOn, loadOptions, ...rest } = o;
    const field = this.make('select', key, label, rest, { options, filter });
    if (dependsOn && loadOptions) applyDependsOn(field, dependsOn, loadOptions, rest.disabledIf);
    return field;
  }

  radio(
    key: Key<T>,
    label: string,
    options: SelectOption[],
    o: FieldOptions<T> = {},
  ): FormlyFieldConfig {
    return this.make('radio', key, label, o, { options });
  }

  checkbox(key: Key<T>, label: string, o: FieldOptions<T> = {}): FormlyFieldConfig {
    // Label nằm cạnh ô tick; wrapper chừa dòng label trống để thẳng hàng với field bên cạnh.
    const field = this.make(
      'checkbox',
      key,
      '',
      { defaultValue: false, ...o },
      { checkboxLabel: label },
    );
    field.className = `${field.className} df-col--checkbox`;
    return field;
  }

  // ───────────── Bố cục ─────────────

  /** Nhóm field có tiêu đề, xếp theo lưới 12 cột. */
  section(title: string, fields: FormlyFieldConfig[], o: LayoutOptions<T> = {}): FormlyFieldConfig {
    return {
      wrappers: ['section'],
      className: `df-col-${o.col ?? 12}`,
      fieldGroupClassName: 'df-grid',
      props: { label: title },
      fieldGroup: fields,
      ...(o.hideIf ? { expressions: { hide: (f: FormlyFieldConfig) => o.hideIf!(f.model) } } : {}),
    };
  }

  /** Nhóm tab. Chỉ tab đang mở được render, xem TabsType. */
  tabs(...tabs: FormlyFieldConfig[]): FormlyFieldConfig {
    return { type: 'tabs', className: 'df-col-12', fieldGroup: tabs };
  }

  /**
   * Một tab. Mặc định KHÔNG có key → model phẳng, field ở các tab tham chiếu nhau dễ dàng.
   * Truyền `key` khi DTO lồng theo nhóm (model[key] = { ... }).
   */
  tab(label: string, fields: FormlyFieldConfig[], o: { key?: Key<T> } = {}): FormlyFieldConfig {
    return {
      ...(o.key ? { key: o.key } : {}),
      props: { label },
      fieldGroupClassName: 'df-stack',
      fieldGroup: fields,
    };
  }

  /** Danh sách dòng dạng bảng. `columns` dùng builder của kiểu dòng R. */
  table<R>(
    key: Key<T>,
    columns: (c: FieldBuilder<R>) => FormlyFieldConfig[],
    o: LayoutOptions<T> = {},
  ): FormlyFieldConfig {
    const cols = columns(new FieldBuilder<R>()).map((c) => ({
      ...c,
      className: undefined,
      wrappers: ['cell'],
      // Checkbox trong bảng: nhãn lên header, không lặp lại ở từng dòng.
      ...(c.type === 'checkbox'
        ? { props: { ...c.props, label: c.props?.['checkboxLabel'], checkboxLabel: undefined } }
        : {}),
    }));
    return {
      key,
      type: 'table',
      className: `df-col-${o.col ?? 12}`,
      defaultValue: [],
      fieldArray: { fieldGroup: cols },
      ...(o.hideIf ? { expressions: { hide: (f: FormlyFieldConfig) => o.hideIf!(f.model) } } : {}),
    };
  }

  /** LỐI THOÁT: nhúng component tự viết (component phải có input `field`). */
  component(component: Type<unknown>, o: LayoutOptions<T> = {}): FormlyFieldConfig {
    return {
      type: 'component',
      className: `df-col-${o.col ?? 12}`,
      props: { component },
      ...(o.hideIf ? { expressions: { hide: (f: FormlyFieldConfig) => o.hideIf!(f.model) } } : {}),
    };
  }

  // ───────────── Nội bộ ─────────────

  private make(
    type: string,
    key: string,
    label: string,
    o: FieldOptions<T>,
    typeProps: Record<string, unknown> = {},
  ): FormlyFieldConfig {
    const {
      col = 4,
      requiredIf,
      hideIf,
      disabledIf,
      validators,
      resets,
      revalidates,
      onChange,
      extra,
      defaultValue,
      ...props
    } = o;

    const expressions: FieldExpressions = {};
    if (hideIf) expressions.hide = (f) => hideIf(f.model);
    if (requiredIf) expressions['props.required'] = (f) => requiredIf(f.model);
    if (disabledIf) expressions['props.disabled'] = (f) => disabledIf(f.model);

    const change = buildChangeHandler<T>(resets, revalidates, onChange);
    const field: FormlyFieldConfig = {
      key,
      type,
      className: `df-col-${col}`,
      props: { label, ...props, ...stripUndefined(typeProps), ...(change ? { change } : {}) },
      ...(defaultValue !== undefined ? { defaultValue } : {}),
      ...(Object.keys(expressions).length ? { expressions } : {}),
      ...(validators?.length ? { validators: { validation: validators } } : {}),
    };
    return extra ? mergeExtra(field, extra) : field;
  }
}

export const fieldsFor = <T>() => new FieldBuilder<T>();

// ───────────── helpers ─────────────

function buildChangeHandler<T>(
  resets: Key<T>[] | undefined,
  revalidates: Key<T>[] | undefined,
  onChange: FieldOptions<T>['onChange'],
) {
  if (!resets?.length && !revalidates?.length && !onChange) return undefined;
  return (field: FormlyFieldConfig) => {
    const form = field.form!;
    resets?.forEach((k) => setSiblingValue(field, k, null));
    revalidates?.forEach((k) => form.get(k)?.updateValueAndValidity());
    onChange?.({
      value: field.formControl?.value,
      model: field.model as T,
      field,
      form,
      set: (k, v) => setSiblingValue(field, k, v),
    });
    // Model có thể vừa đổi ở field chưa render → tính lại expressions (ẩn/hiện, required...) ngay.
    field.options?.checkExpressions?.(rootOf(field));
  };
}

/** Tỉnh → Phường/Xã: tải options theo field cha, khoá khi cha rỗng. */
function applyDependsOn<T>(
  field: FormlyFieldConfig,
  dependsOn: Key<T>,
  load: (parentValue: unknown) => Observable<SelectOption[]>,
  disabledIf?: (model: T) => boolean,
) {
  field.expressions = {
    ...field.expressions,
    'props.disabled': (f) =>
      isEmpty((f.model as Record<string, unknown>)?.[dependsOn]) || !!disabledIf?.(f.model),
  };
  field.hooks = {
    ...field.hooks,
    // Chạy khi field được render (tab đang mở). Tab chưa mở → chưa gọi API.
    onInit: (f) => {
      const parent = f.form?.get(dependsOn);
      if (!parent) return;
      f.props!['options'] = parent.valueChanges.pipe(
        startWith(parent.value),
        distinctUntilChanged(),
        switchMap((v) => (isEmpty(v) ? of([]) : load(v))),
      );
    },
  };
}

function mergeExtra(
  field: FormlyFieldConfig,
  extra: Partial<FormlyFieldConfig>,
): FormlyFieldConfig {
  return {
    ...field,
    ...extra,
    props: { ...field.props, ...extra.props },
    expressions: { ...field.expressions, ...extra.expressions },
    hooks: { ...field.hooks, ...extra.hooks },
  };
}

function stripUndefined(o: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
}
