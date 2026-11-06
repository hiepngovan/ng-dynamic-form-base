/**
 * Bản nháp của form lưu trên TRÌNH DUYỆT (localStorage), để không mất dữ liệu đang nhập dở khi
 * lỡ đóng tab / F5 / mất mạng. Chỉ là lớp an toàn phía client — không thay cho "Lưu" lên server.
 *
 * Lưu ý bảo mật: dữ liệu nằm trên máy người dùng cho tới khi lưu thành công hoặc bỏ qua bản nháp.
 * Máy dùng chung / dữ liệu nhạy cảm → cân nhắc tắt (không truyền draftKey) hoặc xoá khi đăng xuất
 * (clearAllDrafts).
 */
const PREFIX = 'df-draft:';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

export interface Draft<T = unknown> {
  savedAt: Date;
  value: T;
}

export function readDraft<T>(key: string): Draft<T> | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw, (_k, v) =>
      typeof v === 'string' && ISO_DATE.test(v) ? new Date(v) : v,
    ) as Draft<T>;
  } catch {
    return null;
  }
}

export function writeDraft(key: string, value: unknown): Date | null {
  const savedAt = new Date();
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ savedAt, value }));
    return savedAt;
  } catch {
    return null; // hết dung lượng / trình duyệt chặn → bỏ qua, form vẫn dùng bình thường
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* bỏ qua */
  }
}

/** Xoá mọi bản nháp (gọi khi đăng xuất). */
export function clearAllDrafts(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* bỏ qua */
  }
}
