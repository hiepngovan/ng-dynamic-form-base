import { FormlyFieldConfig } from '@ngx-formly/core';
import { fieldsFor } from '../../../shared/dynamic-form';
import { Customer } from '../customer.model';
import { MasterDataService } from '../master-data.service';
import { addressTab } from './tab-address';
import { contactsTab } from './tab-contacts';
import { extraTab } from './tab-extra';
import { financeTab } from './tab-finance';
import { generalTab } from './tab-general';

/**
 * Cấu hình form Khách hàng — chỉ ghép các tab. Mỗi tab một file → dễ review, nhiều dev làm song song.
 * Service được truyền vào qua tham số; file cấu hình không tự inject hay gọi API.
 */
export function buildCustomerForm(md: MasterDataService): FormlyFieldConfig[] {
  const f = fieldsFor<Customer>();
  return [
    f.tabs(
      f.tab('Thông tin chung', generalTab(f, md)),
      f.tab('Địa chỉ', addressTab(f, md)),
      f.tab('Tài chính', financeTab(f, md)),
      f.tab('Người liên hệ', contactsTab(f)),
      f.tab('Thông tin bổ sung', extraTab(), { key: 'extra' }),
    ),
  ];
}

/** Đếm số field nhập liệu (field lá có key) — hiển thị trên trang để tiện đo hiệu năng. */
export function countInputFields(fields: FormlyFieldConfig[]): number {
  return fields.reduce((n, fd) => {
    const arrayCols =
      typeof fd.fieldArray === 'object' ? (fd.fieldArray.fieldGroup?.length ?? 0) : 0;
    if (fd.fieldGroup) return n + countInputFields(fd.fieldGroup);
    if (arrayCols) return n + arrayCols;
    return n + (fd.key != null && fd.type !== 'component' ? 1 : 0);
  }, 0);
}
