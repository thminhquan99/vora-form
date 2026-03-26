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
 * @param config      - Configuration options (debounce, error messages)
 */
export function useAsyncValidation<TValue = unknown>(
  name: string,
  validateFn: (value: TValue, signal: AbortSignal) => Promise<string | undefined>,
  config: { debounceMs?: number; errorMessage?: string } = {}
): void {
  const { store } = useFormContext();
  const { debounceMs = 500, errorMessage = 'Validation service unavailable' } = config;

  // Refs to keep the latest values without re-renders
  const validateFnRef = useRef(validateFn);
  const debounceMsRef = useRef(debounceMs);
  const errorMessageRef = useRef(errorMessage);
  validateFnRef.current = validateFn;
  debounceMsRef.current = debounceMs;
  errorMessageRef.current = errorMessage;

  const isFirstMount = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const latestRequestId = useRef(0);
  const isIncremented = useRef(false);

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

      // ── FIX: Abort Previous In-flight Request ───────────────────────────
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // ── FIX: Balancing Pending Validations ──────────────────────────────
      // If a timer is already active, we just clear it (the increment is already recorded).
      // If no timer is active AND we haven't already incremented for an in-flight 
      // request, we increment now to show the "validating" state IMMEDIATELY.
      if (timerId !== null) {
        clearTimeout(timerId);
      } else if (!isIncremented.current) {
        store.incrementPendingValidations();
        isIncremented.current = true;
      }

      timerId = setTimeout(async () => {
        if (aborted) return;

        // Signifies debounce phase ended; we are now in the async execution phase.
        // We do NOT set timerId to null yet, as we want to reuse the 'increment'
        // if user types while we are awaiting the promise.
        
        const currentRequestId = ++latestRequestId.current;
        const currentAbortController = abortControllerRef.current;
        if (!currentAbortController) {
          if (isIncremented.current) {
            store.decrementPendingValidations();
            isIncremented.current = false;
          }
          timerId = null;
          return;
        }

        const value = store.getValue<TValue>(name);

        try {
          const error = await validateFnRef.current(
            value as TValue,
            currentAbortController.signal
          );

          // If a new request has started since this one, or the component unmounted,
          // discard this result. The finally block will handle count if it's the latest.
          if (aborted || currentRequestId !== latestRequestId.current) return;

          // Discard the result if the form is currently submitting
          if (store.getIsSubmitting()) return;

          if (error) {
            store.setError(name, error, 'async');
          } else {
            store.clearError(name, 'async');
          }
        } catch (err: unknown) {
          if (err instanceof Error && err.name === 'AbortError') return;

          // SPECIAL AUDIT FIX: If a non-abort error occurs (e.g. network failure), 
          // we use the configurable error message or a generic one.
          if (!aborted && currentRequestId === latestRequestId.current && !store.getIsSubmitting()) {
            store.setError(name, errorMessageRef.current, 'async');
          }
        } finally {
          // Only decrement if this is the LATEST request in the chain.
          // If a new request started while we were awaiting, it will have
          // reused our increment and will handle its own decrement eventually.
          if (!aborted && currentRequestId === latestRequestId.current) {
            store.decrementPendingValidations();
            isIncremented.current = false;
            timerId = null;
          }
        }
      }, debounceMsRef.current);
    };

    const unsubInput = store.subscribe(name, handler, 'input');
    const unsubValue = store.subscribe(name, handler, 'value');

    // Cleanup: unsubscribe, cancel pending timers, abort in-flight validation
    return () => {
      aborted = true;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timerId !== null) {
        clearTimeout(timerId);
      }
      // CRITICAL FIX: If we unmount while any validation state is pending, 
      // reconcile the store count exactly once.
      if (isIncremented.current) {
        store.decrementPendingValidations();
        isIncremented.current = false;
      }
      unsubInput();
      unsubValue();
    };
  }, [store, name]);
}
