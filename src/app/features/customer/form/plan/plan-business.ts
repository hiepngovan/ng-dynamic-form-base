import { FormlyFieldConfig } from '@ngx-formly/core';
import { FieldBuilder } from '../../../../shared/dynamic-form';
import * as calc from './plan.calc';
import { LoanPlan, MONTH_ROWS, MonthRow } from './plan.model';

type F = FieldBuilder<LoanPlan>;
const notBusiness = (m: LoanPlan) => m.purpose !== 'SXKD';

export function businessSections(f: F): FormlyFieldConfig[] {
  return [
    f.section(
      'Thông tin kinh doanh',
      [
        f.text('bizName', 'Tên cơ sở kinh doanh', { col: 8, required: true }),
        f.select('bizType', 'Ngành nghề', {
          required: true,
          options: [
            { value: 'RETAIL', label: 'Bán lẻ' },
            { value: 'WHOLESALE', label: 'Bán buôn' },
            { value: 'FNB', label: 'Ăn uống' },
            { value: 'MANUFACTURE', label: 'Sản xuất' },
            { value: 'SERVICE', label: 'Dịch vụ' },
            { value: 'AGRI', label: 'Nông nghiệp' },
          ],
        }),
        f.number('bizYears', 'Số năm hoạt động', { min: 0, maxFractionDigits: 1, suffix: ' năm' }),
        f.number('bizEmployees', 'Số lao động', { min: 0, maxFractionDigits: 0 }),
        f.text('bizMarket', 'Thị trường tiêu thụ'),
        f.textarea('bizProducts', 'Sản phẩm / dịch vụ chính', { rows: 2 }),
      ],
      { hideIf: notBusiness },
    ),

    f.section(
      'Doanh thu – chi phí 12 tháng tới',
      [
        // Bảng cố định 12 dòng; 3 cột nhập, 3 cột tính theo từng dòng.
        f.table<MonthRow>(
          'months',
          (c) => [
            c.text('label', 'Tháng', { readonly: true, extra: { props: { width: '90px' } } }),
            c.money('revenue', 'Doanh thu'),
            c.money('cogs', 'Giá vốn', {
              check: {
                test: (v, row) => v <= (row.revenue ?? 0),
                message: 'Giá vốn lớn hơn doanh thu',
              },
            }),
            c.money('opex', 'Chi phí hoạt động'),
            c.calc('gross', 'Lãi gộp', calc.gross),
            c.calc('net', 'Lợi nhuận', calc.net),
            c.calc('margin', 'Biên LN', calc.margin, {
              format: 'percent',
              digits: 1,
              extra: { props: { width: '110px' } },
            }),
          ],
          { fixedRows: MONTH_ROWS },
        ),
        f.calc('totalRevenue', 'Tổng doanh thu', calc.totalRevenue),
        f.calc('totalCogs', 'Tổng giá vốn', calc.totalCogs),
        f.calc('totalOpex', 'Tổng chi phí hoạt động', calc.totalOpex),
        f.calc('totalNet', 'Tổng lợi nhuận', calc.totalNet, {
          min: 0,
          messages: { min: 'Phương án kinh doanh lỗ' },
        }),
        f.calc('avgMargin', 'Biên lợi nhuận bình quân', calc.avgMargin, { format: 'percent' }),
        f.calc('avgMonthlyNet', 'Lợi nhuận bình quân tháng', calc.avgMonthlyNet),
        f.calc('dscr', 'Hệ số trả nợ (DSCR)', calc.dscr, {
          format: 'number',
          min: 1.2,
          messages: { min: 'DSCR phải từ 1,2 trở lên' },
          tooltip: 'Lợi nhuận bình quân tháng / số tiền trả mỗi kỳ',
        }),
      ],
      { hideIf: notBusiness },
    ),
  ];
}
