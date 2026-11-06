import { FormlyFieldConfig } from '@ngx-formly/core';
import { FieldBuilder } from '../../../../shared/dynamic-form';
import { MasterDataService } from '../../../../core/master-data.service';
import * as calc from './plan.calc';
import { LoanPlan } from './plan.model';

type F = FieldBuilder<LoanPlan>;

export function loanSections(f: F, md: MasterDataService): FormlyFieldConfig[] {
  return [
    f.section('Khoản vay', [
      f.select('purpose', 'Mục đích vay', {
        required: true,
        options: [
          { value: 'SXKD', label: 'Sản xuất kinh doanh' },
          { value: 'BDS', label: 'Mua nhà / đất' },
          { value: 'OTO', label: 'Mua ô tô' },
          { value: 'TIEU_DUNG', label: 'Tiêu dùng' },
        ],
      }),
      f.money('amount', 'Số tiền vay', {
        required: true,
        min: 10_000_000,
        revalidates: ['recommendAmount'],
      }),
      f.number('termMonths', 'Thời hạn vay', {
        required: true,
        min: 1,
        max: 360,
        suffix: ' tháng',
        maxFractionDigits: 0,
        revalidates: ['graceMonths', 'recommendTerm'],
      }),
      f.percent('rate', 'Lãi suất', { required: true, max: 30, description: 'Lãi suất năm' }),
      f.radio(
        'method',
        'Phương thức trả nợ',
        [
          { value: 'ANNUITY', label: 'Gốc + lãi đều' },
          { value: 'EQUAL_PRINCIPAL', label: 'Gốc đều, lãi giảm dần' },
        ],
        { required: true, defaultValue: 'ANNUITY', col: 8 },
      ),
      f.checkbox('hasGrace', 'Có ân hạn gốc'),
      f.number('graceMonths', 'Số tháng ân hạn', {
        suffix: ' tháng',
        maxFractionDigits: 0,
        min: 1,
        hideIf: (m) => !m.hasGrace,
        requiredIf: (m) => !!m.hasGrace,
        check: {
          test: (v, m) => v < (m.termMonths ?? 0),
          message: 'Thời gian ân hạn phải nhỏ hơn thời hạn vay',
        },
      }),
      f.date('disburseDate', 'Ngày giải ngân dự kiến', {
        required: true,
        revalidates: ['firstPaymentDate'],
      }),
      f.date('firstPaymentDate', 'Ngày trả nợ đầu tiên', {
        check: {
          test: (v: Date, m) =>
            !m.disburseDate || (v > m.disburseDate && v <= calc.addMonths(m.disburseDate, 3)),
          message: 'Phải sau ngày giải ngân và không quá 3 tháng',
        },
      }),
      f.calc('installment', 'Số tiền trả mỗi kỳ', calc.installment, {
        tooltip: 'Gốc + lãi đều: niên kim. Gốc đều: kỳ đầu tiên sau ân hạn (lớn nhất).',
      }),
      f.calc('totalInterest', 'Tổng tiền lãi', calc.totalInterest),
      f.calc('totalPayable', 'Tổng phải trả', calc.totalPayable),
      f.calc('maturityDate', 'Ngày đáo hạn', calc.maturityDate, { format: 'date' }),
    ]),

    f.section(
      'Bất động sản mua',
      [
        f.select('propType', 'Loại bất động sản', {
          requiredIf: (m) => m.purpose === 'BDS',
          options: [
            { value: 'HOUSE', label: 'Nhà riêng' },
            { value: 'APARTMENT', label: 'Căn hộ chung cư' },
            { value: 'LAND', label: 'Đất nền' },
          ],
        }),
        f.select('propProvinceId', 'Tỉnh/TP', { options: md.provinces() }),
        f.text('propAddress', 'Địa chỉ', { requiredIf: (m) => m.purpose === 'BDS' }),
        f.text('propProject', 'Tên dự án', {
          hideIf: (m) => m.propType !== 'APARTMENT',
          required: true,
        }),
        f.text('propApartmentNo', 'Mã căn', { hideIf: (m) => m.propType !== 'APARTMENT' }),
        f.number('propArea', 'Diện tích sử dụng', {
          suffix: ' m²',
          min: 1,
          requiredIf: (m) => m.purpose === 'BDS',
        }),
        f.number('propLandArea', 'Diện tích đất', {
          suffix: ' m²',
          hideIf: (m) => m.propType === 'APARTMENT',
        }),
        f.number('propFloors', 'Số tầng', {
          maxFractionDigits: 0,
          hideIf: (m) => m.propType !== 'HOUSE',
        }),
        f.radio(
          'propCertStatus',
          'Tình trạng pháp lý',
          [
            { value: 'HAS', label: 'Đã có sổ' },
            { value: 'WAITING', label: 'Chờ cấp sổ' },
          ],
          { requiredIf: (m) => m.purpose === 'BDS' },
        ),
        f.text('propCertNo', 'Số giấy chứng nhận', {
          hideIf: (m) => m.propCertStatus !== 'HAS',
          required: true,
        }),
        f.date('propExpectedCertDate', 'Ngày dự kiến có sổ', {
          hideIf: (m) => m.propCertStatus !== 'WAITING',
          required: true,
        }),
        f.money('propPrice', 'Giá mua', { requiredIf: (m) => m.purpose === 'BDS' }),
        f.calc('propPricePerM2', 'Đơn giá / m²', calc.pricePerM2),
        f.text('propSeller', 'Bên bán', { col: 8 }),
      ],
      { hideIf: (m) => m.purpose !== 'BDS' },
    ),

    f.section(
      'Ô tô mua',
      [
        f.select('carBrand', 'Hãng xe', {
          requiredIf: (m) => m.purpose === 'OTO',
          options: [
            'Toyota',
            'Hyundai',
            'Kia',
            'Mazda',
            'Ford',
            'VinFast',
            'Honda',
            'Mitsubishi',
          ].map((b) => ({ value: b.toUpperCase(), label: b })),
        }),
        f.text('carModel', 'Dòng xe'),
        f.number('carYear', 'Năm sản xuất', {
          min: 2000,
          max: new Date().getFullYear() + 1,
          maxFractionDigits: 0,
        }),
        f.radio(
          'carCondition',
          'Tình trạng',
          [
            { value: 'NEW', label: 'Xe mới' },
            { value: 'USED', label: 'Xe đã qua sử dụng' },
          ],
          { defaultValue: 'NEW' },
        ),
        f.number('carOdometer', 'Số km đã đi', {
          suffix: ' km',
          maxFractionDigits: 0,
          hideIf: (m) => m.carCondition !== 'USED',
          required: true,
        }),
        f.text('carRegNo', 'Biển số', { hideIf: (m) => m.carCondition !== 'USED' }),
        f.money('carPrice', 'Giá mua', { requiredIf: (m) => m.purpose === 'OTO' }),
        f.text('carDealer', 'Đại lý / bên bán'),
        f.calc('carAge', 'Tuổi xe', (m) => calc.carAge(m), {
          format: 'number',
          digits: 0,
          suffix: ' năm',
          max: 10,
          messages: { max: 'Xe trên 10 năm tuổi không được nhận làm tài sản bảo đảm' },
        }),
        f.checkbox('carInsurance', 'Mua bảo hiểm vật chất qua ngân hàng'),
      ],
      { hideIf: (m) => m.purpose !== 'OTO' },
    ),
  ];
}
