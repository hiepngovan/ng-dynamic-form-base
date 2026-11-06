import { FormlyFieldConfig } from '@ngx-formly/core';
import { FieldBuilder, fieldsFor } from '../../../shared/dynamic-form';

type Extra = Record<string, unknown>;

/**
 * 90 field SINH TỰ ĐỘNG để đo hiệu năng (form thật không viết kiểu này).
 * Tab này CÓ key 'extra' → model.extra = { f001: ..., f002: ... }.
 */
export function extraTab(): FormlyFieldConfig[] {
  const f: FieldBuilder<Extra> = fieldsFor<Extra>();
  const fields = Array.from({ length: 90 }, (_, i) => {
    const key = `f${String(i + 1).padStart(3, '0')}`;
    const label = `Chỉ tiêu ${i + 1}`;
    switch (i % 5) {
      case 0:
        return f.text(key, label, { maxLength: 100 });
      case 1:
        return f.number(key, label, { min: 0 });
      case 2:
        return f.date(key, label);
      case 3:
        return f.select(key, label, {
          options: [
            { value: 'A', label: 'Mức A' },
            { value: 'B', label: 'Mức B' },
            { value: 'C', label: 'Mức C' },
          ],
        });
      default:
        return f.checkbox(key, label);
    }
  });

  // 6 nhóm × 15 field
  return Array.from({ length: 6 }, (_, g) =>
    f.section(`Nhóm chỉ tiêu ${g + 1}`, fields.slice(g * 15, g * 15 + 15)),
  );
}
