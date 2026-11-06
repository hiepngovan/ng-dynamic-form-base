import { registerLocaleData } from '@angular/common';
import localeVi from '@angular/common/locales/vi';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideFormlyCore } from '@ngx-formly/core';
import { providePrimeNG } from 'primeng/config';
import { routes } from './app.routes';
import { DYNAMIC_FORM_CONFIG } from './shared/dynamic-form';
import { AppThemePreset, PRIMENG_VI } from './theme';

registerLocaleData(localeVi);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: LOCALE_ID, useValue: 'vi' },
    providePrimeNG({
      theme: { preset: AppThemePreset, options: { darkModeSelector: '.app-dark' } },
      translation: PRIMENG_VI,
    }),
    provideFormlyCore(DYNAMIC_FORM_CONFIG),
  ],
};
