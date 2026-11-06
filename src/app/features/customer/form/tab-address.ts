import { FormlyFieldConfig } from '@ngx-formly/core';
import { FieldBuilder } from '../../../shared/dynamic-form';
import { Customer } from '../customer.model';
import { MasterDataService } from '../../../core/master-data.service';

export function addressTab(f: FieldBuilder<Customer>, md: MasterDataService): FormlyFieldConfig[] {
  return [
    f.section('Địa chỉ thường trú / trụ sở', [
      // Field NGUỒN tự reset field phụ thuộc (resets): chỉ chạy khi người dùng đổi, không chạy khi nạp dữ liệu.
      f.select('provinceId', 'Tỉnh/Thành phố', {
        options: md.provinces(),
        required: true,
        resets: ['wardId'],
      }),
      // Field ĐÍCH chỉ lo tải danh sách theo field cha (dependsOn): khoá khi cha rỗng.
      f.select('wardId', 'Phường/Xã', {
        required: true,
        dependsOn: 'provinceId',
        loadOptions: (provinceId) => md.wards(provinceId),
      }),
      f.text('postalCode', 'Mã bưu chính', { maxLength: 6, pattern: /^\d{5,6}$/ }),
      f.text('street', 'Số nhà, đường', { col: 12, required: true, maxLength: 255 }),
    ]),

    f.section('Địa chỉ liên hệ', [
      f.checkbox('sameAddress', 'Địa chỉ liên hệ giống địa chỉ thường trú / trụ sở', {
        col: 12,
        defaultValue: true,
      }),
      f.select('contactProvinceId', 'Tỉnh/Thành phố', {
        options: md.provinces(),
        required: true,
        resets: ['contactWardId'],
        hideIf: (m) => !!m.sameAddress,
      }),
      f.select('contactWardId', 'Phường/Xã', {
        required: true,
        dependsOn: 'contactProvinceId',
        loadOptions: (id) => md.wards(id),
        hideIf: (m) => !!m.sameAddress,
      }),
      f.text('contactStreet', 'Số nhà, đường', {
        col: 12,
        required: true,
        hideIf: (m) => !!m.sameAddress,
      }),
    ]),

    f.section('Giao hàng', [
      f.select('deliveryTime', 'Khung giờ nhận hàng', {
        options: [
          { value: 'ANY', label: 'Bất kỳ' },
          { value: 'AM', label: 'Buổi sáng (8h–12h)' },
          { value: 'PM', label: 'Buổi chiều (13h–17h)' },
          { value: 'OFFICE', label: 'Giờ hành chính' },
        ],
      }),
      f.textarea('deliveryNote', 'Ghi chú giao hàng', { col: 8, rows: 2 }),
    ]),
  ];
}
