import { FormControl } from '@angular/forms';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { fieldsFor } from './field-builder';

interface M {
  a?: number | null;
  b?: number | null;
  total?: number | null;
  flag?: boolean;
}

type Expr = (f: FormlyFieldConfig) => unknown;
const expr = (field: FormlyFieldConfig, key: string) =>
  (field.expressions as Record<string, Expr>)[key];

describe('FieldBuilder', () => {
  const f = fieldsFor<M>();

  it('hàm điều kiện luôn nhận object, kể cả khi model của nhóm chưa có (sau reset)', () => {
    const field = f.text('a', 'A', {
      hideIf: (m) => !m.flag,
      requiredIf: (m) => !!m.flag,
      disabledIf: (m) => !m.flag,
    });
    for (const key of ['hide', 'props.required', 'props.disabled']) {
      expect(() => expr(field, key)({ model: undefined })).not.toThrow();
    }
    const total = f.calc('total', 'Tổng', (m) => (m.a ?? 0) + (m.b ?? 0));
    expect(expr(total, 'model.total')({ model: undefined })).toBe(0);
  });

  it('calc: làm tròn tiền, không có kết quả → undefined, field ẩn → không tính', () => {
    const money = f.calc('total', 'Tổng', (m) => (m.a ?? 0) / 3);
    expect(expr(money, 'model.total')({ model: { a: 10 } })).toBe(3);
    const pct = f.calc('total', 'Tỷ lệ', (m) => (m.a ?? 0) / (m.b ?? 0), { format: 'percent' });
    expect(expr(pct, 'model.total')({ model: { a: 1, b: 0 } })).toBeUndefined();
    expect(expr(money, 'model.total')({ model: { a: 10 }, hide: true })).toBeUndefined();
    expect(money.props?.readonly).toBe(true);
    expect(money.validation?.show).toBe(true);
  });

  it('check: bỏ qua khi rỗng, dùng model của nhóm', () => {
    const field = f.number('b', 'B', {
      check: { test: (v, m) => v <= (m.a ?? 0), message: 'B ≤ A' },
    });
    const rule = (field.validators as Record<string, { expression: Function; message: string }>)[
      'check0'
    ];
    const run = (v: unknown, model?: M) => rule.expression(new FormControl(v), { model });
    expect(run(null)).toBe(true);
    expect(run(5, { a: 10 })).toBe(true);
    expect(run(15, { a: 10 })).toBe(false);
    expect(run(15, undefined)).toBe(false);
    expect(rule.message).toBe('B ≤ A');
  });
});
