import type { VRFieldProps } from '@vora/core';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface VRSelectProps
  extends VRFieldProps<string, HTMLSelectElement> {
  /** Label text displayed above the select. */
  label: string;
  /** Available options. */
  options: SelectOption[];
  /** Placeholder text rendered as a disabled first option. */
  placeholder?: string;
  /** Whether the field is required. */
  required?: boolean;
  /** HTML `id` override. Defaults to `name`. */
  id?: string;
}
