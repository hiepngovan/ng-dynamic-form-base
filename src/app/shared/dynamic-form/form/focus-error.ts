import { afterNextRender, Injector } from '@angular/core';

/**
 * Phần tử nhập liệu đang lỗi (input thường hoặc component PrimeNG như p-select, p-datepicker).
 * Loại trừ thẻ <form>: nó cũng mang class ng-invalid nên sẽ khớp với mọi input bên trong.
 */
const INVALID = ':not(form).ng-invalid.ng-touched';
const INVALID_SELECTOR = [
  `input${INVALID}`,
  `textarea${INVALID}`,
  `${INVALID} input:not([type=hidden])`,
  `${INVALID} [role=combobox]`,
  // Ô nhập không gắn trực tiếp formControl (ô ngày chưa tạo p-datepicker, lookup, đính kèm).
  '.df-field--error input:not([type=hidden])',
  '.df-field--error button',
  // Field chỉ hiển thị (field tính toán) đang lỗi: không có input, chỉ cuộn tới.
  '.df-field--error .df-readonly',
].join(', ');

/** Sau lần render kế tiếp: cuộn tới và focus vào field lỗi đầu tiên trong `host`. */
export function focusFirstError(host: HTMLElement, injector: Injector): void {
  afterNextRender(
    () => {
      const el = host.querySelector<HTMLElement>(INVALID_SELECTOR);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el?.focus({ preventScroll: true });
    },
    { injector },
  );
}
