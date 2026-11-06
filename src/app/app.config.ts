import { registerLocaleData } from '@angular/common';
import localeVi from '@angular/common/locales/vi';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withRouterConfig } from '@angular/router';
import { provideFormlyCore } from '@ngx-formly/core';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { FileStorageService } from './core/file-storage.service';
import { mockBackendInterceptor } from './mock/mock-backend.interceptor';
import { apiErrorInterceptor } from './shared/data';
import { DF_FILE_STORAGE, DYNAMIC_FORM_CONFIG } from './shared/dynamic-form';
import { AppThemePreset, PRIMENG_VI } from './theme';

registerLocaleData(localeVi);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding: tham số route (:id) → input() của component trang.
    // canceledNavigationResolution 'computed': khi guard "chưa lưu" huỷ một lần Back, lịch sử trình
    // duyệt được khôi phục đúng (mặc định 'replace' ghi đè mục lịch sử → mất bộ lọc của danh sách).
    provideRouter(
      routes,
      withComponentInputBinding(),
      withRouterConfig({ canceledNavigationResolution: 'computed' }),
    ),
    // Thứ tự: apiErrorInterceptor bọc ngoài → thấy lỗi của mọi request. Mock backend luôn cuối cùng
    // (đứng ở vị trí của server thật) — xoá khi có API.
    provideHttpClient(
      withInterceptors([apiErrorInterceptor, authInterceptor, mockBackendInterceptor]),
    ),
    // Toast dùng chung toàn app (<p-toast> nằm ở App).
    MessageService,
    { provide: LOCALE_ID, useValue: 'vi' },
    providePrimeNG({
      theme: { preset: AppThemePreset, options: { darkModeSelector: '.app-dark' } },
      translation: PRIMENG_VI,
    }),
    provideFormlyCore(DYNAMIC_FORM_CONFIG),
    // Field files() của mọi form tải tệp qua service này.
    { provide: DF_FILE_STORAGE, useExisting: FileStorageService },
  ],
};
