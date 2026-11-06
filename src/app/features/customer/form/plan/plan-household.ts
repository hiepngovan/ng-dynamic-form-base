import { FormlyFieldConfig } from '@ngx-formly/core';
import { FieldBuilder } from '../../../../shared/dynamic-form';
import * as calc from './plan.calc';
import { LoanPlan, MEMBER_SLOTS, MemberSlot } from './plan.model';

type F = FieldBuilder<LoanPlan>;

export function householdSections(f: F): FormlyFieldConfig[] {
  return [
    f.section('Thu nhập hộ gia đình', [
      f.select('memberCount', 'Số người có thu nhập', {
        required: true,
        defaultValue: 1,
        options: MEMBER_SLOTS.map((n) => ({ value: n, label: `${n} người` })),
      }),
      f.calc('totalIncome', 'Tổng thu nhập / tháng', calc.totalIncome, {
        tooltip: 'Vay sản xuất kinh doanh: đã cộng lợi nhuận kinh doanh bình quân tháng',
      }),
    ]),
    ...MEMBER_SLOTS.map((i) => member(f, i)),

    f.section('Chi phí hàng tháng', [
      f.money('expFood', 'Ăn uống'),
      f.money('expHousing', 'Nhà ở / thuê nhà'),
      f.money('expUtilities', 'Điện, nước, internet'),
      f.money('expEducation', 'Giáo dục'),
      f.money('expHealth', 'Y tế'),
      f.money('expTransport', 'Đi lại'),
      f.money('expInsurance', 'Bảo hiểm'),
      f.money('expOtherLoans', 'Trả nợ khoản vay khác'),
      f.money('expOther', 'Chi phí khác'),
      f.calc('totalExpense', 'Tổng chi phí', calc.totalExpense),
      f.calc('surplus', 'Thặng dư sau trả nợ', calc.surplus, {
        min: 0,
        messages: { min: 'Thu nhập không đủ chi trả sinh hoạt và trả nợ' },
      }),
      f.calc('dti', 'Tỷ lệ nợ / thu nhập (DTI)', calc.dti, {
        format: 'percent',
        max: 70,
        messages: { max: 'DTI không được vượt quá 70%' },
      }),
    ]),

    f.section('Cân đối tài sản', [
      f.money('asCash', 'Tiền mặt', { col: 3 }),
      f.money('asDeposit', 'Tiền gửi ngân hàng', { col: 3 }),
      f.money('asReceivable', 'Phải thu', { col: 3 }),
      f.money('asInventory', 'Hàng tồn kho', { col: 3 }),
      f.money('asVehicle', 'Phương tiện', { col: 3 }),
      f.money('asRealEstate', 'Bất động sản', { col: 3 }),
      f.money('asEquipment', 'Máy móc thiết bị', { col: 3 }),
      f.money('asInvestment', 'Đầu tư tài chính', { col: 3 }),
      f.money('asOther', 'Tài sản khác', { col: 3 }),
      f.money('liShort', 'Vay ngắn hạn', { col: 3 }),
      f.money('liLong', 'Vay dài hạn', { col: 3 }),
      f.money('liPayable', 'Phải trả', { col: 3 }),
      f.money('liOther', 'Nợ khác', { col: 3 }),
      f.calc('totalAssets', 'Tổng tài sản', calc.totalAssets, { col: 3 }),
      f.calc('totalLiabilities', 'Tổng nợ', calc.totalLiabilities, { col: 3 }),
      f.calc('equity', 'Vốn chủ sở hữu', calc.equity, {
        col: 3,
        min: 0,
        messages: { min: 'Nợ lớn hơn tài sản' },
      }),
      f.calc('leverage', 'Tỷ lệ nợ / tài sản', calc.leverage, { col: 3, format: 'percent' }),
    ]),
  ];
}

function member(f: F, i: MemberSlot): FormlyFieldConfig {
  const k = <S extends string>(s: S) => `h${i}${s}` as const;
  return f.section(
    `Người có thu nhập ${i}`,
    [
      f.text(k('Name'), 'Họ tên', { required: true }),
      f.select(k('Relation'), 'Quan hệ với khách hàng', {
        required: true,
        defaultValue: i === 1 ? 'SELF' : undefined,
        options: [
          { value: 'SELF', label: 'Bản thân' },
          { value: 'SPOUSE', label: 'Vợ / chồng' },
          { value: 'CHILD', label: 'Con' },
          { value: 'PARENT', label: 'Bố / mẹ' },
        ],
      }),
      f.select(k('Job'), 'Nguồn thu nhập chính', {
        required: true,
        options: [
          { value: 'SALARY', label: 'Hưởng lương' },
          { value: 'BUSINESS', label: 'Kinh doanh' },
          { value: 'FREELANCE', label: 'Lao động tự do' },
          { value: 'RETIRED', label: 'Lương hưu' },
        ],
      }),
      f.text(k('Employer'), 'Đơn vị công tác', {
        hideIf: (m) => m[k('Job')] !== 'SALARY',
        required: true,
      }),
      f.money(k('Income'), 'Thu nhập chính / tháng', { required: true }),
      f.checkbox(k('HasOther'), 'Có thu nhập khác'),
      f.money(k('OtherIncome'), 'Thu nhập khác / tháng', {
        hideIf: (m) => !m[k('HasOther')],
        required: true,
      }),
      f.text(k('OtherSource'), 'Nguồn thu nhập khác', {
        hideIf: (m) => !m[k('HasOther')],
      }),
    ],
    { hideIf: (m) => (m.memberCount ?? 0) < i },
  );
}
