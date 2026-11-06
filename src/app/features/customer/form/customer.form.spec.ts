import { TestBed } from '@angular/core/testing';
import { provideFormlyCore } from '@ngx-formly/core';
import { DYNAMIC_FORM_CONFIG } from '../../../shared/dynamic-form';
import { buildTestForm } from '../../../shared/dynamic-form/testing/build-test-form';
import { Customer } from '../customer.model';
import { MasterDataService } from '../master-data.service';
import { buildCustomerForm, countInputFields } from './customer.form';

describe('Form khách hàng (cấu hình)', () => {
  const setup = (model: Partial<Customer> = {}) =>
    buildTestForm<Customer>(buildCustomerForm(TestBed.inject(MasterDataService)), model);

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideFormlyCore(DYNAMIC_FORM_CONFIG)] });
  });

  it('có khoảng 150 field nhập liệu', () => {
    const count = countInputFields(buildCustomerForm(TestBed.inject(MasterDataService)));
    expect(count).toBeGreaterThanOrEqual(140);
  });

  it('control của MỌI tab được tạo ngay khi dựng form (không cần render)', () => {
    const { form } = setup();
    expect(form.get('fullName')).toBeTruthy(); // tab 1
    expect(form.get('street')).toBeTruthy(); // tab 2
    expect(form.get('creditLimit')).toBeTruthy(); // tab 3
    expect(form.get('contacts')).toBeTruthy(); // tab 4
    expect(form.get('extra.f090')).toBeTruthy(); // tab 5 (có key 'extra')
  });

  it('form trống không hợp lệ, lỗi nằm ở nhiều tab', () => {
    const { form } = setup();
    expect(form.invalid).toBe(true);
    expect(form.get('fullName')?.hasError('required')).toBe(true); // tab 1
    expect(form.get('street')?.hasError('required')).toBe(true); // tab 2
  });

  it('cá nhân: có CCCD, không có MST; doanh nghiệp thì ngược lại', () => {
    const t = setup({ customerType: 'PERSONAL' });
    expect(t.form.get('identityNo')).toBeTruthy();
    expect(t.form.get('taxCode')).toBeNull();

    t.setModel({ customerType: 'COMPANY' });
    expect(t.form.get('identityNo')).toBeNull();
    expect(t.form.get('taxCode')?.hasError('required')).toBe(true);
  });

  it('ẩn section → giá trị bên trong bị xoá', () => {
    const t = setup({ customerType: 'PERSONAL', identityNo: '001090012345' });
    t.setModel({ customerType: 'COMPANY' });
    expect(t.model.identityNo).toBeUndefined();
  });

  it('đổi Tỉnh (người dùng) → reset Phường/Xã ở cả control lẫn model', () => {
    const t = setup({ provinceId: 'HN', wardId: 'HN-W03' });
    t.userChange('provinceId', 'HCM');
    expect(t.form.get('wardId')?.value).toBeNull();
    expect(t.model.wardId).toBeNull();
  });

  it('nạp dữ liệu sửa KHÔNG reset Phường/Xã', () => {
    const t = setup({ provinceId: 'HN', wardId: 'HN-W03' });
    expect(t.form.get('wardId')?.value).toBe('HN-W03');
  });

  it('Đặt cọc không được lớn hơn Hạn mức; tăng Hạn mức thì hết lỗi', () => {
    const t = setup({ creditLimit: 100, deposit: 200 });
    expect(t.form.get('deposit')?.hasError('lte')).toBe(true);

    t.userChange('creditLimit', 500); // revalidates: ['deposit']
    expect(t.form.get('deposit')?.hasError('lte')).toBe(false);
  });

  it('Ngày hết hạn phải sau Ngày cấp', () => {
    const t = setup({
      customerType: 'PERSONAL',
      identityIssueDate: new Date(2025, 0, 10),
      identityExpiryDate: new Date(2024, 0, 1),
    });
    expect(t.form.get('identityExpiryDate')?.hasError('dateAfter')).toBe(true);
  });

  it('Xuất VAT → bắt buộc email hoá đơn', () => {
    const t = setup({ vatRegistered: false });
    expect(t.form.get('invoiceEmail')?.disabled).toBe(true);

    t.setModel({ vatRegistered: true });
    expect(t.form.get('invoiceEmail')?.disabled).toBe(false);
    expect(t.form.get('invoiceEmail')?.hasError('required')).toBe(true);
  });

  it('validator dùng chung: SĐT, CCCD, MST', () => {
    const t = setup({ customerType: 'PERSONAL', phone: '12345', identityNo: '123' });
    expect(t.form.get('phone')?.hasError('vnPhone')).toBe(true);
    expect(t.form.get('identityNo')?.hasError('cccd')).toBe(true);

    t.setModel({ customerType: 'COMPANY' });
    t.form.get('taxCode')?.setValue('0101234567-001');
    expect(t.form.get('taxCode')?.valid).toBe(true);
  });

  it('onChange tuỳ biến: tên chủ tài khoản tự viết hoa', () => {
    const t = setup();
    t.userChange('bankAccountName', 'nguyen van an');
    expect(t.form.get('bankAccountName')?.value).toBe('NGUYEN VAN AN');
    expect(t.model.bankAccountName).toBe('NGUYEN VAN AN');
  });
});
