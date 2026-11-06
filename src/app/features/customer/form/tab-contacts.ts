import { FormlyFieldConfig } from '@ngx-formly/core';
import { FieldBuilder } from '../../../shared/dynamic-form';
import { Contact, Customer } from '../customer.model';

export function contactsTab(f: FieldBuilder<Customer>): FormlyFieldConfig[] {
  return [
    f.section('Danh sách người liên hệ', [
      f.table<Contact>('contacts', (c) => [
        c.text('fullName', 'Họ tên', { required: true, maxLength: 100 }),
        c.text('position', 'Chức vụ'),
        c.phone('phone', 'Điện thoại', { required: true }),
        c.email('email', 'Email'),
        c.checkbox('isPrimary', 'Liên hệ chính'),
      ]),
    ]),
  ];
}
