import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, input, model, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Sort } from '../models';

type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

/** Khai báo một cột. Dev chỉ viết mảng cấu hình này, không viết template bảng. */
export interface ColumnDef<T> {
  key: Extract<keyof T, string>;
  header: string;
  /** text (mặc định) | money | date | tag (giá trị → nhãn + màu) */
  format?: 'text' | 'money' | 'date' | 'tag';
  /** format 'tag' (hoặc 'text' cần đổi mã → nhãn): bảng giá trị → nhãn, màu. */
  labels?: Record<string, { label: string; severity?: Severity }>;
  sortable?: boolean;
  width?: string;
  /** Biến ô thành link (route commands), vd (r) => ['/customers', r.id]. */
  link?: (row: T) => unknown[];
}

export interface PageChange {
  page: number;
  size: number;
  sort: Sort | null;
}

/**
 * Bảng danh sách dùng chung — component TRÌNH BÀY: chỉ input / output, không inject store.
 * Phân trang, sắp xếp phía server (lazy); chọn nhiều dòng giữ được qua các trang.
 *
 * @example
 * <app-data-table [columns]="columns" [rows]="store.items()" [total]="store.total()"
 *   [page]="store.page()" [size]="store.size()" [sort]="store.sort()" [loading]="store.loading()"
 *   (pageChange)="store.changePage($event)"
 *   [selectable]="true" [selectedIds]="store.selectedIds()" (selectedIdsChange)="store.setSelected($event)" />
 */
@Component({
  selector: 'app-data-table',
  imports: [TableModule, Tag, RouterLink, DecimalPipe, DatePipe],
  template: `
    <p-table
      [value]="rows()"
      [dataKey]="idKey()"
      [lazy]="true"
      [lazyLoadOnInit]="false"
      [loading]="loading()"
      [paginator]="true"
      [rows]="size()"
      [first]="page() * size()"
      [totalRecords]="total()"
      [rowsPerPageOptions]="[10, 20, 50]"
      [showCurrentPageReport]="true"
      currentPageReportTemplate="{first}–{last} / {totalRecords}"
      [sortField]="sort()?.field"
      [sortOrder]="sort()?.order === 'desc' ? -1 : 1"
      [selection]="selectedRows()"
      (selectionChange)="onSelection($event)"
      (onLazyLoad)="onLazyLoad($event)"
      [tableStyle]="{ 'min-width': '720px' }"
      size="small"
      stripedRows
    >
      <ng-template #header>
        <tr>
          @if (selectable()) {
            <th style="width: 3rem"><p-tableHeaderCheckbox /></th>
          }
          @for (c of columns(); track c.key) {
            @if (c.sortable) {
              <th [pSortableColumn]="c.key" [style.width]="c.width">
                {{ c.header }} <p-sortIcon [field]="c.key" />
              </th>
            } @else {
              <th [style.width]="c.width">{{ c.header }}</th>
            }
          }
        </tr>
      </ng-template>
      <ng-template #body let-row>
        <tr>
          @if (selectable()) {
            <td><p-tableCheckbox [value]="row" /></td>
          }
          @for (c of columns(); track c.key) {
            @let v = row[c.key];
            <td>
              @switch (c.format) {
                @case ('money') {
                  {{ v === null || v === undefined ? '—' : (v | number: '1.0-0') + ' ₫' }}
                }
                @case ('date') {
                  {{ (v | date: 'dd/MM/yyyy') ?? '—' }}
                }
                @case ('tag') {
                  @if (v !== null && v !== undefined) {
                    <p-tag
                      [value]="c.labels?.[v]?.label ?? v"
                      [severity]="c.labels?.[v]?.severity"
                    />
                  }
                }
                @default {
                  @if (c.link) {
                    <a [routerLink]="c.link(row)">{{ v }}</a>
                  } @else {
                    {{ c.labels?.[v]?.label ?? v ?? '—' }}
                  }
                }
              }
            </td>
          }
        </tr>
      </ng-template>
      <ng-template #emptymessage>
        <tr>
          <td [attr.colspan]="columns().length + (selectable() ? 1 : 0)" class="df-table__empty">
            {{ loading() ? 'Đang tải…' : 'Không có dữ liệu' }}
          </td>
        </tr>
      </ng-template>
    </p-table>
  `,
})
export class DataTableComponent<T extends object, ID extends string | number = string> {
  readonly columns = input.required<ColumnDef<T>[]>();
  readonly rows = input.required<T[]>();
  readonly total = input(0);
  readonly page = input(0);
  readonly size = input(20);
  readonly sort = input<Sort | null>(null);
  readonly loading = input(false);
  readonly selectable = input(false);
  readonly idKey = input<Extract<keyof T, string>>('id' as Extract<keyof T, string>);
  /** Hai chiều: [(selectedIds)] hoặc [selectedIds] + (selectedIdsChange). */
  readonly selectedIds = model<ID[]>([]);

  readonly pageChange = output<PageChange>();

  /** p-table chỉ biết dòng của trang hiện tại → map id ↔ dòng. */
  readonly selectedRows = computed(() => {
    const ids = new Set<unknown>(this.selectedIds());
    return this.rows().filter((r) => ids.has(this.idOf(r)));
  });

  onSelection(rows: T[]): void {
    // Giữ lựa chọn ở các trang khác, thay phần thuộc trang hiện tại bằng lựa chọn mới.
    const onPage = new Set(this.rows().map((r) => this.idOf(r)));
    const others = this.selectedIds().filter((id) => !onPage.has(id));
    this.selectedIds.set([...others, ...rows.map((r) => this.idOf(r))]);
  }

  onLazyLoad(e: TableLazyLoadEvent): void {
    const size = e.rows ?? this.size();
    const field = typeof e.sortField === 'string' ? e.sortField : null;
    this.pageChange.emit({
      page: Math.floor((e.first ?? 0) / size),
      size,
      sort: field ? { field, order: e.sortOrder === -1 ? 'desc' : 'asc' } : null,
    });
  }

  private idOf(row: T): ID {
    return row[this.idKey()] as ID;
  }
}
