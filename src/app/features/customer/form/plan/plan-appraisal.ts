import { FormlyFieldConfig } from '@ngx-formly/core';
import { FieldBuilder } from '../../../../shared/dynamic-form';
import * as calc from './plan.calc';
import { CRITERIA, DOCS, LoanPlan, SCORE_OPTIONS } from '../../plan.model';

type F = FieldBuilder<LoanPlan>;

export function appraisalSections(f: F): FormlyFieldConfig[] {
  return [
    f.section('Chấm điểm tín dụng', [
      ...CRITERIA.map((c) =>
        f.select(`score${c.code}`, c.label, {
          col: 3,
          required: true,
          options: SCORE_OPTIONS,
          tooltip: `Trọng số ${c.weight}`,
        }),
      ),
      f.calc('scoreCoverage', 'Tỷ lệ bảo đảm (tự tính)', calc.scoreCoverage, {
        col: 3,
        format: 'number',
        digits: 0,
        tooltip: '≥ 150%: 10 · ≥ 100%: 5 · còn lại: 0',
      }),
      f.calc('scoreDti', 'DTI (tự tính)', calc.scoreDti, {
        col: 3,
        format: 'number',
        digits: 0,
        tooltip: '≤ 40%: 10 · ≤ 60%: 5 · còn lại: 0',
      }),
      f.calc('scoreTotal', 'Tổng điểm', calc.scoreTotal, {
        col: 3,
        format: 'number',
        digits: 1,
        suffix: ' / 100',
      }),
      f.calc('rating', 'Xếp hạng', calc.rating, {
        col: 3,
        format: 'text',
        tooltip: 'A ≥ 80 · B ≥ 65 · C ≥ 50 · D < 50',
      }),
      f.textarea('exceptionReason', 'Lý do đề xuất ngoại lệ (xếp hạng D)', {
        rows: 2,
        required: true,
        hideIf: (m) => calc.rating(m) !== 'D',
      }),
    ]),

    f.section('Danh mục hồ sơ', [
      ...DOCS.flatMap((d) => {
        const notApplicable = (m: LoanPlan) => !calc.docApplies(d, m.purpose);
        const received = (m: LoanPlan) => !!m[`doc${d.code}`];
        return [
          f.checkbox(`doc${d.code}`, d.label, {
            col: 3,
            hideIf: notApplicable,
            // Bỏ tick → xoá ngày nhận, tránh lưu ngày của hồ sơ chưa nhận.
            resets: [`doc${d.code}Date`],
          }),
          // Luôn hiện để bảng đều cột; khoá khi chưa tick, bắt buộc khi đã tick.
          f.date(`doc${d.code}Date`, 'Ngày nhận', {
            col: 3,
            hideIf: notApplicable,
            disabledIf: (m) => !received(m),
            requiredIf: received,
          }),
        ];
      }),
      f.calc('docProgress', 'Mức độ đầy đủ hồ sơ', calc.docProgress, {
        format: 'percent',
        digits: 0,
      }),
    ]),

    f.section('Ý kiến thẩm định', [
      f.money('recommendAmount', 'Số tiền đề xuất', {
        required: true,
        validators: [{ name: 'lte', options: { field: 'amount', label: 'Số tiền vay' } }],
      }),
      f.number('recommendTerm', 'Thời hạn đề xuất', {
        suffix: ' tháng',
        maxFractionDigits: 0,
        validators: [{ name: 'lte', options: { field: 'termMonths', label: 'Thời hạn vay' } }],
      }),
      f.radio(
        'decision',
        'Đề xuất',
        [
          { value: 'APPROVE', label: 'Cho vay' },
          { value: 'CONDITIONAL', label: 'Cho vay có điều kiện' },
          { value: 'REJECT', label: 'Từ chối' },
        ],
        { required: true },
      ),
      f.textarea('conditions', 'Điều kiện kèm theo', {
        rows: 2,
        required: true,
        hideIf: (m) => m.decision !== 'CONDITIONAL',
      }),
      f.select('rejectReason', 'Lý do từ chối', {
        required: true,
        hideIf: (m) => m.decision !== 'REJECT',
        options: [
          { value: 'INCOME', label: 'Thu nhập không đủ' },
          { value: 'COLLATERAL', label: 'Tài sản bảo đảm không đạt' },
          { value: 'CIC', label: 'Lịch sử tín dụng xấu' },
          { value: 'DOCS', label: 'Hồ sơ không đầy đủ' },
          { value: 'OTHER', label: 'Khác' },
        ],
      }),
      f.textarea('opinion', 'Nhận xét của cán bộ thẩm định', { rows: 3, required: true }),
    ]),
  ];
}
