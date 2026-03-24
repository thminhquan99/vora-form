import type { VRFieldProps } from '@vora/core';

export interface RadioOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface VRRadioGroupProps
  extends VRFieldProps<string, HTMLFieldSetElement> {
  /** Group label rendered as a `<legend>`. */
  label: string;
  /** Available radio options. */
  options: RadioOption[];
  /** Whether the field is required. */
  required?: boolean;
  /** HTML `id` override. Defaults to `name`. */
  id?: string;
}
