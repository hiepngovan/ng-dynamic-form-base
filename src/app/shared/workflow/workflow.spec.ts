import { TestBed } from '@angular/core/testing';
import { signalStore } from '@ngrx/signals';
import { of, throwError } from 'rxjs';
import { withDetail } from '../data';
import { withWorkflow } from './with-workflow';
import { availableActions, defineWorkflow, isEditable } from './workflow';

const W = defineWorkflow<'DRAFT' | 'SENT' | 'DONE', 'send' | 'approve', 'edit' | 'approve'>({
  states: {
    DRAFT: { label: 'Nháp', editable: true },
    SENT: { label: 'Chờ duyệt' },
    DONE: { label: 'Xong' },
  },
  actions: {
    send: { label: 'Gửi', from: ['DRAFT'], to: 'SENT', permission: 'edit' },
    approve: { label: 'Duyệt', from: ['SENT'], to: 'DONE', permission: 'approve' },
  },
});

interface Doc {
  id?: string | null;
  status?: string;
}

describe('Workflow', () => {
  it('thao tác theo trạng thái và quyền', () => {
    expect(availableActions(W, 'DRAFT').map((a) => a.key)).toEqual(['send']);
    expect(availableActions(W, 'SENT', (p) => p === 'edit')).toEqual([]);
    expect(availableActions(W, 'SENT', (p) => p === 'approve').map((a) => a.key)).toEqual([
      'approve',
    ]);
    expect(availableActions(W, null)).toEqual([]);
  });

  it('sửa được: bản ghi mới hoặc trạng thái editable', () => {
    expect(isEditable(W, null)).toBe(true);
    expect(isEditable(W, 'DRAFT')).toBe(true);
    expect(isEditable(W, 'SENT')).toBe(false);
  });

  describe('withWorkflow', () => {
    let fail = false;
    const calls: unknown[][] = [];
    const Store = signalStore(
      withDetail<Doc>({
        load: () => (id) => of({ id, status: 'DRAFT' }),
        save: () => (v) => of(v),
      }),
      withWorkflow<Doc>({
        transition: () => (id, action, comment) => {
          calls.push([id, action, comment]);
          return fail
            ? throwError(() => ({ status: 409, message: 'Sai trạng thái' }))
            : of({ id, status: 'SENT' });
        },
      }),
    );

    const setup = () => {
      TestBed.configureTestingModule({ providers: [Store] });
      const store = TestBed.inject(Store);
      store.load('d1');
      return store;
    };

    beforeEach(() => {
      fail = false;
      calls.length = 0;
    });

    it('act → gọi API với id hiện tại, cập nhật entity', async () => {
      const store = setup();
      const p = store.act('send', 'ok');
      expect(store.acting()).toBe('send');
      await p;
      expect(calls).toEqual([['d1', 'send', 'ok']]);
      expect(store.entity()?.status).toBe('SENT');
      expect(store.acting()).toBeNull();
    });

    it('lỗi → ném ApiError, giữ nguyên entity', async () => {
      fail = true;
      const store = setup();
      await expect(store.act('send')).rejects.toMatchObject({ status: 409 });
      expect(store.entity()?.status).toBe('DRAFT');
      expect(store.error()?.message).toBe('Sai trạng thái');
    });
  });
});
