/**
 * @module FormProvider
 * @description
 * React Context provider that holds a **single, referentially stable**
 * instance of `FormStore`.
 *
 * ### Why Referential Stability Matters
 *
 * If the context value changed on every render, every `useContext(FormCtx)`
 * consumer would re-render — defeating the entire zero-re-render architecture.
 *
 * By creating the `FormStore` in a `useRef` (not `useState`) and passing it
 * as the context value, the reference **never changes** after mount. React's
 * context propagation only triggers when `value` changes by reference
 * (`Object.is`), so consumers are never re-rendered by the provider.
 *
 * Field components subscribe to the store's pub/sub system instead,
 * and only re-render when their specific path changes — via
 * `useSyncExternalStore` in the `useVoraField` hook.
 */

import React, { createContext, useContext, useRef, useEffect } from 'react';

import { FormStore } from './utils/ref-store';
import type { ValidateFunction } from './types';

// ─── Context ──────────────────────────────────────────────────────────────────

/**
 * The shape of the form context consumed by all field components and hooks.
 *
 * Contains the raw `FormStore` instance plus form-level configuration
 * (validation function, submit handler).
 */
export interface FormContextValue {
  /** The vanilla TypeScript store — source of truth for all field state. */
  store: FormStore;

  /**
   * Getter for the current validation function. Returns the latest
   * `validate` prop without breaking context referential stability.
   *
   * Stored in a `useRef` internally — the context value never changes
   * when the parent provides a new `validate` reference.
   */
  getValidate: () => ValidateFunction | undefined;
}

/**
 * React Context for the form store.
 *
 * Initialised to `null` so that field components can detect when they
 * are rendered outside a `<VoraForm>` ancestor and throw a clear error.
 */
const FormContext = createContext<FormContextValue | null>(null);
FormContext.displayName = 'VoraFormContext';

// ─── useFormContext Hook ──────────────────────────────────────────────────────

/**
 * Consumes the `FormContext` and returns the `FormContextValue`.
 *
 * Throws a descriptive error if called outside of a `<VoraForm>` provider,
 * catching misconfiguration at dev-time rather than producing mysterious
 * `undefined` errors.
 *
 * @returns The current `FormContextValue`
 * @throws Error if no `<VoraForm>` ancestor is found
 */
export function useFormContext(): FormContextValue {
  const ctx = useContext(FormContext);
  if (!ctx) {
    throw new Error(
      '[VoraForm] useFormContext must be used within a <VoraForm> provider. ' +
        'Wrap your field components in <VoraForm>.'
    );
  }
  return ctx;
}

// ─── VoraForm Provider Component ─────────────────────────────────────────────

/**
 * Props for the `<VoraForm>` provider component.
 */
export interface VoraFormProps {
  /** Field components rendered inside the form. */
  children: React.ReactNode;

  /**
   * Called with the serialized form values when validation passes.
   * May be async — the form will show a submitting state while awaiting.
   *
   * @param values - All current form values as a plain object
   * @param store  - The raw FormStore for advanced operations (e.g., `getDirtyValues()`)
   */
  onSubmit: (values: Record<string, unknown>, store: FormStore) => void | Promise<void>;

  /**
   * Optional validation function — typically produced by `createZodAdapter()`.
   * If omitted, no validation is performed on submit.
   */
  validate?: ValidateFunction;

  /** Custom CSS class for the `<form>` element. */
  className?: string;

  /**
   * Global initial values for the form.
   * Useful for seeding data from an API or setting defaults for complex fields.
   */
  initialValues?: Record<string, unknown>;
}

/**
 * Root form provider — creates the `FormStore` and exposes it via Context.
 *
 * ### How it achieves zero re-renders
 *
 * 1. The `FormStore` is created once in a `useRef`. The ref value never
 *    changes, so the context value is referentially stable.
 * 2. Field value updates go through `store.setValue()` → pub/sub
 *    notification → `useSyncExternalStore` in each field hook. The
 *    provider itself never re-renders for value changes.
 * 3. The only state in this component is `isSubmitting`, which is a
 *    form-level concern (disabling the submit button). It does not
 *    affect individual field components.
 *
 * @example
 * ```tsx
 * import { z } from 'zod';
 * import { VoraForm, createZodAdapter } from '@vora/core';
 *
 * const schema = z.object({ email: z.string().email() });
 *
 * <VoraForm
 *   validate={createZodAdapter(schema)}
 *   onSubmit={(data) => console.log(data)}
 * >
 *   <VRText name="email" />
 *   <VRSubmit />
 * </VoraForm>
 * ```
 */
export function VoraForm({
  children,
  onSubmit,
  validate,
  className,
  initialValues,
}: VoraFormProps): React.JSX.Element {
  // ── Stable store instance (never changes after mount) ───────────────────
  const storeRef = useRef<FormStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = new FormStore(initialValues);
  }
  const store = storeRef.current;

  // ── FIX C5: Stable validate ref ────────────────────────────────────────
  // Store `validate` in a ref so the context value never changes when the
  // parent provides a new `validate` function reference. Consumers access
  // it through the `getValidate()` getter, which always reads the latest.
  const validateRef = useRef(validate);
  useEffect(() => { validateRef.current = validate; }, [validate]);

  // ── Submit handler ──────────────────────────────────────────────────────
  const handleSubmit = React.useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (store.isValidating) {
        return; // Block submission while async validation is pending
      }

      const values = store.getAllValues();
      const currentValidate = validateRef.current;

      // Run validation if a validate function was provided
      if (currentValidate) {
        store.clearAllErrors();
        const errors = currentValidate(values);
        const errorPaths = Object.keys(errors);

        if (errorPaths.length > 0) {
          // Map errors to the store so field components can display them
          for (const path of errorPaths) {
            store.setError(path, errors[path]);
            store.setTouched(path); // Fix Ghost Errors: UI requires isTouched to show error
          }
          // Focus the first errored field for accessibility
          store.focusField(errorPaths[0]);
          return;
        }
      } else {
        // Fallback to internal native prop validation engine (Zod-optional)
        const isValid = store.validateInternal();
        if (!isValid) {
          // Find the first field with an error and focus it
          const allErrors = store.getAllErrors();
          for (const path of Object.keys(allErrors)) {
            store.setTouched(path);
          }
          const firstErrorPath = Object.keys(allErrors)[0];
          if (firstErrorPath) {
             store.focusField(firstErrorPath);
          }
          return;
        }
      }

      // No errors — call the developer's onSubmit
      store.setSubmitting(true);
      try {
        await onSubmit(values, store);
      } finally {
        store.setSubmitting(false);
      }
    },
    [store, onSubmit] // REMOVED validate — read from ref instead
  );

  // ── Context value (100% referentially stable) ──────────────────────────
  // ONLY depends on `store` — which is created once via useRef.
  // `getValidate` is a stable closure over `validateRef`.
  const contextValue = React.useMemo<FormContextValue>(
    () => ({
      store,
      getValidate: () => validateRef.current,
    }),
    [store]
  );

  return (
    <FormContext.Provider value={contextValue}>
      <form onSubmit={handleSubmit} className={className} noValidate>
        {children}
      </form>
    </FormContext.Provider>
  );
}
