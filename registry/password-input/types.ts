import type { VRFieldProps } from '@vora/core';

export interface VRPasswordInputProps
  extends VRFieldProps<string, HTMLInputElement> {
  label?: string;
  placeholder?: string;
  showStrengthMeter?: boolean;
  id?: string;
}
