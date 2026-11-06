import { Location } from '@angular/common';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Quay lại màn hình danh sách, giữ nguyên trang / bộ lọc nếu vừa đi từ danh sách sang.
 *
 * - Link "← Danh sách": `(click)="back($event)"`. Có lịch sử trong app → history.back();
 *   không có (mở thẳng URL) → để routerLink của link tự điều hướng.
 * - Nút Huỷ: `back()`. Có lịch sử → history.back(); không có → tới `listUrl`.
 *
 * Gọi khi khởi tạo component (cần injection context):
 * `readonly back = injectBackToList('/customers');`
 */
export function injectBackToList(listUrl: string): (event?: Event) => void {
  const router = inject(Router);
  const location = inject(Location);
  return (event) => {
    if (router.lastSuccessfulNavigation()?.previousNavigation) {
      event?.preventDefault();
      location.back();
    } else if (!event) {
      void router.navigate([listUrl]);
    }
  };
}
