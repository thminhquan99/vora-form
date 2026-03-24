/**
 * @module types
 * @description
 * Shared TypeScript types for `@vora/core`.
 *
 * The centrepiece is `VRFieldProps<TValue>` — the **universal field
 * contract** that every VoraForm component must implement. This single
 * interface is what makes the entire library consistent: whether the
 * component renders a plain `<input>` or a `<canvas>` signature pad,
 * it integrates with the form through the same props shape.
 */

import type { ChangeEvent, Ref } from 'react';

// ─── Universal Field Contract ─────────────────────────────────────────────────

/**
 * The contract every VoraForm field component MUST implement.
 *
 * @typeParam TValue   - The domain value type (e.g., `string`, `string | null`, `Date`)
 * @typeParam TElement - The underlying DOM element type (defaults to `HTMLElement`)
 */
export interface VRFieldProps<
  TValue = unknown,
  TElement extends HTMLElement = HTMLElement,
> {
  /** Unique field name — maps to the form state key and Zod schema key. */
  name: string;

  /**
   * Ref handle bound to the underlying DOM element by `register()`.
   *
   * The Core Store reads/writes the DOM directly through this ref,
   * bypassing React state entirely for native inputs.
   */
  ref?: Ref<TElement>;

  /** Current field value (for controlled scenarios or initial value). */
  value?: TValue;

  /** Default/initial value. */
  defaultValue?: TValue;

  /**
   * Native change handler — strictly for `<input>`, `<textarea>`, `<select>` events.
   *
   * For composite widgets (DatePicker, Signature, CheckboxGroup), use
   * `setValue()` from the `useVoraField` hook return instead.
   */
  onChange?: (e: ChangeEvent<TElement>) => void;

  /** Called when the field loses focus. */
  onBlur?: () => void;

  /** Validation error message (auto-provided by VoraForm context). */
  error?: string;

  /** Whether the field is disabled. */
  disabled?: boolean;

  /** Whether the field is required (mirrors schema). */
  required?: boolean;

  /** Custom CSS class. */
  className?: string;
}

// ─── Validation Types ─────────────────────────────────────────────────────────

/**
 * A map of field-path → error-message returned by the validation engine.
 * An empty object means no errors.
 */
export type ValidationErrors = Record<string, string>;

/**
 * A validation function that receives all form values and returns
 * a map of field-path → error-message. Must return an empty object
 * if validation passes.
 *
 * This is the adapter contract — Zod, Yup, or any custom validator
 * can be wrapped into this shape.
 */
export type ValidateFunction = (
  values: Record<string, unknown>
) => ValidationErrors;
