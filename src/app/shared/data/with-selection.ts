import { computed } from '@angular/core';
import { updateState } from '@angular-architects/ngrx-toolkit';
import { signalStoreFeature, withComputed, withMethods, withState } from '@ngrx/signals';

/** Chọn nhiều dòng (giữ lựa chọn khi chuyển trang). Dùng kèm withPagedList. */
export function withSelection<ID extends string | number = string>() {
  return signalStoreFeature(
    withState<{ selectedIds: ID[] }>({ selectedIds: [] }),
    withComputed(({ selectedIds }) => ({
      selectedCount: computed(() => selectedIds().length),
    })),
    withMethods((store) => ({
      setSelected(ids: ID[]) {
        updateState(store, 'selection: set', { selectedIds: ids });
      },
      toggle(id: ID) {
        const ids = store.selectedIds();
        updateState(store, 'selection: toggle', {
          selectedIds: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
        });
      },
      clearSelection() {
        updateState(store, 'selection: clear', { selectedIds: [] });
      },
    })),
  );
}
