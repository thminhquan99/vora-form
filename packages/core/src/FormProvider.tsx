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
 * `useSyncExternalStore` in the `usePaulyField` hook.
 */

import React, { createContext, useContext, useRef } from 'react';

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
   * Optional validation function produced by a schema adapter (e.g., Zod).
   * Called by `handleSubmit` before invoking `onSubmit`.
   */
  validate?: ValidateFunction;

  /**
   * Whether the form is currently submitting.
   * Managed by handleSubmit to disable submit buttons.
   */
  isSubmitting: boolean;
}

/**
 * React Context for the form store.
 *
 * Initialised to `null` so that field components can detect when they
 * are rendered outside a `<PaulyForm>` ancestor and throw a clear error.
 */
const FormContext = createContext<FormContextValue | null>(null);
FormContext.displayName = 'PaulyFormContext';

// ─── useFormContext Hook ──────────────────────────────────────────────────────

/**
 * Consumes the `FormContext` and returns the `FormContextValue`.
 *
 * Throws a descriptive error if called outside of a `<PaulyForm>` provider,
 * catching misconfiguration at dev-time rather than producing mysterious
 * `undefined` errors.
 *
 * @returns The current `FormContextValue`
 * @throws Error if no `<PaulyForm>` ancestor is found
 */
export function useFormContext(): FormContextValue {
  const ctx = useContext(FormContext);
  if (!ctx) {
    throw new Error(
      '[PaulyForm] useFormContext must be used within a <PaulyForm> provider. ' +
        'Wrap your field components in <PaulyForm>.'
    );
  }
  return ctx;
}

// ─── PaulyForm Provider Component ─────────────────────────────────────────────

/**
 * Props for the `<PaulyForm>` provider component.
 */
export interface PaulyFormProps {
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
 * import { PaulyForm, createZodAdapter } from '@pauly/core';
 *
 * const schema = z.object({ email: z.string().email() });
 *
 * <PaulyForm
 *   validate={createZodAdapter(schema)}
 *   onSubmit={(data) => console.log(data)}
 * >
 *   <PaulyText name="email" />
 *   <PaulySubmit />
 * </PaulyForm>
 * ```
 */
export function PaulyForm({
  children,
  onSubmit,
  validate,
  className,
}: PaulyFormProps): React.JSX.Element {
  // ── Stable store instance (never changes after mount) ───────────────────
  const storeRef = useRef<FormStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = new FormStore();
  }
  const store = storeRef.current;

  // ── Submitting state (form-level only, does not affect field components) ─
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // ── Submit handler ──────────────────────────────────────────────────────
  const handleSubmit = React.useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const values = store.getAllValues();

      // Run validation if a validate function was provided
      if (validate) {
        store.clearAllErrors();
        const errors = validate(values);
        const errorPaths = Object.keys(errors);

        if (errorPaths.length > 0) {
          // Map errors to the store so field components can display them
          for (const path of errorPaths) {
            store.setError(path, errors[path]);
          }
          // Focus the first errored field for accessibility
          store.focusField(errorPaths[0]);
          return;
        }
      }

      // No errors — call the developer's onSubmit
      setIsSubmitting(true);
      try {
        await onSubmit(values, store);
      } finally {
        setIsSubmitting(false);
      }
    },
    [store, validate, onSubmit]
  );

  // ── Context value (referentially stable except for isSubmitting) ─────────
  // We intentionally recreate this object only when isSubmitting changes.
  // Field components do NOT read isSubmitting — only <PaulySubmit> does,
  // so this re-render is scoped to the submit button only.
  const contextValue = React.useMemo<FormContextValue>(
    () => ({ store, validate, isSubmitting }),
    [store, validate, isSubmitting]
  );

  return (
    <FormContext.Provider value={contextValue}>
      <form onSubmit={handleSubmit} className={className} noValidate>
        {children}
      </form>
    </FormContext.Provider>
  );
}
