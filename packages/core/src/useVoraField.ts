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
    validate?: (value: TValue) => string | undefined;
  }
): UseVRFieldReturn<TValue> {
  const { store, getValidate } = useFormContext();

  // ── FIX C4: Stabilize rules via useRef ──────────────────────────────────
  //
  // Object references in `rules` (pattern, validate) change on every parent
  // render if not memoized. Storing them in a ref breaks the dependency cycle
  // so the useEffect only re-runs when `store` or `name` changes.
  const rulesRef = useRef(rules);
  useEffect(() => { rulesRef.current = rules; }, [rules]);

  useEffect(() => {
    const currentRules = rulesRef.current;
    if (!currentRules) return;
    const cleanupFns: Array<() => void> = [];

    if (currentRules.required) {
      cleanupFns.push(
        store.registerRule(name, (val) => {
          const isEmptyString = typeof val === 'string' && val.trim() === '';
          const isEmptyObject =
            val !== null &&
            typeof val === 'object' &&
            !Array.isArray(val) &&
            Object.keys(val).length === 0;

          if (val === undefined || val === null || isEmptyString || (Array.isArray(val) && val.length === 0) || isEmptyObject) {
            return currentRules.requiredMessage || 'This field is required';
          }
          return undefined;
        })
      );
    }

    if (currentRules.pattern) {
      const pattern = currentRules.pattern;
      cleanupFns.push(
        store.registerRule(name, (val) => {
          if (typeof val === 'string' && val.length > 0 && !pattern.value.test(val)) {
            return pattern.message;
          }
          return undefined;
        })
      );
    }

    if (currentRules.validate) {
      if (currentRules.validate.constructor.name === 'AsyncFunction') {
        console.warn(
          `[VoraForm] The validate prop on field "${name}" returned a Promise. ` +
          `Synchronous validate must return string | undefined. ` +
          `Use useAsyncValidation() for async validation instead.`
        );
      }

      const originalValidate = currentRules.validate;
      const safeValidate = (val: TValue): string | undefined => {
        const result = originalValidate(val);

        // Detect Promise return — async validators are not supported in
        // registerRule (which is synchronous). Silently ignore.
        if (result !== null && typeof result === 'object' && typeof (result as any).then === 'function') {
          return undefined;
        }

        return result as string | undefined;
      };
      cleanupFns.push(store.registerRule(name, safeValidate as (val: unknown) => string | undefined));
    }

    return () => cleanupFns.forEach((fn) => fn());
  }, [store, name]); // FIX C4: REMOVED object dependencies — read from ref

  // ── Consolidated field subscription via useSyncExternalStore ───────────
  const lastSnapshot = useRef<{
    value: TValue | undefined;
    error: string | undefined;
    isTouched: boolean;
  } | null>(null);

  const subscribeField = useCallback(
    (onStoreChange: () => void) => store.subscribe(name, onStoreChange, 'field'),
    [store, name]
  );

  const getFieldSnapshot = useCallback(() => {
    const next = store.getFieldState<TValue>(name);
    const prev = lastSnapshot.current;

    if (
      prev &&
      prev.value === next.value &&
      prev.error === next.error &&
      prev.isTouched === next.isTouched
    ) {
      return prev;
    }

    lastSnapshot.current = next;
    return next;
  }, [store, name]);

  const { value, error, isTouched } = useSyncExternalStore(
    subscribeField,
    getFieldSnapshot,
    getFieldSnapshot
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

  // ── FIX C3: onBlur validates THIS field only ─────────────────────────────
  //
  // Previously called `store.validateInternal()` which clears ALL errors
  // and re-validates every field. Now only validates the blurred field.

  const onBlur = useCallback(() => {
    // Mark field as touched on first blur
    store.setTouched(name);

    const formValidate = getValidate();
    if (formValidate) {
      // External schema validation (Zod) — run full schema but only
      // apply the error for THIS field
      const allValues = store.getAllValues();
      const errors = formValidate(allValues);
      const fieldError = errors[name];

      if (fieldError) {
        store.setError(name, fieldError, 'sync');
      } else {
        store.clearError(name, 'sync');
      }
    } else {
      // Internal native validation for THIS FIELD ONLY
      store.validateField(name);
    }
  }, [store, name, getValidate]);

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
