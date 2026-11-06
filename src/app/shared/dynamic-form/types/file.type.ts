import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { ProgressBar } from 'primeng/progressbar';
import { Subscription } from 'rxjs';
import { DfFieldType } from './df-field-type';
import { DF_FILE_STORAGE } from './file-storage';
import { FileProps, FileRef } from '../props';

interface Upload {
  key: number;
  name: string;
  percent: number;
  sub: Subscription;
}

/**
 * Đính kèm tệp. Giá trị = FileRef[] của tệp ĐÃ tải lên (qua DF_FILE_STORAGE do ứng dụng cung cấp).
 * Chọn tệp → kiểm tra định dạng / dung lượng / số lượng → tải ngay, hiện tiến trình.
 * Đang tải dở: props.uploading > 0 → validator 'uploading' báo lỗi, form không submit được.
 */
@Component({
  selector: 'df-files',
  imports: [Button, ProgressBar, DecimalPipe],
  host: {
    '(dragover)': 'onDrag($event, true)',
    '(dragleave)': 'onDrag($event, false)',
    '(drop)': 'onDrop($event)',
  },
  template: `
    @let files = value();
    @if (!readonly) {
      <div class="df-files__drop" [class.df-files__drop--over]="over()">
        <p-button
          label="Chọn tệp"
          icon="pi pi-paperclip"
          severity="secondary"
          [outlined]="true"
          size="small"
          [disabled]="formControl.disabled || files.length + uploads().length >= maxFiles"
          (onClick)="picker.click()"
        />
        <span class="muted">
          hoặc kéo thả vào đây · tối đa {{ maxFiles }} tệp, mỗi tệp ≤ {{ props.maxSizeMb }} MB
          @if (props.accept) {
            · {{ props.accept }}
          }
        </span>
        <input
          #picker
          type="file"
          hidden
          [id]="id"
          [accept]="props.accept ?? ''"
          [multiple]="maxFiles > 1"
          (change)="onPick(picker)"
        />
      </div>
    }
    <ul class="df-files__list">
      @for (f of files; track f.id) {
        <li class="df-files__item">
          <i class="pi pi-file"></i>
          <a [href]="f.url" target="_blank" rel="noopener">{{ f.name }}</a>
          <span class="muted">{{ f.size / 1024 | number: '1.0-0' }} KB</span>
          @if (!readonly && !formControl.disabled) {
            <p-button
              icon="pi pi-times"
              severity="secondary"
              [text]="true"
              [rounded]="true"
              size="small"
              [ariaLabel]="'Xoá ' + f.name"
              (onClick)="remove(f)"
            />
          }
        </li>
      }
      @for (u of uploads(); track u.key) {
        <li class="df-files__item">
          <i class="pi pi-spin pi-spinner"></i>
          <span>{{ u.name }}</span>
          <p-progressbar [value]="u.percent" [showValue]="false" styleClass="df-files__bar" />
          <p-button
            icon="pi pi-times"
            severity="secondary"
            [text]="true"
            [rounded]="true"
            size="small"
            ariaLabel="Huỷ tải lên"
            (onClick)="cancel(u)"
          />
        </li>
      }
      @if (readonly && !files.length) {
        <li class="df-readonly">—</li>
      }
    </ul>
    @for (msg of rejected(); track $index) {
      <small class="df-field__error">{{ msg }}</small>
    }
  `,
})
export class FileType extends DfFieldType<FileProps> {
  // Không bắt buộc lúc dựng form (Formly có thể tạo tạm component); thiếu thì báo khi tải.
  private readonly storage = inject(DF_FILE_STORAGE, { optional: true });
  readonly uploads = signal<Upload[]>([]);
  readonly rejected = signal<string[]>([]);
  readonly over = signal(false);
  private seq = 0;

  constructor() {
    super();
    inject(DestroyRef).onDestroy(() => this.uploads().forEach((u) => u.sub.unsubscribe()));
  }

  get maxFiles(): number {
    return this.props.maxFiles ?? 10;
  }

  value(): FileRef[] {
    return (this.formControl.value as FileRef[] | null) ?? [];
  }

  onPick(input: HTMLInputElement): void {
    this.add(Array.from(input.files ?? []));
    input.value = ''; // chọn lại đúng tệp đó vẫn phát sự kiện change
  }

  onDrag(e: DragEvent, over: boolean): void {
    if (this.readonly || this.formControl.disabled) return;
    e.preventDefault();
    this.over.set(over);
  }

  onDrop(e: DragEvent): void {
    if (this.readonly || this.formControl.disabled) return;
    e.preventDefault();
    this.over.set(false);
    this.add(Array.from(e.dataTransfer?.files ?? []));
  }

  remove(file: FileRef): void {
    this.setFiles(this.value().filter((f) => f.id !== file.id));
  }

  cancel(u: Upload): void {
    u.sub.unsubscribe();
    this.drop(u);
  }

  private add(files: File[]): void {
    const errors: string[] = [];
    let room = this.maxFiles - this.value().length - this.uploads().length;
    for (const file of files) {
      const problem = this.check(file);
      if (problem) errors.push(`${file.name}: ${problem}`);
      else if (room <= 0) errors.push(`${file.name}: vượt quá ${this.maxFiles} tệp`);
      else {
        room--;
        this.start(file);
      }
    }
    this.rejected.set(errors);
    this.formControl.markAsTouched();
  }

  private check(file: File): string | null {
    const maxMb = this.props.maxSizeMb ?? 10;
    if (file.size > maxMb * 1024 * 1024) return `dung lượng vượt quá ${maxMb} MB`;
    if (!matchesAccept(file, this.props.accept)) return 'định dạng không được phép';
    return null;
  }

  private start(file: File): void {
    if (!this.storage) {
      this.rejected.update((list) => [...list, 'Ứng dụng chưa cấu hình DF_FILE_STORAGE']);
      return;
    }
    const u: Upload = { key: ++this.seq, name: file.name, percent: 0, sub: Subscription.EMPTY };
    this.uploads.update((list) => [...list, u]);
    this.syncUploading();
    u.sub = this.storage.upload(file).subscribe({
      next: (ev) => {
        if (ev.type === 'progress') {
          this.uploads.update((list) =>
            list.map((x) => (x.key === u.key ? { ...x, percent: ev.percent } : x)),
          );
        } else {
          this.drop(u);
          this.setFiles([...this.value(), ev.file]);
        }
      },
      error: () => {
        this.drop(u);
        this.rejected.update((list) => [...list, `${file.name}: tải lên không thành công`]);
      },
    });
  }

  private drop(u: Upload): void {
    this.uploads.update((list) => list.filter((x) => x.key !== u.key));
    this.syncUploading();
  }

  private setFiles(files: FileRef[]): void {
    this.formControl.setValue(files);
    this.formControl.markAsDirty();
    this.emitChange();
  }

  /** Báo cho validator 'uploading' (xem FieldBuilder.files) số tệp đang tải. */
  private syncUploading(): void {
    this.props.uploading = this.uploads().length;
    this.formControl.updateValueAndValidity();
  }
}

/** Kiểm tra như thuộc tính accept của <input type=file>: '.pdf,image/*,application/zip'. */
function matchesAccept(file: File, accept: string | undefined): boolean {
  if (!accept) return true;
  const name = file.name.toLowerCase();
  return accept
    .split(',')
    .map((a) => a.trim().toLowerCase())
    .some((a) =>
      a.startsWith('.')
        ? name.endsWith(a)
        : a.endsWith('/*')
          ? file.type.startsWith(a.slice(0, -1))
          : file.type === a,
    );
}
