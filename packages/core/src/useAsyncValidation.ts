/**
 * @module useAsyncValidation
 * @description
 * Debounced async field validation hook for VoraForm.
 *
 * ### Why Not `useSyncExternalStore`?
 *
 * This hook subscribes to the store's `"value"` topic for a specific
 * field, but it does **not** use `useSyncExternalStore`. That hook
 * would force a React re-render every time the value changes — which
 * is exactly what we want to avoid during typing.
 *
 * Instead, we manually subscribe via `store.subscribe(name, callback, 'value')`.
 * The callback runs **outside React's rendering cycle** — it reads
 * the latest value, debounces, and then calls `store.setError()` or
 * `store.clearError()` to push validation results. Only the error
 * change triggers a re-render (via `<VRFieldError>`'s own
 * `useSyncExternalStore` subscription on the `"error"` topic).
 *
 * ### Re-render Contract
 *
 * | Event                    | Component re-renders? |
 * |--------------------------|----------------------|
 * | User types (value change)| ✘ (no re-render)     |
 * | Debounce fires validation| ✘ (runs outside React)|
 * | Validation sets error    | ✔ (error topic only) |
 * | Validation clears error  | ✔ (error topic only) |
 *
 * ### Usage
 *
 * ```tsx
 * function UsernameField() {
 *   useAsyncValidation<string>('username', async (val) => {
 *     if (!val || val.length < 3) return undefined;
 *     const res = await fetch(`/api/check-username?u=${val}`);
 *     const { taken } = await res.json();
 *     return taken ? 'Username is already taken.' : undefined;
 *   }, 600);
 *
 *   return <VRText name="username" label="Username" />;
 * }
 * ```
 */

import { useEffect, useRef } from 'react';
import { useFormContext } from './FormProvider';

/**
 * Runs a debounced async validation function whenever a field's value
 * changes, without causing React re-renders during typing.
 *
 * @typeParam TValue - The field's domain value type
 * @param name        - Field path to subscribe to
 * @param validateFn  - Async function returning an error string or `undefined`
 * @param debounceMs  - Debounce delay in milliseconds (default: 500)
 */
export function useAsyncValidation<TValue = unknown>(
  name: string,
  validateFn: (value: TValue) => Promise<string | undefined>,
  debounceMs: number = 500
): void {
  const { store } = useFormContext();

  // Refs to keep the latest values without re-renders
  const validateFnRef = useRef(validateFn);
  const debounceMsRef = useRef(debounceMs);
  validateFnRef.current = validateFn;
  debounceMsRef.current = debounceMs;

  const isFirstMount = useRef(true);

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let aborted = false;

    // Subscribe to BOTH topics:
    // - 'input': fires when native inputs call setSilentValue (typing)
    // - 'value': fires when composite widgets call setValue (toggle, etc.)
    // Neither of these subscriptions trigger useSyncExternalStore re-renders.
    const handler = () => {
      if (isFirstMount.current) {
        isFirstMount.current = false;
        return;
      }

      // Clear any pending debounce timer
      if (timerId !== null) {
        clearTimeout(timerId);
      }

      timerId = setTimeout(async () => {
        if (aborted) return;

        const value = store.getValue<TValue>(name);

        try {
          const error = await validateFnRef.current(value as TValue);
          if (aborted) return;

          if (error) {
            store.setError(name, error);
          } else {
            store.clearError(name);
          }
        } catch {
          // Swallow validation errors — the field stays in its current
          // error state. In production, you'd likely want to log this.
          if (!aborted) {
            store.clearError(name);
          }
        }
      }, debounceMsRef.current);
    };

    const unsubInput = store.subscribe(name, handler, 'input');
    const unsubValue = store.subscribe(name, handler, 'value');

    // Cleanup: unsubscribe, cancel pending timers, abort in-flight validation
    return () => {
      aborted = true;
      if (timerId !== null) {
        clearTimeout(timerId);
      }
      unsubInput();
      unsubValue();
    };
  }, [store, name]);
}
