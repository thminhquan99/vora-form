import type { PaulyFieldProps } from '@pauly/core';

/**
 * Props for the `<PaulyDatePicker>` component.
 *
 * Extends `PaulyFieldProps<string, HTMLInputElement>` and stores the
 * selected date as an ISO date string (`YYYY-MM-DD`) in the form store.
 */
export interface PaulyDatePickerProps
  extends PaulyFieldProps<string, HTMLInputElement> {
  /** Visible label text. If omitted, no label is rendered. */
  label?: string;

  /**
   * Minimum selectable date in `YYYY-MM-DD` format.
   * @example "2000-01-01"
   */
  min?: string;

  /**
   * Maximum selectable date in `YYYY-MM-DD` format.
   * @example "2025-12-31"
   */
  max?: string;

  /** HTML `id` override. Defaults to `name` if not provided. */
  id?: string;
}
