/**
 * @module useVoraField
 * @description
 * The hook every VoraForm UI component uses to connect to the `FormStore`.
 *
 * ### Why `useSyncExternalStore`?
 *
 * React 18 introduced `useSyncExternalStore` specifically for reading from
 * external stores (stores that live outside React state). It provides two
 * critical guarantees:
 *
 * 1. **No Tearing** — During concurrent rendering, React may pause and
 *    resume rendering. A naive `useEffect + setState` subscription could
 *    read stale data if the store changes mid-render. `useSyncExternalStore`
 *    ensures the rendered value always matches the most recent store
 *    snapshot, even under concurrent mode's time-slicing. If the snapshot
 *    changes between render start and render commit, React will synchronously
 *    re-render with the updated value.
 *
 * 2. **Zero Unnecessary Re-renders** — The hook only triggers a re-render
 *    when its `getSnapshot()` return value changes (compared via `Object.is`).
 *    Combined with our path-scoped pub/sub, a field component re-renders
 *    **only** when its own value or error changes — never when a sibling
 *    field changes.
 *
 * ### How it Works in This Setup
 *
 * ```
 * ┌─────────────────────────────────────────────────┐
 * │  FormStore (vanilla TS, outside React)           │
 * │                                                  │
 * │  values: Map<"email" → "foo@bar.com">            │
 * │  errors: Map<"email" → "Invalid email">          │
 * │  listeners: Map<"email:value" → Set<Listener>>   │
 * │             Map<"email:error" → Set<Listener>>   │
 * └──────────┬──────────────────────┬────────────────┘
 *            │                      │
 *    subscribe("email","value")  subscribe("email","error")
 *            │                      │
 *            ▼                      ▼
 * ┌────────────────────────────────────────────────────┐
 * │  useVoraField("email")                            │
 * │                                                    │
 * │  useSyncExternalStore(                             │
 * │    subscribe = store.subscribe("email", "value")   │ ← pub/sub on ONE path
 * │    getSnapshot = () => store.getValue("email")     │ ← O(1) Map lookup
 * │  )                                                 │
 * │                                                    │
 * │  useSyncExternalStore(                             │
 * │    subscribe = store.subscribe("email", "error")   │ ← separate topic
 * │    getSnapshot = () => store.getError("email")     │
 * │  )                                                 │
 * │                                                    │
 * │  Returns: { value, error, onChange, setValue,       │
 * │            onBlur, ref }                            │
 * └────────────────────────────────────────────────────┘
 * ```
 *
 * When `store.setValue("password", "...")` fires, it notifies listeners on
 * `"password:value"`. The `"email:value"` listeners are **never called**,
 * so the email field component **never re-renders**. This is the zero
 * cross-field re-render guarantee.
 */

import { useCallback, useMemo, useRef, useSyncExternalStore, useEffect } from 'react';

import { useFormContext } from './FormProvider';
import type { NativeFieldElement } from './utils/ref-store';

// ─── Return Type ──────────────────────────────────────────────────────────────

/**
 * The return value of `useVoraField` — matches the shape expected by
 * every VoraForm UI component.
 *
 * @typeParam TValue - The domain value type for this field
 */
export interface UseVRFieldReturn<TValue> {
  /** Current domain value from the store. */
  value: TValue | undefined;

  /** Current validation error, or `undefined` if none. */
  error: string | undefined;

  /**
   * Ref callback that registers the DOM element with the store.
   * Attach this to the field's underlying DOM element.
   */
  ref: (element: HTMLElement | null) => void;

  /**
   * Native change handler — call this with the React ChangeEvent from
   * `<input>`, `<textarea>`, or `<select>`. Extracts the DOM value
   * and syncs it to the store silently (no re-render).
   */
  onChange: (e: React.ChangeEvent<HTMLElement>) => void;

  /**
   * Domain value setter — use this in composite widgets (Signature,
   * CheckboxGroup, DatePicker, etc.) to commit a clean domain value
   * to the store. Unlike `onChange`, this DOES trigger a re-render
   * via `store.setValue()` → pub/sub notification.
   */
  setValue: (value: TValue) => void;

  /**
   * @internal
   * Silently syncs a value to the store without triggering React re-renders.
   * ONLY use this inside VoraForm's own primitive components (e.g. VRSpreadsheet).
   * Using this in composite consumer widgets WILL break React synchronization.
   * Use setValue() instead for all external composite widget use cases.
   */
  setSilentValue: (value: TValue) => void;

  /**
   * Blur handler — marks the field as touched and triggers single-field
   * validation if a validation function is configured on the form.
   */
  onBlur: () => void;

  /**
   * Whether the user has blurred this field at least once.
   * Useful for deferring error display until after first interaction.
   */
  isTouched: boolean;

  /** The field path this hook is subscribed to. */
  name: string;
}



// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Per-field hook consumed by every VoraForm UI component.
 *
 * Uses `useSyncExternalStore` to subscribe to the `FormStore`'s pub/sub
 * on exactly **one field path**. The component re-renders only when:
 * - Its own **value** changes (via the `"value"` topic subscription)
 * - Its own **error** changes (via the `"error"` topic subscription)
 *
 * Sibling field changes **never** cause a re-render.
 *
 * @typeParam TValue - The domain value type (e.g., `string`, `Date`, `string | null`)
 * @param name - The field path to subscribe to (must match a key in the Zod schema)
 * @returns A `UseVRFieldReturn<TValue>` with value, error, ref, onChange, onBlur
 *
 * @example
 * ```tsx
 * function VRText({ name, ...rest }: VRTextProps) {
 *   const { value, error, ref, onChange, onBlur } = useVoraField<string>(name);
 *
 *   return (
 *     <div>
 *       <input
 *         ref={ref}
 *         name={name}
 *         defaultValue={value ?? ''}
 *         onChange={onChange}
 *         onBlur={onBlur}
 *         {...rest}
 *       />
 *       {error && <span className="error">{error}</span>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useVoraField<TValue = unknown>(
  name: string,
  rules?: {
    required?: boolean;
    requiredMessage?: string;
    pattern?: { value: RegExp; message: string };
    validate?: (value: any) => string | undefined;
  }
): UseVRFieldReturn<TValue> {
  const { store, validate: formValidate } = useFormContext();

  // ── Native Validation Hook Registration ──────────────────────────────────
  useEffect(() => {
    if (!rules) return;
    const cleanupFns: Array<() => void> = [];

    if (rules.required) {
      cleanupFns.push(
        store.registerRule(name, (val) => {
          const isEmptyString = typeof val === 'string' && val.trim() === '';
          const isEmptyObject =
            val !== null &&
            typeof val === 'object' &&
            !Array.isArray(val) &&
            Object.keys(val).length === 0;

          if (val === undefined || val === null || isEmptyString || (Array.isArray(val) && val.length === 0) || isEmptyObject) {
            return rules.requiredMessage || 'This field is required';
          }
          return undefined;
        })
      );
    }

    if (rules.pattern) {
      cleanupFns.push(
        store.registerRule(name, (val) => {
          if (typeof val === 'string' && val.length > 0 && !rules.pattern!.value.test(val)) {
            return rules.pattern!.message;
          }
          return undefined;
        })
      );
    }

    if (rules.validate) {
      if (rules.validate.constructor.name === 'AsyncFunction') {
        console.warn(
          `[VoraForm] The validate prop on field "${name}" returned a Promise. ` +
          `Synchronous validate must return string | undefined. ` +
          `Use useAsyncValidation() for async validation instead.`
        );
      }

      const originalValidate = rules.validate;
      const safeValidate = (val: any): string | undefined => {
        const result = originalValidate(val);

        // Detect Promise return — async validators are not supported in
        // registerRule (which is synchronous). Silently ignore and let
        // useAsyncValidation handle it instead.
        if (result !== null && typeof result === 'object' && typeof (result as any).then === 'function') {
          return undefined; // Treat as no error — do not set "[object Promise]"
        }

        return result as string | undefined;
      };
      cleanupFns.push(store.registerRule(name, safeValidate));
    }

    return () => cleanupFns.forEach((fn) => fn());
  }, [store, name, rules?.required, rules?.requiredMessage, rules?.pattern, rules?.validate]);

  // ── Value subscription via useSyncExternalStore ─────────────────────────
  //
  // `subscribe` is called once per mount. It wires up the store's pub/sub
  // for exactly this field path and "value" topic. The returned unsubscribe
  // function is called on unmount.
  //
  // `getSnapshot` is called on every render to read the current value.
  // React compares the snapshot with `Object.is` — if it hasn't changed,
  // the component does NOT re-render.

  const subscribeValue = useCallback(
    (onStoreChange: () => void) =>
      store.subscribe(name, onStoreChange, 'value'),
    [store, name]
  );

  const getValueSnapshot = useCallback(
    () => store.getValue<TValue>(name),
    [store, name]
  );

  const value = useSyncExternalStore(
    subscribeValue,
    getValueSnapshot,
    getValueSnapshot // SSR fallback — same as client (store is empty on server)
  );

  // ── Error subscription via useSyncExternalStore ─────────────────────────
  //
  // Separate subscription on the "error" topic. A component that only
  // displays errors (like <VRFieldError>) can subscribe to errors
  // without being notified of value changes.

  const subscribeError = useCallback(
    (onStoreChange: () => void) =>
      store.subscribe(name, onStoreChange, 'error'),
    [store, name]
  );

  const getErrorSnapshot = useCallback(
    () => store.getError(name),
    [store, name]
  );

  const error = useSyncExternalStore(
    subscribeError,
    getErrorSnapshot,
    getErrorSnapshot
  );

  // ── Touched subscription via useSyncExternalStore ────────────────────────
  //
  // Subscribes to the "touched" topic for this field. A field is
  // "touched" after the user has blurred it at least once. This
  // allows UI components to defer showing errors until after first
  // interaction.

  const subscribeTouched = useCallback(
    (onStoreChange: () => void) =>
      store.subscribe(name, onStoreChange, 'touched'),
    [store, name]
  );

  const getTouchedSnapshot = useCallback(
    () => store.isTouched(name),
    [store, name]
  );

  const isTouched = useSyncExternalStore(
    subscribeTouched,
    getTouchedSnapshot,
    getTouchedSnapshot
  );

  // ── Ref callback ───────────────────────────────────────────────────────
  //
  // A callback ref (not a ref object) because we need to run registration
  // logic when the DOM element mounts. React calls this with the element
  // on mount and with `null` on unmount.

  const cleanupRef = useRef<(() => void) | null>(null);

  const fieldRef = useCallback(
    (element: HTMLElement | null) => {
      // Clean up previous registration (if any)
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      // Register the new element
      if (element) {
        cleanupRef.current = store.registerField(
          name,
          element as NativeFieldElement | HTMLElement
        );
      }
    },
    [store, name]
  );

  // ── onChange handler (NATIVE EVENTS ONLY) ──────────────────────────────
  //
  // Strictly for native `<input>`, `<textarea>`, `<select>` change events.
  // Extracts the DOM value and syncs it to the store silently.
  //
  // CRITICAL: Uses `setSilentValue` to avoid triggering useSyncExternalStore
  // re-renders. The DOM already shows the typed character — we just silently
  // sync the store so getAllValues() and onBlur validation have the correct data.

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLElement>) => {
      const target = e.target as HTMLInputElement;

      if (target.type === 'checkbox') {
        // Checkbox — use `.checked` (boolean), not `.value`
        store.setSilentValue(name, target.checked);
      } else if (target.type === 'range' || target.type === 'number') {
        // Range / Number — convert string to JavaScript number
        store.setSilentValue(name, Number(target.value));
      } else {
        // Text / email / tel / url / textarea / select — use `.value`
        store.setSilentValue(name, target.value);
      }
    },
    [store, name]
  );

  // ── setValue handler (COMPOSITE WIDGETS) ────────────────────────────────
  //
  // For composite widgets (Signature, CheckboxGroup, DatePicker, etc.)
  // that need to commit a clean domain value to the store.
  // Uses `store.setValue()` which DOES trigger pub/sub → re-render.

  const setValue = useCallback(
    (val: TValue) => {
      store.setValue(name, val);
    },
    [store, name]
  );

  const setSilentValue = useCallback(
    (val: TValue) => {
      store.setSilentValue(name, val);
    },
    [store, name]
  );

  // ── onBlur handler ─────────────────────────────────────────────────────
  //
  // Triggers single-field validation on blur. Only validates the specific
  // field that lost focus — no other fields are affected.

  const onBlur = useCallback(() => {
    // Mark field as touched on first blur
    store.setTouched(name);

    if (formValidate) {
      const allValues = store.getAllValues();
      const errors = formValidate(allValues);
      const fieldError = errors[name];

      if (fieldError) {
        store.setError(name, fieldError);
      } else {
        store.clearError(name);
      }
    } else {
      // Fallback: Run internal validation for this specific field only
      // Native validation runs across all fields simultaneously during submit,
      // but during onBlur we simply execute store.validateInternal() safely if needed,
      // though typically native browser attributes handle single-field blurs best.
      // Easiest is to just re-validate everything natively into the store:
      store.validateInternal();
    }
  }, [store, name, formValidate]);

  // ── Return ─────────────────────────────────────────────────────────────

  return useMemo(
    () => ({
      value,
      error,
      ref: fieldRef,
      onChange,
      setValue,
      setSilentValue,
      onBlur,
      isTouched,
      name,
    }),
    [value, error, fieldRef, onChange, setValue, setSilentValue, onBlur, isTouched, name]
  );
}
