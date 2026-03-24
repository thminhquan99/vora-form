import type { PaulyFieldProps } from '@pauly/core';

/**
 * Props for the `<PaulyOTPInput>` component.
 *
 * Stores the entire OTP string (e.g., "123456") under a single field
 * name, NOT as individual fields. Renders `length` individual boxes
 * with automatic focus management.
 */
export interface PaulyOTPInputProps
  extends PaulyFieldProps<string, HTMLDivElement> {
  /** Visible label text. If omitted, no label is rendered. */
  label?: string;

  /** Number of OTP digits. @default 6 */
  length?: number;

  /** HTML `id` override. Defaults to `name` if not provided. */
  id?: string;
}
