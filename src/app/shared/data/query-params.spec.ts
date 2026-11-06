import { fromParams, reviveDates, toParams } from './query-params';

describe('query params', () => {
  const defaults = { page: 0, size: 20, sort: null, filter: { q: null, status: 'ACTIVE' } };

  it('PageQuery → tham số → PageQuery giữ nguyên (page trên URL bắt đầu từ 1)', () => {
    const q = {
      page: 2,
      size: 50,
      sort: { field: 'code', order: 'desc' as const },
      filter: { q: 'an', status: null },
    };
    const params = toParams(q);
    expect(params).toEqual({ page: '3', size: '50', sort: 'code,desc', q: 'an' });
    expect(fromParams(params, defaults)).toEqual({ ...q, filter: { q: 'an', status: 'ACTIVE' } });
  });

  it('tham số sai / thiếu → dùng mặc định', () => {
    expect(fromParams({ page: 'abc', size: '-1', sort: 'code,up' }, defaults)).toEqual(defaults);
  });

  it('reviveDates: chuỗi ISO → Date, đệ quy, không đụng chuỗi thường', () => {
    const v = reviveDates({
      a: '2026-11-02T00:00:00.000Z',
      b: ['x', { c: '2026-01-01T10:00:00Z' }],
      d: '2026',
    });
    expect(v.a).toBeInstanceOf(Date);
    expect((v.b[1] as unknown as { c: Date }).c).toBeInstanceOf(Date);
    expect(v.d).toBe('2026');
  });
});
