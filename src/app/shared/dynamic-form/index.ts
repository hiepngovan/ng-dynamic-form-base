// Public API của dynamic-form. Feature chỉ import từ file này.
export { DYNAMIC_FORM_CONFIG } from './dynamic-form.config';
export { fieldsFor, FieldBuilder } from './builder/field-builder';
export type {
  CalcFormat,
  ChangeContext,
  CheckRule,
  ColSpan,
  FieldOptions,
  FileOptions,
  Key,
  LookupOptions,
} from './builder/field-builder';
export { AppFormComponent } from './form/app-form.component';
export { unsavedChangesGuard } from './guards/unsaved-changes.guard';
export type { HasUnsavedChanges } from './guards/unsaved-changes.guard';
export type { FileRef, SelectOption } from './core/props';
export { DF_FILE_STORAGE } from './core/file-storage';
export type { FileStorage, UploadEvent } from './core/file-storage';
export type { StepMode } from './core/form-events';
export { clearAllDrafts } from './form/form-draft';
