import type { VRFieldProps } from '@vora/core';

export interface VRSwitchProps
  extends VRFieldProps<boolean, HTMLButtonElement> {
  /** Label text displayed beside the switch. */
  label: string;

  /** Whether the field is required. */
  required?: boolean;

  /** HTML `id` override. Defaults to `name`. */
  id?: string;
}
