import { Pipe, PipeTransform } from '@angular/core';
import { isObservable, Observable, of } from 'rxjs';
import { OptionsSource, SelectOption } from './props';

/** Chuẩn hoá options (mảng hoặc Observable) thành Observable để dùng với async pipe. */
@Pipe({ name: 'dfOptions' })
export class OptionsPipe implements PipeTransform {
  transform(source: OptionsSource | undefined | null): Observable<SelectOption[]> {
    return isObservable(source) ? source : of(source ?? []);
  }
}

export function labelOf(options: SelectOption[] | null | undefined, value: unknown): string {
  return options?.find((o) => o.value === value)?.label ?? '';
}
