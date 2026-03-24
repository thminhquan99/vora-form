import type { PaulyFieldProps } from '@pauly/core';

export interface PaulyPasswordInputProps
  extends PaulyFieldProps<string, HTMLInputElement> {
  label?: string;
  placeholder?: string;
  showStrengthMeter?: boolean;
  id?: string;
}
