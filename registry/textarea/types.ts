import type { PaulyFieldProps } from '@pauly/core';

export interface PaulyTextareaProps
  extends PaulyFieldProps<string, HTMLTextAreaElement> {
  /** Label text displayed above the textarea. */
  label: string;
  /** Number of visible text rows. Default: `3`. */
  rows?: number;
  /** Placeholder text. */
  placeholder?: string;
  /** Whether the field is required. */
  required?: boolean;
  /** HTML `id` override. Defaults to `name`. */
  id?: string;
}
