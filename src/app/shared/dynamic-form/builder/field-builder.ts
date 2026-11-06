import { Type } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { Observable, of } from 'rxjs';
import { distinctUntilChanged, startWith, switchMap } from 'rxjs/operators';
import { isEmpty, isHiddenField, rootOf, setSiblingValue } from '../core/field-utils';
import { OptionsSource, SelectOption } from '../core/props';
import { CompareFieldOptions, ValidatorName } from '../validation/validators';

type FieldExpressions = NonNullable<FormlyFieldConfig['expressions']>;
type FieldValidators = NonNullable<FormlyFieldConfig['validators']>;

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
  /** Danh sách phụ thuộc field cha: tải lại khi cha đổi, khoá khi cha rỗng. Dùng kèm loadOptions. */
  dependsOn?: Key<T>;
  loadOptions?: (parentValue: unknown) => Observable<SelectOption[]>;
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

  /**
   * Field TÍNH TOÁN: giá trị = compute(model), tự tính lại mỗi khi model đổi, chỉ hiển thị.
   * Giá trị được ghi vào cả model lẫn control → có trong dữ liệu submit, có thể gắn validator
   * (min / max / check) và lỗi hiện ngay khi kết quả không đạt.
   *
   * Quy ước: compute là HÀM THUẦN, tính từ field nhập (không đọc kết quả của field calc khác,
   * vì thứ tự tính không được đảm bảo). Công thức đặt trong file *.calc.ts riêng và có unit test.
   */
  calc(
    key: Key<T>,
    label: string,
    compute: (model: T) => unknown,
    o: CalcOptions<T> = {},
  ): FormlyFieldConfig {
    const { format = 'money', suffix, digits = 2, ...rest } = o;
    const type = format === 'text' ? 'input' : format === 'percent' ? 'number' : format;
    const typeProps =
      format === 'percent'
        ? { suffix: suffix ?? ' %', maxFractionDigits: digits }
        : format === 'number'
          ? { suffix, maxFractionDigits: digits }
          : {};
    const field = this.make(
      type,
      key,
      label,
      { ...rest, readonly: true },
      { ...typeProps, calc: true },
    );
    field.expressions = {
      ...field.expressions,
      // Field (hoặc section chứa nó) đang ẩn thì không tính, để giá trị đã bị xoá không quay lại.
      [`model.${key}`]: (f) =>
        isHiddenField(f) ? undefined : normalize(compute(modelOf<T>(f)), format, digits),
    };
    // Kết quả tính không do người dùng "chạm" vào → hiện lỗi ngay, không chờ touched / submit.
    field.validation = { ...field.validation, show: true };
    return field;
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
      ...(o.hideIf
        ? { expressions: { hide: (f: FormlyFieldConfig) => o.hideIf!(modelOf<T>(f)) } }
        : {}),
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
    o: TableOptions<T, R> = {},
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
    const fixedRows = o.fixedRows;
    const field: FormlyFieldConfig = {
      key,
      type: 'table',
      className: `df-col-${o.col ?? 12}`,
      props: { fixed: !!fixedRows },
      fieldArray: { fieldGroup: cols },
      ...(o.hideIf
        ? { expressions: { hide: (f: FormlyFieldConfig) => o.hideIf!(modelOf<T>(f)) } }
        : {}),
    };
    // Getter: mỗi lần Formly lấy giá trị mặc định là một mảng mới (tránh dùng chung object dòng).
    Object.defineProperty(field, 'defaultValue', {
      get: () => (fixedRows ? fixedRows.map((r) => ({ ...r })) : []),
      enumerable: true,
      configurable: true,
    });
    return field;
  }

  /** LỐI THOÁT: nhúng component tự viết (component phải có input `field`). */
  component(component: Type<unknown>, o: LayoutOptions<T> = {}): FormlyFieldConfig {
    return {
      type: 'component',
      className: `df-col-${o.col ?? 12}`,
      props: { component },
      ...(o.hideIf
        ? { expressions: { hide: (f: FormlyFieldConfig) => o.hideIf!(modelOf<T>(f)) } }
        : {}),
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
      check,
      messages,
      resets,
      revalidates,
      onChange,
      extra,
      defaultValue,
      ...props
    } = o;

    const expressions: FieldExpressions = {};
    if (hideIf) expressions.hide = (f) => hideIf(modelOf<T>(f));
    if (requiredIf) expressions['props.required'] = (f) => requiredIf(modelOf<T>(f));
    if (disabledIf) expressions['props.disabled'] = (f) => disabledIf(modelOf<T>(f));

    const change = buildChangeHandler<T>(resets, revalidates, onChange);
    const field: FormlyFieldConfig = {
      key,
      type,
      className: `df-col-${col}`,
      props: { label, ...props, ...stripUndefined(typeProps), ...(change ? { change } : {}) },
      ...(defaultValue !== undefined ? { defaultValue } : {}),
      ...(Object.keys(expressions).length ? { expressions } : {}),
      ...(validators?.length || check ? { validators: buildValidators(validators, check) } : {}),
      ...(messages ? { validation: { messages } } : {}),
    };
    return extra ? mergeExtra(field, extra) : field;
  }
}

export const fieldsFor = <T>() => new FieldBuilder<T>();

// ───────────── helpers ─────────────

/**
 * Model của nhóm chứa field, không bao giờ undefined. Nhóm có key (vd tab 'plan') có thể chưa có
 * object model ngay sau khi reset form về {} → hàm điều kiện của feature không phải tự kiểm tra.
 */
const modelOf = <M>(f: FormlyFieldConfig): M => (f.model ?? {}) as M;

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
      isEmpty(modelOf<Record<string, unknown>>(f)[dependsOn]) || !!disabledIf?.(modelOf<T>(f)),
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

function buildValidators<T>(
  refs: ValidatorRef[] | undefined,
  check: CheckRule<T> | CheckRule<T>[] | undefined,
): FieldValidators {
  const rules = check ? ([] as CheckRule<T>[]).concat(check) : [];
  const out: FieldValidators = refs?.length ? { validation: refs } : {};
  rules.forEach((r, i) => {
    out[`check${i}`] = {
      expression: (c: AbstractControl, f: FormlyFieldConfig) =>
        isEmpty(c.value) || r.test(c.value, modelOf<T>(f)),
      message: r.message,
    };
  });
  return out;
}

/**
 * Chuẩn hoá kết quả tính: làm tròn theo kiểu hiển thị.
 * "Chưa có kết quả" (null, NaN, Infinity) → undefined, giống field nhập để trống. KHÔNG dùng null:
 * Formly không patch control khi cả hai giá trị đều rỗng (null vs undefined), control giữ undefined,
 * rồi lúc field được render Formly đồng bộ ngược control → model, làm model đổi giữa lúc render
 * (lỗi ExpressionChangedAfterItHasBeenChecked ở dev mode).
 */
function normalize(v: unknown, format: CalcFormat, digits: number): unknown {
  if (v === undefined || v === null) return undefined;
  if (format === 'date' || format === 'text') return v;
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
  if (format === 'money') return Math.round(v);
  const k = 10 ** digits;
  return Math.round(v * k) / k;
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
    validators: { ...field.validators, ...extra.validators },
    validation: { ...field.validation, ...extra.validation },
  };
}

function stripUndefined(o: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
}
