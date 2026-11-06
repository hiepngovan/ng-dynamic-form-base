import { FormlyFieldConfig } from '@ngx-formly/core';
import { MasterDataService } from '../../../core/master-data.service';
import { fieldsFor } from '../../../shared/dynamic-form';
import { CustomerHit, LoanApi } from '../loan.api';
import { COLLATERAL_TYPES, LoanApplication, LoanPackage } from '../loan.model';
import * as calc from './loan.calc';

type M = LoanApplication;

const startOfToday = () => new Date(new Date().setHours(0, 0, 0, 0));
const hasRealEstate = (m: M) => m.collateralType === 'LAND' || m.collateralType === 'HOUSE';

/** Form hồ sơ vay: wizard 3 bước. Tạo MỘT LẦN cho mỗi màn hình (không gọi trong template). */
export function buildLoanForm(api: LoanApi, md: MasterDataService): FormlyFieldConfig[] {
  const f = fieldsFor<M>();

  return [
    f.steps(
      // ───────────── Bước 1 ─────────────
      f.step('Khách hàng', [
        f.section('Khách hàng vay', [
          f.lookup('customerId', 'Khách hàng', {
            col: 6,
            required: true,
            placeholder: 'Gõ tên, mã KH hoặc số điện thoại',
            search: (q) => api.findCustomers(q),
            labelKey: 'customerName',
            // Chọn khách hàng → điền sẵn thông tin (ảnh chụp tại thời điểm lập hồ sơ).
            onChange: ({ option, set }) => {
              const c = option?.data as CustomerHit | undefined;
              set('customerName', c?.fullName ?? null);
              set('customerCode', c?.code ?? null);
              set('customerPhone', c?.phone ?? null);
            },
          }),
          f.text('customerCode', 'Mã khách hàng', { col: 3, readonly: true }),
          f.text('customerPhone', 'Điện thoại', { col: 3, readonly: true }),
        ]),
        f.section('Thu nhập & nghĩa vụ nợ', [
          f.money('monthlyIncome', 'Thu nhập bình quân / tháng', { required: true, min: 1 }),
          f.money('monthlyDebt', 'Đang trả nợ khác / tháng', {
            tooltip: 'Tổng tiền đang trả hàng tháng cho các khoản vay khác (CIC)',
          }),
        ]),
        f.section('Người đồng vay', [
          f.checkbox('hasCoBorrower', 'Có người đồng vay', { col: 12 }),
          f.text('coBorrowerName', 'Họ tên', {
            required: true,
            maxLength: 200,
            hideIf: (m) => !m.hasCoBorrower,
          }),
          f.cccd('coBorrowerIdNo', 'Số CCCD', {
            required: true,
            hideIf: (m) => !m.hasCoBorrower,
          }),
          f.select('coBorrowerRelation', 'Quan hệ với người vay', {
            required: true,
            hideIf: (m) => !m.hasCoBorrower,
            options: [
              { value: 'SPOUSE', label: 'Vợ / chồng' },
              { value: 'PARENT', label: 'Bố / mẹ' },
              { value: 'CHILD', label: 'Con' },
              { value: 'OTHER', label: 'Khác' },
            ],
          }),
        ]),
      ]),

      // ───────────── Bước 2 ─────────────
      f.step('Khoản vay & tài sản', [
        f.section('Sản phẩm', [
          // Chuỗi 3 cấp lấy từ API. Đổi cấp trên → cấp dưới tự xoá (dependsOn), kéo theo
          // lãi suất / hạn mức điền từ gói vay (onChange của gói vay chạy với option = null).
          f.select('categoryId', 'Nhóm sản phẩm', { required: true, options: api.categories() }),
          f.select('productId', 'Sản phẩm', {
            required: true,
            dependsOn: 'categoryId',
            loadOptions: (id) => api.products(id),
          }),
          f.select('packageId', 'Gói vay', {
            required: true,
            dependsOn: 'productId',
            loadOptions: (id) => api.packages(id),
            revalidates: ['amount', 'termMonths'],
            onChange: ({ option, set }) => {
              const p = option?.data as LoanPackage | undefined;
              set('rate', p?.rate ?? null);
              set('maxAmount', p?.maxAmount ?? null);
              set('maxTermMonths', p?.maxTermMonths ?? null);
            },
          }),
          f.number('rate', 'Lãi suất', { readonly: true, suffix: ' %/năm', maxFractionDigits: 2 }),
          f.money('maxAmount', 'Số tiền vay tối đa', { readonly: true }),
          f.number('maxTermMonths', 'Thời hạn tối đa', { readonly: true, suffix: ' tháng' }),
        ]),
        f.section('Khoản vay', [
          f.money('amount', 'Số tiền vay', {
            required: true,
            min: 10_000_000,
            messages: { min: 'Số tiền vay tối thiểu 10.000.000 ₫' },
            check: {
              test: (v: number, m) => !m.maxAmount || v <= m.maxAmount,
              message: 'Vượt số tiền tối đa của gói vay',
            },
          }),
          f.number('termMonths', 'Thời hạn vay', {
            required: true,
            min: 1,
            suffix: ' tháng',
            maxFractionDigits: 0,
            check: {
              test: (v: number, m) => !m.maxTermMonths || v <= m.maxTermMonths,
              message: 'Vượt thời hạn tối đa của gói vay',
            },
          }),
          f.date('disburseDate', 'Ngày giải ngân dự kiến', {
            required: true,
            check: {
              test: (v: Date) => v >= startOfToday(),
              message: 'Ngày giải ngân không được ở quá khứ',
            },
          }),
          f.textarea('purpose', 'Mục đích sử dụng vốn', {
            required: true,
            rows: 2,
            maxLength: 1000,
          }),
          f.calc('installment', 'Trả hàng tháng (dự kiến)', calc.installment, {
            col: 6,
            tooltip: 'Trả góp đều gốc + lãi theo lãi suất của gói vay',
          }),
          f.calc('dti', 'Nợ / thu nhập (DTI)', calc.dti, {
            col: 6,
            format: 'percent',
            digits: 1,
            max: calc.MAX_DTI,
            messages: { max: `DTI vượt ${calc.MAX_DTI}% — giảm số tiền hoặc tăng thời hạn` },
          }),
        ]),
        f.section('Tài sản bảo đảm', [
          f.checkbox('hasCollateral', 'Có tài sản bảo đảm', { col: 12 }),
          f.select('collateralType', 'Loại tài sản', {
            required: true,
            options: COLLATERAL_TYPES,
            hideIf: (m) => !m.hasCollateral,
          }),
          f.money('collateralValue', 'Giá trị định giá', {
            required: true,
            hideIf: (m) => !m.hasCollateral,
          }),
          f.calc('ltv', 'Tỷ lệ cho vay / giá trị TS (LTV)', calc.ltv, {
            format: 'percent',
            digits: 1,
            max: calc.MAX_LTV,
            messages: { max: `LTV tối đa ${calc.MAX_LTV}%` },
            hideIf: (m) => !m.hasCollateral,
          }),
          f.select('collateralProvinceId', 'Tỉnh/TP nơi có tài sản', {
            required: true,
            options: md.provinces(),
            hideIf: (m) => !m.hasCollateral || !hasRealEstate(m),
          }),
          f.select('collateralWardId', 'Phường/Xã', {
            required: true,
            dependsOn: 'collateralProvinceId',
            loadOptions: (id) => md.wards(id),
            hideIf: (m) => !m.hasCollateral || !hasRealEstate(m),
          }),
          f.text('collateralAddress', 'Địa chỉ tài sản', {
            col: 12,
            required: true,
            maxLength: 255,
            hideIf: (m) => !m.hasCollateral || !hasRealEstate(m),
          }),
        ]),
      ]),

      // ───────────── Bước 3 ─────────────
      f.step('Hồ sơ đính kèm', [
        f.section('Tài liệu', [
          f.files('idDocs', 'CCCD của người vay (2 mặt)', {
            required: true,
            accept: '.pdf,image/*',
            maxFiles: 2,
            maxSizeMb: 5,
          }),
          f.files('incomeDocs', 'Chứng minh thu nhập', {
            required: true,
            description: 'Sao kê lương 6 tháng, hợp đồng lao động, tờ khai thuế...',
            accept: '.pdf,image/*,.xlsx,.docx',
            maxFiles: 5,
          }),
          f.files('collateralDocs', 'Giấy tờ tài sản bảo đảm', {
            required: true,
            accept: '.pdf,image/*',
            hideIf: (m) => !m.hasCollateral,
          }),
          f.files('otherDocs', 'Tài liệu khác'),
          f.textarea('note', 'Ghi chú cho người duyệt', { rows: 3, maxLength: 2000 }),
        ]),
      ]),
    ),
  ];
}
