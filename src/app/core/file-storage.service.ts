import { HttpClient, HttpEventType } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { filter, map, Observable } from 'rxjs';
import { FileRef, FileStorage, UploadEvent } from '../shared/dynamic-form';

/**
 * Cách tải tệp DÙNG CHUNG cho mọi field files() (đăng ký ở app.config qua DF_FILE_STORAGE).
 * POST multipart /api/files → server trả FileRef. Báo tiến trình theo phần trăm.
 */
@Injectable({ providedIn: 'root' })
export class FileStorageService implements FileStorage {
  private readonly http = inject(HttpClient);

  upload(file: File): Observable<UploadEvent> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http
      .post<FileRef>('/api/files', body, { reportProgress: true, observe: 'events' })
      .pipe(
        filter((e) => e.type === HttpEventType.UploadProgress || e.type === HttpEventType.Response),
        map((e): UploadEvent => {
          if (e.type === HttpEventType.Response) return { type: 'done', file: e.body! };
          const total = 'total' in e && e.total ? e.total : file.size;
          const loaded = 'loaded' in e ? e.loaded : 0;
          return { type: 'progress', percent: Math.round((loaded / total) * 100) };
        }),
      );
  }
}
