// Public API của quy trình xử lý (trạng thái + duyệt). Feature chỉ import từ file này.
export { availableActions, defineWorkflow, isEditable } from './workflow';
export type {
  AvailableAction,
  Workflow,
  WorkflowAction,
  WorkflowEvent,
  WorkflowState,
} from './workflow';
export { withWorkflow } from './with-workflow';
export type { WorkflowConfig } from './with-workflow';
export { WorkflowActionsComponent } from './ui/workflow-actions.component';
export type { WorkflowActEvent } from './ui/workflow-actions.component';
export { WorkflowHistoryComponent } from './ui/workflow-history.component';
