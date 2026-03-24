'use client';

import { useCallback } from 'react';
import { useFormContext, useVoraField } from '@vora/core';
import type { UseVRTableReturn } from './types';

/**
 * Hook for array operations on a `<VRTable>` field.
 *
 * ### How It Works
 *
 * The array "shape" is stored at the flat key `name` (e.g., "items").
 * Individual cell values are stored at `items.0.company`, `items.1.role`, etc.
 *
 * **`append(item)`**:
 * 1. Reads the current array from `store.getValue(name)`.
 * 2. Pushes the new item, calls `store.setValue(name, newArray)`.
 * 3. This triggers `useSyncExternalStore` in `<VRTable>` → re-render
 *    to add the new DOM row.
 * 4. Sets each key of the new item as a flat cell value
 *    (e.g., `store.setSilentValue('items.2.company', '')`).
 *
 * **`remove(index)`**:
 * 1. Reads the current array, splices the index.
 * 2. Re-indexes all cell values for rows after the removed index.
 * 3. Calls `store.setValue(name, newArray)` → triggers table re-render.
 *
 * ### Re-render Contract
 *
 * | Action       | VRTable re-renders? | Existing cells re-render? |
 * |-------------|------------------------|--------------------------|
 * | append()    | ✅ Yes (row added)      | ❌ No                     |
 * | remove()    | ✅ Yes (row removed)    | ❌ No (re-indexed silently)|
 * | Cell typing | ❌ No                   | ❌ No (setSilentValue)    |
 *
 * @param name - The array field path (must match `<VRTable name>`)
 */
export function useVoraTable(name: string): UseVRTableReturn {
  const { store } = useFormContext();

  // Subscribe to the array value to get current row count
  const field = useVoraField<Record<string, unknown>[]>(name);
  const items = field.value ?? [];
  const rowCount = items.length;

  const append = useCallback(
    (item: Record<string, unknown>) => {
      const current = store.getValue<Record<string, unknown>[]>(name) ?? [];
      const newIndex = current.length;
      const newArray = [...current, item];

      // Set each cell value for the new row silently (the cell inputs
      // will pick up their defaultValue on mount)
      for (const [key, val] of Object.entries(item)) {
        store.setSilentValue(`${name}.${newIndex}.${key}`, val);
      }

      // Update the array shape — this triggers VRTable re-render
      store.setValue(name, newArray);
    },
    [store, name]
  );

  const remove = useCallback(
    (index: number) => {
      const current = store.getValue<Record<string, unknown>[]>(name) ?? [];
      if (index < 0 || index >= current.length) return;

      // Shift cell values for rows after the removed index.
      // Each row may have different keys (heterogeneous), so we
      // read Object.keys per row rather than assuming uniform shape.
      for (let i = index; i < current.length - 1; i++) {
        const currentRowKeys = Object.keys(current[i]);
        const nextRowKeys = Object.keys(current[i + 1]);

        // 1. Clear all flat keys of row i (covers keys that may not
        //    exist in row i+1, preventing stale data).
        for (const key of currentRowKeys) {
          store.setSilentValue(`${name}.${i}.${key}`, undefined);
        }

        // 2. Copy all flat keys from row i+1 → row i.
        for (const key of nextRowKeys) {
          const nextVal = store.getValue(`${name}.${i + 1}.${key}`);
          store.setSilentValue(`${name}.${i}.${key}`, nextVal);
        }
      }

      // 3. Clear all flat keys of the last row (now orphaned).
      const lastIdx = current.length - 1;
      const lastRowKeys = Object.keys(current[lastIdx]);
      for (const key of lastRowKeys) {
        store.setSilentValue(`${name}.${lastIdx}.${key}`, undefined);
      }

      // Update array shape — triggers VRTable re-render
      const newArray = current.filter((_, i) => i !== index);
      store.setValue(name, newArray);
    },
    [store, name]
  );

  return { append, remove, rowCount };
}
