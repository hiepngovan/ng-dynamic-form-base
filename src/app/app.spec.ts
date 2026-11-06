import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { App } from './app';
import { AppStore } from './core/app.store';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear(); // vai trò giả được nhớ qua F5 → mỗi test bắt đầu từ mặc định
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), MessageService],
    });
  });

  it('khởi tạo được app shell', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Khách hàng');
  });

  it('quyền thay đổi theo vai trò', () => {
    const app = TestBed.inject(AppStore);
    expect(app.can('customer.delete')).toBe(true);
    app.switchRole('STAFF');
    expect(app.can('customer.delete')).toBe(false);
    expect(app.can('customer.edit')).toBe(true);
  });
});
