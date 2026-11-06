import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { FileRef } from './props';

/** Tiến trình tải một tệp: các mốc phần trăm, kết thúc bằng tệp đã lưu. */
export type UploadEvent = { type: 'progress'; percent: number } | { type: 'done'; file: FileRef };

/**
 * Nơi lưu tệp của field files(). Base chỉ định nghĩa hợp đồng; ứng dụng cung cấp cách tải thật
 * (core/file-storage.service.ts) → mọi form dùng chung một cách tải, feature không phải viết lại.
 */
export interface FileStorage {
  upload(file: File): Observable<UploadEvent>;
}

export const DF_FILE_STORAGE = new InjectionToken<FileStorage>('DF_FILE_STORAGE');
