import { isDevMode } from '@angular/core';
import { withDevtools, withDevToolsStub } from '@angular-architects/ngrx-toolkit';

/**
 * Hiện store trong Redux DevTools (xem lịch sử thay đổi state, tên từng thao tác) — chỉ ở dev.
 * Mọi store của feature nên có dòng này: signalStore(..., withStoreDevtools('customerList')).
 */
export const withStoreDevtools: typeof withDevtools = isDevMode() ? withDevtools : withDevToolsStub;
