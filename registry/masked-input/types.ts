import type { PaulyFieldProps } from '@pauly/core';

/**
 * Props for the `<PaulyMaskedInput>` component.
 *
 * Extends `PaulyFieldProps<string, HTMLInputElement>` with a `formatter`
 * function that transforms raw input into a formatted display string
 * (e.g., adding commas to currency: 1000000 → 1,000,000).
 */
export interface PaulyMaskedInputProps
  extends PaulyFieldProps<string, HTMLInputElement> {
  /** Visible label text. If omitted, no label is rendered. */
  label?: string;

  /** Placeholder text for the native input. */
  placeholder?: string;

  /**
   * A pure function that takes the raw string and returns the formatted
   * display string. Called on every keystroke.
   *
   * @example
   * ```ts
   * // Currency: 1000000 → 1,000,000
   * const formatCurrency = (val: string) => {
   *   const digits = val.replace(/\D/g, '');
   *   return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
   * };
   * ```
   */
  formatter: (value: string) => string;

  /** HTML `id` override. Defaults to `name` if not provided. */
  id?: string;
}
