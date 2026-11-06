import { TestBed } from '@angular/core/testing';
import { provideFormlyCore } from '@ngx-formly/core';
import { DYNAMIC_FORM_CONFIG } from '../../../../shared/dynamic-form';
import { buildTestForm } from '../../../../shared/dynamic-form/testing/build-test-form';
import { Customer } from '../../customer.model';
import { MasterDataService } from '../../master-data.service';
import { buildCustomerForm, countInputFields } from '../customer.form';
import { planTab } from './tab-plan';

describe('Tab Phương án vay (cấu hình)', () => {
  const setup = () =>
    buildTestForm<Customer>(buildCustomerForm(TestBed.inject(MasterDataService)), {});

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideFormlyCore(DYNAMIC_FORM_CONFIG)] });
  });

  it('khai báo khoảng 300 field', () => {
    expect(countInputFields(planTab(TestBed.inject(MasterDataService)))).toBeGreaterThan(300);
  });

  it('ẩn/hiện section theo mục đích vay', () => {
    const t = setup();
    expect(t.form.get('plan.amount')).toBeTruthy();
    expect(t.form.get('plan.propType')).toBeNull();
    expect(t.form.get('plan.months')).toBeNull();

    t.set({ 'plan.purpose': 'BDS' });
    expect(t.form.get('plan.propType')?.hasError('required')).toBe(true);
    expect(t.form.get('plan.months')).toBeNull();

    t.set({ 'plan.purpose': 'SXKD' });
    expect(t.form.get('plan.propType')).toBeNull();
    expect(t.value('plan.months')).toHaveLength(12);
    expect(t.value('plan.months.11.label')).toBe('Tháng 12');
  });

  it('field tính: cập nhật cả model lẫn control, có trong getRawValue', () => {
    const t = setup();
    t.set({ 'plan.amount': 120_000_000, 'plan.termMonths': 12, 'plan.rate': 12 });
    expect(t.value('plan.installment')).toBe(10_661_855);
    expect(t.model.plan.installment).toBe(10_661_855);
    expect(t.form.getRawValue().plan.totalPayable).toBe(127_942_256);

    t.set({ 'plan.method': 'EQUAL_PRINCIPAL' });
    expect(t.value('plan.installment')).toBe(11_200_000);
  });

  it('bảng 12 tháng: cột tính theo dòng, tổng và DSCR có validator', () => {
    const t = setup();
    t.set({ 'plan.purpose': 'SXKD', 'plan.amount': 1_200_000_000, 'plan.termMonths': 12 });
    t.set({ 'plan.rate': 0 });
    t.set({
      'plan.months.0.revenue': 1_000_000_000,
      'plan.months.0.cogs': 600_000_000,
      'plan.months.0.opex': 150_000_000,
    });
    expect(t.value('plan.months.0.gross')).toBe(400_000_000);
    expect(t.value('plan.months.0.net')).toBe(250_000_000);
    expect(t.value('plan.months.0.margin')).toBe(25);
    expect(t.value('plan.totalRevenue')).toBe(1_000_000_000);
    // LN bình quân 250tr / 12 ≈ 20,8tr ; trả mỗi kỳ 100tr → DSCR 0,21 < 1,2
    expect(t.value('plan.dscr')).toBeCloseTo(0.21, 2);
    expect(t.form.get('plan.dscr')?.hasError('min')).toBe(true);
  });

  it('nhóm lặp: "Số tài sản" quyết định số section; giảm số → xoá dữ liệu tài sản thừa', () => {
    const t = setup();
    expect(t.form.get('plan.c1Type')).toBeTruthy(); // mặc định 1 tài sản
    expect(t.form.get('plan.c2Type')).toBeNull();

    t.set({ 'plan.collateralCount': 3 });
    expect(t.form.get('plan.c3Type')).toBeTruthy();
    expect(t.form.get('plan.c4Type')).toBeNull();

    t.set({ 'plan.amount': 1000, 'plan.c1Value': 1000, 'plan.c1Ltv': 70 });
    t.set({ 'plan.c2Value': 1000, 'plan.c2Ltv': 50 });
    expect(t.value('plan.coverage')).toBe(120);

    t.set({ 'plan.collateralCount': 1 });
    expect(t.model.plan.c2Value).toBeUndefined();
    expect(t.value('plan.coverage')).toBe(70);
    expect(t.form.get('plan.coverage')?.hasError('min')).toBe(true);
  });

  it('đổi loại tài sản (người dùng) → gợi ý LTV', () => {
    const t = setup();
    t.userChange('c1Type', 'TIEN_GUI');
    expect(t.value('plan.c1Ltv')).toBe(95);
  });

  it('quy tắc riêng (check): ân hạn < thời hạn; ngày trả đầu tiên ≤ 3 tháng sau giải ngân', () => {
    const t = setup();
    t.set({ 'plan.termMonths': 12, 'plan.hasGrace': true });
    t.set({ 'plan.graceMonths': 12 });
    expect(t.form.get('plan.graceMonths')?.hasError('check0')).toBe(true);

    t.set({
      'plan.disburseDate': new Date(2026, 0, 1),
      'plan.firstPaymentDate': new Date(2026, 5, 1),
    });
    expect(t.form.get('plan.firstPaymentDate')?.hasError('check0')).toBe(true);
  });

  it('xếp hạng D → bắt buộc nhập lý do ngoại lệ', () => {
    const t = setup();
    expect(t.form.get('plan.exceptionReason')).toBeNull();
    const zero = Object.fromEntries(
      [
        'Age',
        'Edu',
        'Job',
        'WorkYears',
        'Residence',
        'Dependents',
        'CreditHistory',
        'Relationship',
        'Deposit',
        'Market',
        'Management',
        'Plan',
        'Legal',
        'Liquidity',
      ].map((c) => [`plan.score${c}`, 0]),
    );
    t.set({ ...zero, 'plan.collateralCount': 0, 'plan.h1Income': 100, 'plan.expOtherLoans': 90 });
    expect(t.value('plan.rating')).toBe('D');
    expect(t.form.get('plan.exceptionReason')?.hasError('required')).toBe(true);
  });
});
