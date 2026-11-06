import { FormlyFieldConfig } from '@ngx-formly/core';
import { FieldBuilder } from '../../../shared/dynamic-form';
import { Customer } from '../customer.model';
import { MasterDataService } from '../master-data.service';

const isPersonal = (m: Partial<Customer>) => m.customerType === 'PERSONAL';
const isCompany = (m: Partial<Customer>) => m.customerType === 'COMPANY';

export function generalTab(f: FieldBuilder<Customer>, md: MasterDataService): FormlyFieldConfig[] {
  return [
    f.section('Định danh', [
      f.radio(
        'customerType',
        'Loại khách hàng',
        [
          { value: 'PERSONAL', label: 'Cá nhân' },
          { value: 'COMPANY', label: 'Doanh nghiệp' },
        ],
        { required: true, defaultValue: 'PERSONAL' },
      ),
      f.text('code', 'Mã khách hàng', { disabled: true, description: 'Tự sinh khi lưu' }),
      f.text('shortName', 'Tên viết tắt', { maxLength: 50 }),
      f.text('fullName', 'Họ tên / Tên doanh nghiệp', { col: 8, required: true, maxLength: 200 }),
    ]),

    // Cả section ẩn/hiện theo loại khách hàng. Field bị ẩn không validate và bị xoá giá trị.
    f.section(
      'Thông tin cá nhân',
      [
        f.date('dob', 'Ngày sinh', { required: true }),
        f.select('gender', 'Giới tính', {
          options: [
            { value: 'M', label: 'Nam' },
            { value: 'F', label: 'Nữ' },
            { value: 'O', label: 'Khác' },
          ],
        }),
        f.cccd('identityNo', 'Số CCCD', { required: true }),
        // Đổi ngày cấp → validate lại ngày hết hạn (validator so sánh chéo).
        f.date('identityIssueDate', 'Ngày cấp', { revalidates: ['identityExpiryDate'] }),
        f.date('identityExpiryDate', 'Ngày hết hạn', {
          validators: [
            { name: 'dateAfter', options: { field: 'identityIssueDate', label: 'Ngày cấp' } },
          ],
        }),
        f.text('identityIssuePlace', 'Nơi cấp'),
      ],
      { hideIf: (m) => !isPersonal(m) },
    ),

    f.section(
      'Thông tin doanh nghiệp',
      [
        f.taxCode('taxCode', 'Mã số thuế', { required: true }),
        f.text('businessLicenseNo', 'Số giấy phép kinh doanh'),
        f.date('establishedDate', 'Ngày thành lập'),
        f.text('legalRepresentative', 'Người đại diện pháp luật', { col: 8, required: true }),
      ],
      { hideIf: (m) => !isCompany(m) },
    ),

    f.section('Phân loại', [
      f.select('industryId', 'Ngành nghề', { options: md.industries(), required: true }),
      f.select('customerGroupId', 'Nhóm khách hàng', { options: md.customerGroups() }),
      f.select('status', 'Trạng thái', {
        required: true,
        defaultValue: 'ACTIVE',
        options: [
          { value: 'ACTIVE', label: 'Đang hoạt động' },
          { value: 'SUSPENDED', label: 'Tạm ngưng' },
          { value: 'CLOSED', label: 'Ngừng giao dịch' },
        ],
      }),
      f.select('sourceId', 'Nguồn khách hàng', { options: md.sources() }),
      f.select('salesStaffId', 'Nhân viên phụ trách', {
        options: md.salesStaff(),
        tooltip: '200 nhân viên: select tự bật ô tìm kiếm khi có trên 10 lựa chọn',
      }),
    ]),

    f.section('Liên hệ', [
      f.phone('phone', 'Điện thoại', {
        required: true,
        description: 'Nhập 0900000000 để thử lỗi từ server',
      }),
      f.phone('phone2', 'Điện thoại khác'),
      f.email('email', 'Email', { required: true }),
      f.text('website', 'Website', { placeholder: 'https://' }),
      f.text('fax', 'Fax'),
      f.textarea('note', 'Ghi chú', { maxLength: 1000 }),
    ]),
  ];
}
