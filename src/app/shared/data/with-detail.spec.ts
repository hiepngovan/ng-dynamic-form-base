import { inject, Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { signalStore } from '@ngrx/signals';
import { of, throwError } from 'rxjs';
import { ApiError } from './models';
import { withDetail } from './with-detail';

interface Item {
  id?: string | null;
  name: string;
}

@Injectable()
class FakeApi {
  fail: ApiError | null = null;
  get = (id: string) => of({ id, name: `Bản ghi ${id}` });
  save = (v: Item, id: string | null) =>
    this.fail ? throwError(() => this.fail) : of({ ...v, id: id ?? 'new-1' });
}

const DetailStore = signalStore(
  withDetail<Item>({
    load: () => {
      const api = inject(FakeApi);
      return (id) => api.get(id);
    },
    save: () => {
      const api = inject(FakeApi);
      return (v, id) => api.save(v, id);
    },
  }),
);

describe('withDetail', () => {
  let store: InstanceType<typeof DetailStore>;
  let api: FakeApi;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [FakeApi, DetailStore] });
    store = TestBed.inject(DetailStore);
    api = TestBed.inject(FakeApi);
  });

  it('load theo id', () => {
    store.load('7');
    expect(store.entity()).toEqual({ id: '7', name: 'Bản ghi 7' });
    expect(store.loading()).toBe(false);
  });

  it('tạo mới: save với id null, sau đó store giữ id của bản ghi đã tạo', async () => {
    const saved = await store.save({ name: 'Mới' });
    expect(saved.id).toBe('new-1');
    expect(store.id()).toBe('new-1');
    expect(store.saving()).toBe(false);
  });

  it('lỗi 400: save ném ApiError kèm fieldErrors để màn hình gắn vào form', async () => {
    api.fail = { status: 400, message: 'Sai dữ liệu', fieldErrors: { name: 'Trùng tên' } };
    await expect(store.save({ name: 'x' })).rejects.toEqual(api.fail);
    expect(store.error()?.fieldErrors).toEqual({ name: 'Trùng tên' });
    expect(store.saving()).toBe(false);
  });
});
