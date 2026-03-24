import type { VRFieldProps } from '@vora/core';

/**
 * Props for the `<VROTPInput>` component.
 *
 * Stores the entire OTP string (e.g., "123456") under a single field
 * name, NOT as individual fields. Renders `length` individual boxes
 * with automatic focus management.
 */
export interface VROTPInputProps
  extends VRFieldProps<string, HTMLDivElement> {
  /** Visible label text. If omitted, no label is rendered. */
  label?: string;

  /** Number of OTP digits. @default 6 */
  length?: number;

  /** HTML `id` override. Defaults to `name` if not provided. */
  id?: string;
}
