import { FormlyFieldConfig } from '@ngx-formly/core';
import { FieldBuilder } from '../../../shared/dynamic-form';
import { CreditSummaryComponent } from '../credit-summary.component';
import { Customer } from '../customer.model';
import { MasterDataService } from '../master-data.service';

export function financeTab(f: FieldBuilder<Customer>, md: MasterDataService): FormlyFieldConfig[] {
  return [
    f.section('Hạn mức & thanh toán', [
      f.select('currency', 'Tiền tệ', {
        required: true,
        defaultValue: 'VND',
        options: [
          { value: 'VND', label: 'VND – Việt Nam Đồng' },
          { value: 'USD', label: 'USD – Đô la Mỹ' },
        ],
      }),
      f.money('creditLimit', 'Hạn mức tín dụng', { revalidates: ['deposit'] }),
      f.money('deposit', 'Đặt cọc', {
        validators: [{ name: 'lte', options: { field: 'creditLimit', label: 'Hạn mức tín dụng' } }],
      }),
      f.number('paymentTermDays', 'Thời hạn thanh toán', {
        min: 0,
        max: 365,
        suffix: ' ngày',
        maxFractionDigits: 0,
      }),
      f.percent('discountRate', 'Chiết khấu'),
      f.select('paymentMethod', 'Hình thức thanh toán', {
        options: [
          { value: 'CASH', label: 'Tiền mặt' },
          { value: 'TRANSFER', label: 'Chuyển khoản' },
          { value: 'DEBT', label: 'Công nợ' },
        ],
      }),
      // LỐI THOÁT: khối UI đặc thù viết bằng component riêng, nhúng vào giữa form.
      f.component(CreditSummaryComponent),
    ]),

    f.section('Tài khoản ngân hàng', [
      f.select('bankId', 'Ngân hàng', { options: md.banks() }),
      f.text('bankBranch', 'Chi nhánh'),
      f.text('bankAccountNo', 'Số tài khoản', {
        pattern: /^\d{6,20}$/,
        requiredIf: (m) => !!m.bankId,
        description: 'Bắt buộc khi đã chọn ngân hàng',
      }),
      f.text('bankAccountName', 'Tên chủ tài khoản', {
        col: 8,
        requiredIf: (m) => !!m.bankId,
        // onChange tuỳ biến: tự viết hoa tên chủ tài khoản.
        onChange: ({ value, set }) => set('bankAccountName', String(value ?? '').toUpperCase()),
      }),
    ]),

    f.section('Hoá đơn', [
      f.checkbox('vatRegistered', 'Xuất hoá đơn VAT', { col: 12 }),
      f.email('invoiceEmail', 'Email nhận hoá đơn', {
        requiredIf: (m) => !!m.vatRegistered,
        disabledIf: (m) => !m.vatRegistered,
      }),
      f.textarea('invoiceAddress', 'Địa chỉ xuất hoá đơn', {
        col: 8,
        rows: 2,
        requiredIf: (m) => !!m.vatRegistered,
        disabledIf: (m) => !m.vatRegistered,
      }),
    ]),
  ];
}
