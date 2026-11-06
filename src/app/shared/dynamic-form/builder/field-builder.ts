import { Type } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { Observable, of } from 'rxjs';
import { distinctUntilChanged, startWith, switchMap } from 'rxjs/operators';
import { isEmpty, isHiddenField, rootOf, setSiblingValue } from '../field-utils';
import { SelectOption } from '../props';
import {
  CalcFormat,
  CalcOptions,
  CheckRule,
  FieldOptions,
  FileOptions,
  Key,
  LayoutOptions,
  LookupOptions,
  NumberOptions,
  SelectOptions,
  TableOptions,
  TextareaOptions,
  TextOptions,
  ValidatorRef,
} from './field-options';

type FieldExpressions = NonNullable<FormlyFieldConfig['expressions']>;
type FieldValidators = NonNullable<FormlyFieldConfig['validators']>;

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
    const field = this.make('select', key, label, rest, { options, filter, dependsOn });
    if (dependsOn && loadOptions) applyDependsOn(field, dependsOn, loadOptions, rest.disabledIf);
    return field;
  }

  /**
   * Chọn từ danh sách LỚN trên server (gõ để tìm). Giá trị lưu là `value` của lựa chọn (vd id).
   * Lấy thêm thông tin của lựa chọn qua onChange: ({ option, set }) => set('phone', option?.data...).
   */
  lookup(key: Key<T>, label: string, o: LookupOptions<T>): FormlyFieldConfig {
    const { search, labelKey, resolve, minQueryLength, ...rest } = o;
    return this.make('lookup', key, label, rest, { search, labelKey, resolve, minQueryLength });
  }

  /**
   * Đính kèm tệp. Giá trị = FileRef[] (tệp đã tải lên qua DF_FILE_STORAGE của ứng dụng).
   * `required` = phải có ít nhất 1 tệp. Đang tải dở thì form không submit được.
   */
  files(key: Key<T>, label: string, o: FileOptions<T> = {}): FormlyFieldConfig {
    const { accept, maxSizeMb = 10, maxFiles = 10, ...rest } = o;
    const field = this.make(
      'files',
      key,
      label,
      { col: 12, ...rest },
      { accept, maxSizeMb, maxFiles },
    );
    field.validators = {
      ...field.validators,
      uploading: {
        expression: (_: AbstractControl, f: FormlyFieldConfig) => !f.props?.['uploading'],
        message: 'Đang tải tệp lên, vui lòng chờ',
      },
    };
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
      ...hideWhen(o.hideIf),
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

  /**
   * Wizard nhiều bước. Nút Quay lại / Tiếp tục nằm ở thanh nút của <app-form>; chế độ đi
   * (linear / free) đặt bằng input stepMode của app-form. Xem StepsType.
   */
  steps(...steps: FormlyFieldConfig[]): FormlyFieldConfig {
    return { type: 'steps', className: 'df-col-12', fieldGroup: steps };
  }

  /** Một bước của wizard. Giống tab: không có key → model phẳng (trừ khi truyền key). */
  step(label: string, fields: FormlyFieldConfig[], o: { key?: Key<T> } = {}): FormlyFieldConfig {
    return this.tab(label, fields, o);
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
      ...hideWhen(o.hideIf),
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
      ...hideWhen(o.hideIf),
    };
  }

  // ───────────── Nội bộ ─────────────

  private make(
    type: string,
    key: Key<T>,
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

    const expressions: FieldExpressions = { ...hideWhen(hideIf).expressions };
    if (requiredIf) expressions['props.required'] = (f) => requiredIf(modelOf<T>(f));
    if (disabledIf) expressions['props.disabled'] = (f) => disabledIf(modelOf<T>(f));

    const change = buildChangeHandler<T>({ resets, revalidates, onChange });
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

/** Ẩn theo điều kiện trên model của nhóm. Không có điều kiện → không thêm expression nào. */
function hideWhen<T>(
  hideIf: ((model: T) => boolean) | undefined,
): Pick<FormlyFieldConfig, 'expressions'> {
  return hideIf ? { expressions: { hide: (f: FormlyFieldConfig) => hideIf(modelOf<T>(f)) } } : {};
}

/** Hai danh sách key cùng kiểu → truyền theo tên, đảo chỗ nhau không biên dịch lặng lẽ được. */
function buildChangeHandler<T>({
  resets,
  revalidates,
  onChange,
}: Pick<FieldOptions<T>, 'resets' | 'revalidates' | 'onChange'>) {
  if (!resets?.length && !revalidates?.length && !onChange) return undefined;
  return (field: FormlyFieldConfig, event?: unknown) => {
    const form = field.form!;
    resets?.forEach((k) => setSiblingValue(field, k, null));
    revalidates?.forEach((k) => form.get(k)?.updateValueAndValidity());
    onChange?.({
      value: field.formControl?.value,
      model: field.model as T,
      field,
      form,
      set: (k, v) => setSiblingValue(field, k, v),
      option: (event as { option?: SelectOption | null } | undefined)?.option,
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
