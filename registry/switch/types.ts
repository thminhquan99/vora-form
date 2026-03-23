import type { PaulyFieldProps } from '@pauly/core';

export interface PaulySwitchProps
  extends PaulyFieldProps<boolean, HTMLButtonElement> {
  /** Label text displayed beside the switch. */
  label: string;

  /** Whether the field is required. */
  required?: boolean;

  /** HTML `id` override. Defaults to `name`. */
  id?: string;
}
