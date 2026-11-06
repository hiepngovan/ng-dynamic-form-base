import { CanDeactivateFn } from '@angular/router';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/** Hỏi lại khi rời trang mà form còn thay đổi chưa lưu. */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) =>
  !component.hasUnsavedChanges() ||
  confirm('Bạn có thay đổi chưa lưu. Rời trang và bỏ các thay đổi?');
