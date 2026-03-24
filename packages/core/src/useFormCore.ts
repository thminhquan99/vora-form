/**
 * @module useFormCore
 * @description
 * Form-level hook for developers who need direct access to the `FormStore`
 * methods — e.g., programmatically setting values, checking errors, or
 * triggering focus.
 *
 * This hook is consumed at the **form level** (by the developer in their
 * page component), not by individual field components. Fields use
 * `useVoraField` instead.
 *
 * ### Difference from `useVoraField`
 *
 * | Hook | Scope | Re-renders |
 * |---|---|---|
 * | `useFormCore` | Form-wide — access to all fields | Never (returns stable store methods) |
 * | `useVoraField` | Single field — subscribes to one path | Only when that field's value or error changes |
 *
 * @example
 * ```tsx
 * function MyPage() {
 *   const { setValue, getValue, focusField } = useFormCore();
 *
 *   const handlePopulate = () => {
 *     setValue('email', 'default@example.com');
 *     focusField('password');
 *   };
 *
 *   return (
 *     <VoraForm onSubmit={handleSubmit}>
 *       <button type="button" onClick={handlePopulate}>Populate</button>
 *       <VRText name="email" />
 *       <VRText name="password" />
 *     </VoraForm>
 *   );
 * }
 * ```
 */

import { useCallback } from 'react';

import { useFormContext } from './FormProvider';
import type { FormStore } from './utils/ref-store';

// ─── Return Type ──────────────────────────────────────────────────────────────

/**
 * The API surface returned by `useFormCore`.
 *
 * All methods are **stable references** (wrapped in `useCallback` bound to
 * the stable `FormStore`). They will never change between renders, so they
 * are safe to pass as props without causing child re-renders.
 */
export interface UseFormCoreReturn {
  /** Read a field's current domain value. */
  getValue: <T = unknown>(path: string) => T | undefined;

  /** Write a field's domain value (+ sync DOM for native inputs). */
  setValue: (path: string, value: unknown) => void;

  /** Read a field's current validation error. */
  getError: (path: string) => string | undefined;

  /** Set a validation error on a field. */
  setError: (path: string, message: string) => void;

  /** Clear a single field's validation error. */
  clearError: (path: string) => void;

  /** Clear ALL validation errors. */
  clearAllErrors: () => void;

  /** Get all current form values as a plain object. */
  getAllValues: () => Record<string, unknown>;

  /** Get all current validation errors as a plain object. */
  getAllErrors: () => Record<string, string>;

  /** Focus a specific field's DOM element. */
  focusField: (path: string) => boolean;

  /** Reset the entire form store (refs, values, errors, listeners). */
  reset: () => void;

  /** Whether the form currently has validation errors. */
  hasErrors: () => boolean;

  /**
   * Returns only the values that have changed from their initial state.
   * Useful for PATCH-style submissions where you only send modified fields.
   */
  getDirtyValues: () => Record<string, unknown>;

  /** Whether the form is currently submitting. */
  isSubmitting: boolean;

  /**
   * The raw store instance — escape hatch for advanced use cases.
   * Prefer the named methods above for type safety.
   */
  store: FormStore;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Form-level hook providing direct access to `FormStore` methods.
 *
 * **Must be called inside a `<VoraForm>` provider.**
 *
 * All returned functions are referentially stable — they never change
 * between renders, so they won't cause unnecessary re-renders when
 * passed as props.
 *
 * @returns A `UseFormCoreReturn` object with all store methods
 * @throws Error if used outside `<VoraForm>`
 */
export function useFormCore(): UseFormCoreReturn {
  const { store, isSubmitting } = useFormContext();

  // All callbacks bind to the stable store ref — they never change.
  const getValue = useCallback(
    <T = unknown>(path: string) => store.getValue<T>(path),
    [store]
  );

  const setValue = useCallback(
    (path: string, value: unknown) => store.setValue(path, value),
    [store]
  );

  const getError = useCallback(
    (path: string) => store.getError(path),
    [store]
  );

  const setError = useCallback(
    (path: string, message: string) => store.setError(path, message),
    [store]
  );

  const clearError = useCallback(
    (path: string) => store.clearError(path),
    [store]
  );

  const clearAllErrors = useCallback(
    () => store.clearAllErrors(),
    [store]
  );

  const getAllValues = useCallback(
    () => store.getAllValues(),
    [store]
  );

  const getAllErrors = useCallback(
    () => store.getAllErrors(),
    [store]
  );

  const focusField = useCallback(
    (path: string) => store.focusField(path),
    [store]
  );

  const reset = useCallback(
    () => store.reset(),
    [store]
  );

  const hasErrors = useCallback(
    () => store.hasErrors(),
    [store]
  );

  const getDirtyValues = useCallback(
    () => store.getDirtyValues(),
    [store]
  );

  return {
    getValue,
    setValue,
    getError,
    setError,
    clearError,
    clearAllErrors,
    getAllValues,
    getAllErrors,
    focusField,
    reset,
    hasErrors,
    getDirtyValues,
    isSubmitting,
    store,
  };
}
