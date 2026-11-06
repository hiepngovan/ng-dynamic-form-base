// Public API của dynamic-form. Feature chỉ import từ file này.
export { DYNAMIC_FORM_CONFIG } from './dynamic-form.config';
export { fieldsFor, FieldBuilder } from './builder/field-builder';
export type { ChangeContext, ColSpan, FieldOptions, Key } from './builder/field-builder';
export { AppFormComponent } from './form/app-form.component';
export { unsavedChangesGuard } from './guards/unsaved-changes.guard';
export type { HasUnsavedChanges } from './guards/unsaved-changes.guard';
export type { SelectOption } from './core/props';
