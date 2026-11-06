import { ConfigOption } from '@ngx-formly/core';
import { VALIDATION_MESSAGES } from './validation/messages';
import { VALIDATORS } from './validation/validators';
import { CellWrapper } from './wrappers/cell.wrapper';
import { FormFieldWrapper } from './wrappers/form-field.wrapper';
import { SectionWrapper } from './wrappers/section.wrapper';
import { CheckboxType } from './types/checkbox.type';
import { ComponentType } from './types/component.type';
import { DateType } from './types/date.type';
import { FileType } from './types/file.type';
import { LookupType } from './types/lookup.type';
import { InputType } from './types/input.type';
import { NumberType } from './types/number.type';
import { RadioType } from './types/radio.type';
import { SelectType } from './types/select.type';
import { StepsType } from './types/steps.type';
import { TableType } from './types/table.type';
import { TabsType } from './types/tabs.type';
import { TextareaType } from './types/textarea.type';

/**
 * ĐĂNG KÝ TẬP TRUNG mọi type / wrapper / validator / message của hệ thống.
 * Thêm type mới: tạo component trong ./types, đăng ký ở đây, thêm hàm tương ứng trong FieldBuilder.
 */
export const DYNAMIC_FORM_CONFIG: ConfigOption = {
  types: [
    { name: 'input', component: InputType, wrappers: ['form-field'] },
    { name: 'textarea', component: TextareaType, wrappers: ['form-field'] },
    { name: 'number', component: NumberType, wrappers: ['form-field'] },
    // Biến thể: dùng lại component của `number`, kèm cấu hình mặc định.
    {
      name: 'money',
      extends: 'number',
      defaultOptions: { props: { mode: 'currency', currency: 'VND', maxFractionDigits: 0 } },
    },
    { name: 'date', component: DateType, wrappers: ['form-field'] },
    { name: 'select', component: SelectType, wrappers: ['form-field'] },
    { name: 'lookup', component: LookupType, wrappers: ['form-field'] },
    { name: 'radio', component: RadioType, wrappers: ['form-field'] },
    { name: 'checkbox', component: CheckboxType, wrappers: ['form-field'] },
    { name: 'files', component: FileType, wrappers: ['form-field'] },
    { name: 'tabs', component: TabsType },
    { name: 'steps', component: StepsType },
    { name: 'table', component: TableType },
    { name: 'component', component: ComponentType },
  ],
  wrappers: [
    { name: 'form-field', component: FormFieldWrapper },
    { name: 'cell', component: CellWrapper },
    { name: 'section', component: SectionWrapper },
  ],
  validators: VALIDATORS,
  validationMessages: VALIDATION_MESSAGES,
  extras: {
    // Chỉ tính lại expressions khi giá trị đổi (không chạy mỗi vòng change detection).
    checkExpressionOn: 'modelChange',
    // Field bị ẩn không được render.
    lazyRender: true,
    // Ẩn field → xoá giá trị, tránh gửi dữ liệu rác lên server.
    resetFieldOnHide: true,
  },
};
