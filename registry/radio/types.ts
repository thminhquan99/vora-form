import type { PaulyFieldProps } from '@pauly/core';

export interface RadioOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface PaulyRadioGroupProps
  extends PaulyFieldProps<string, HTMLFieldSetElement> {
  /** Group label rendered as a `<legend>`. */
  label: string;
  /** Available radio options. */
  options: RadioOption[];
  /** Whether the field is required. */
  required?: boolean;
  /** HTML `id` override. Defaults to `name`. */
  id?: string;
}
