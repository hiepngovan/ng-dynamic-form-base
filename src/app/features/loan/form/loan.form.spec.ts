import { TestBed } from '@angular/core/testing';
import { provideFormlyCore } from '@ngx-formly/core';
import { of } from 'rxjs';
import { MasterDataService } from '../../../core/master-data.service';
import { DYNAMIC_FORM_CONFIG } from '../../../shared/dynamic-form';
import { buildTestForm } from '../../../shared/dynamic-form/testing/build-test-form';
import { LoanApi } from '../loan.api';
import { LoanApplication } from '../loan.model';
import { buildLoanForm } from './loan.form';

const PACKAGE = {
  value: 'NHA-1',
  label: 'Ưu đãi',
  data: { rate: 6.9, maxTermMonths: 300, maxAmount: 2_000_000_000 },
};
const FILE = { id: 'f1', name: 'cccd.jpg', size: 1, type: 'image/jpeg', url: '#' };

describe('Form hồ sơ vay (cấu hình)', () => {
  const setup = (model: Partial<LoanApplication> = {}) => {
    const api = { categories: () => of([]), products: () => of([]), packages: () => of([]) };
    return buildTestForm<LoanApplication>(
      buildLoanForm(api as unknown as LoanApi, TestBed.inject(MasterDataService)),
      model,
    );
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideFormlyCore(DYNAMIC_FORM_CONFIG)] });
  });

  it('3 bước, field của mọi bước đều có control ngay từ đầu', () => {
    const t = setup();
    expect(t.root.fieldGroup?.[0].type).toBe('steps');
    expect(t.root.fieldGroup?.[0].fieldGroup?.map((s) => s.props?.label)).toEqual([
      'Khách hàng',
      'Khoản vay & tài sản',
      'Hồ sơ đính kèm',
    ]);
    expect(t.form.get('customerId')).toBeTruthy();
    expect(t.form.get('idDocs')).toBeTruthy();
  });

  it('chọn khách hàng (lookup) → điền sẵn mã, điện thoại và nhãn', () => {
    const t = setup();
    const hit = { id: 'c1', code: 'KH000123', fullName: 'Nguyễn Văn An', phone: '0912345678' };
    t.userChange('customerId', 'c1', { value: 'c1', label: hit.fullName, data: hit });
    expect(t.value('customerCode')).toBe('KH000123');
    expect(t.value('customerPhone')).toBe('0912345678');
    expect(t.model.customerName).toBe('Nguyễn Văn An');

    t.userChange('customerId', null, null);
    expect(t.value('customerCode')).toBeNull();
  });

  it('chọn gói vay → điền lãi suất / hạn mức; số tiền, thời hạn kiểm tra theo gói', () => {
    const t = setup();
    t.set({ categoryId: 'BDS', productId: 'NHA' });
    t.userChange('packageId', 'NHA-1', PACKAGE);
    expect(t.value('rate')).toBe(6.9);
    expect(t.value('maxTermMonths')).toBe(300);

    t.set({ amount: 3_000_000_000, termMonths: 360 });
    expect(t.form.get('amount')?.hasError('check0')).toBe(true);
    expect(t.form.get('termMonths')?.hasError('check0')).toBe(true);
    t.set({ amount: 1_000_000_000, termMonths: 240 });
    expect(t.form.get('amount')?.valid).toBe(true);
    expect(t.form.get('termMonths')?.valid).toBe(true);
  });

  it('đổi Nhóm SP → Sản phẩm, Gói vay bị xoá theo chuỗi, kéo theo lãi suất / hạn mức', () => {
    const t = setup();
    t.userChange('categoryId', 'BDS');
    t.userChange('productId', 'NHA');
    t.userChange('packageId', 'NHA-1', PACKAGE);
    expect(t.value('rate')).toBe(6.9);

    t.userChange('categoryId', 'CN');
    expect(t.value('productId')).toBeNull();
    expect(t.value('packageId')).toBeNull();
    expect(t.value('rate')).toBeNull();
    expect(t.value('maxAmount')).toBeNull();
    expect(t.model.packageId).toBeNull();
  });

  it('nạp hồ sơ đã lưu KHÔNG xoá field phụ thuộc (chỉ người dùng đổi mới xoá)', () => {
    const t = setup({ categoryId: 'BDS', productId: 'NHA', packageId: 'NHA-1', rate: 6.9 });
    expect(t.value('productId')).toBe('NHA');
    expect(t.value('packageId')).toBe('NHA-1');
    expect(t.value('rate')).toBe(6.9);
  });

  it('trả hàng tháng, DTI tự tính; DTI > 60% báo lỗi', () => {
    const t = setup();
    t.set({ amount: 120_000_000, termMonths: 12, rate: 0, monthlyIncome: 15_000_000 });
    expect(t.value('installment')).toBe(10_000_000);
    expect(t.value('dti')).toBeCloseTo(66.7, 1);
    expect(t.form.get('dti')?.hasError('max')).toBe(true);
    t.set({ monthlyIncome: 40_000_000 });
    expect(t.form.get('dti')?.valid).toBe(true);
  });

  it('tài sản bảo đảm: bật mới hiện; địa chỉ chỉ với nhà/đất; giấy tờ TS bắt buộc', () => {
    const t = setup();
    expect(t.form.get('collateralType')).toBeNull();
    expect(t.form.get('collateralDocs')).toBeNull();

    t.set({ hasCollateral: true, collateralType: 'CAR' });
    expect(t.form.get('collateralValue')).toBeTruthy();
    expect(t.form.get('collateralAddress')).toBeNull();
    expect(t.form.get('collateralDocs')?.hasError('required')).toBe(true);

    t.set({ collateralType: 'HOUSE' });
    expect(t.form.get('collateralAddress')?.hasError('required')).toBe(true);

    t.set({ amount: 800, collateralValue: 1000 });
    expect(t.value('ltv')).toBe(80);
    expect(t.form.get('ltv')?.hasError('max')).toBe(true);
  });

  it('đính kèm: bắt buộc ≥ 1 tệp; đang tải dở thì không hợp lệ', () => {
    const t = setup();
    const id = t.form.get('idDocs')!;
    expect(id.hasError('required')).toBe(true);
    t.set({ idDocs: [FILE] });
    expect(id.valid).toBe(true);

    const field = t.find('idDocs')!;
    field.props!['uploading'] = 1;
    id.updateValueAndValidity();
    expect(id.hasError('uploading')).toBe(true);
  });

  it('người đồng vay: tick mới bắt buộc nhập', () => {
    const t = setup();
    expect(t.form.get('coBorrowerName')).toBeNull();
    t.set({ hasCoBorrower: true });
    expect(t.form.get('coBorrowerName')?.hasError('required')).toBe(true);
    expect(t.form.get('coBorrowerRelation')?.hasError('required')).toBe(true);
  });
});
