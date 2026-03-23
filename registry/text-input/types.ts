import type { PaulyFieldProps } from '@pauly/core';

/**
 * Props for the `<PaulyText>` component.
 *
 * Extends `PaulyFieldProps<string>` with text-input-specific props.
 * All standard HTML input attributes are forwarded to the native `<input>`.
 */
export interface PaulyTextProps
  extends PaulyFieldProps<string, HTMLInputElement> {
  /** Visible label text. If omitted, no label is rendered. */
  label?: string;

  /** Placeholder text for the native input. */
  placeholder?: string;

  /**
   * HTML input type. Defaults to `"text"`.
   * Also supports `"email"`, `"tel"`, `"url"` for semantic inputs
   * that still behave like text fields.
   */
  type?: 'text' | 'email' | 'tel' | 'url';

  /** HTML `autocomplete` attribute. */
  autoComplete?: string;

  /** Maximum character length. */
  maxLength?: number;

  /** HTML `id` override. Defaults to `name` if not provided. */
  id?: string;
}
