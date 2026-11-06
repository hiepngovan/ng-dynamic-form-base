import { FormlyFieldConfig } from '@ngx-formly/core';
import { FieldBuilder } from '../../../../shared/dynamic-form';
import * as calc from './plan.calc';
import { COLLATERAL_SLOTS, CollateralSlot, LoanPlan } from './plan.model';

type F = FieldBuilder<LoanPlan>;

export function collateralSections(f: F): FormlyFieldConfig[] {
  return [
    f.section('Tài sản bảo đảm', [
      f.select('collateralCount', 'Số tài sản bảo đảm', {
        required: true,
        defaultValue: 1,
        options: [0, 1, 2, 3, 4, 5].map((n) => ({
          value: n,
          label: n ? `${n} tài sản` : 'Không có',
        })),
        check: {
          test: (v, m) => v > 0 || m.purpose === 'TIEU_DUNG' || m.purpose === 'SXKD',
          message: 'Vay mua nhà / ô tô phải có tài sản bảo đảm',
        },
      }),
      f.calc('totalCollateral', 'Tổng giá trị TSBĐ', calc.totalCollateral),
      f.calc('totalEligible', 'Giá trị được tính', calc.totalEligible, {
        tooltip: 'Σ giá trị × tỷ lệ cho vay tối đa (LTV) của từng tài sản',
      }),
      f.calc('coverage', 'Tỷ lệ bảo đảm', calc.coverage, {
        format: 'percent',
        min: 100,
        messages: { min: 'Tỷ lệ bảo đảm phải từ 100% trở lên' },
        hideIf: (m) => !m.collateralCount,
      }),
    ]),
    ...COLLATERAL_SLOTS.map((i) => collateralItem(f, i)),
  ];
}

function collateralItem(f: F, i: CollateralSlot): FormlyFieldConfig {
  const k = <S extends string>(s: S) => `c${i}${s}` as const;
  return f.section(
    `Tài sản ${i}`,
    [
      f.select(k('Type'), 'Loại tài sản', {
        required: true,
        options: [
          { value: 'BDS', label: 'Bất động sản' },
          { value: 'XE', label: 'Phương tiện vận tải' },
          { value: 'TIEN_GUI', label: 'Sổ tiết kiệm' },
          { value: 'MMTB', label: 'Máy móc thiết bị' },
          { value: 'KHAC', label: 'Khác' },
        ],
        // Đổi loại tài sản → gợi ý LTV theo quy định (người dùng vẫn sửa được).
        onChange: ({ value, set }) => set(k('Ltv'), calc.LTV_BY_TYPE[String(value)] ?? null),
      }),
      f.text(k('Desc'), 'Mô tả tài sản', { col: 8, required: true }),
      f.money(k('Value'), 'Giá trị định giá', { required: true }),
      f.percent(k('Ltv'), 'Tỷ lệ cho vay tối đa (LTV)', { required: true, max: 100 }),
      f.calc(k('Eligible'), 'Giá trị được tính', (m) => calc.eligible(m, i)),
      f.radio(
        k('Owner'),
        'Chủ sở hữu',
        [
          { value: 'SELF', label: 'Khách hàng' },
          { value: 'THIRD', label: 'Bên thứ ba' },
        ],
        { defaultValue: 'SELF' },
      ),
      f.text(k('OwnerName'), 'Tên bên thứ ba', {
        hideIf: (m) => m[k('Owner')] !== 'THIRD',
        required: true,
      }),
      f.select(k('OwnerRelation'), 'Quan hệ với khách hàng', {
        hideIf: (m) => m[k('Owner')] !== 'THIRD',
        required: true,
        options: [
          { value: 'SPOUSE', label: 'Vợ / chồng' },
          { value: 'PARENT', label: 'Bố / mẹ' },
          { value: 'SIBLING', label: 'Anh / chị / em' },
          { value: 'OTHER', label: 'Khác' },
        ],
      }),
      f.text(k('CertNo'), 'Số giấy tờ sở hữu'),
    ],
    { hideIf: (m) => (m.collateralCount ?? 0) < i },
  );
}
