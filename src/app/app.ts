import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Select } from 'primeng/select';
import { Toast } from 'primeng/toast';
import { AppStore, ROLE_OPTIONS, Role } from './core/app.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Toast, Select, FormsModule],
  template: `
    <p-toast />
    <header class="app-topbar">
      <div class="app-topbar__inner">
        <span class="app-topbar__brand">Dynamic Form Base</span>
        <nav>
          <a routerLink="/customers" routerLinkActive="active">Khách hàng</a>
        </nav>
        <span class="app-topbar__spacer"></span>
        <span class="muted">{{ app.user().name }}</span>
        <p-select
          [options]="roles"
          [ngModel]="app.user().role"
          (ngModelChange)="app.switchRole($event)"
          optionLabel="label"
          optionValue="value"
          size="small"
          ariaLabel="Vai trò"
        />
      </div>
    </header>
    <main class="app-shell"><router-outlet /></main>
  `,
})
export class App {
  protected readonly app = inject(AppStore);
  protected readonly roles: { value: Role; label: string }[] = ROLE_OPTIONS;
}
