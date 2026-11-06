import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { Tag } from 'primeng/tag';
import { Workflow, WorkflowEvent } from '../workflow';

/** Lịch sử xử lý (mới nhất trên cùng) — component TRÌNH BÀY. */
@Component({
  selector: 'app-workflow-history',
  imports: [DatePipe, Tag],
  template: `
    <ol class="wf-history">
      @for (e of events(); track $index) {
        <li class="wf-history__item">
          <div class="wf-history__head">
            <strong>{{ actionLabel(e.action) }}</strong>
            <p-tag
              [value]="workflow().states[e.to]?.label ?? e.to"
              [severity]="workflow().states[e.to]?.severity"
            />
          </div>
          <div class="muted">{{ e.by }} · {{ e.at | date: 'HH:mm dd/MM/yyyy' }}</div>
          @if (e.comment) {
            <blockquote class="wf-history__comment">{{ e.comment }}</blockquote>
          }
        </li>
      } @empty {
        <li class="muted">Chưa có lịch sử</li>
      }
    </ol>
  `,
})
export class WorkflowHistoryComponent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- hiển thị được mọi quy trình
  readonly workflow = input.required<Workflow<any, any, any>>();
  readonly events = input<WorkflowEvent[]>([]);
  /** Nhãn của thao tác không nằm trong quy trình (vd 'create'). */
  readonly extraLabels = input<Record<string, string>>({ create: 'Tạo hồ sơ' });

  actionLabel(action: string): string {
    return this.workflow().actions[action]?.label ?? this.extraLabels()[action] ?? action;
  }
}
