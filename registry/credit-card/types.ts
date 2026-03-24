import type { PaulyFieldProps } from '@pauly/core';

export interface PaulyCreditCardProps
  extends PaulyFieldProps<string, HTMLInputElement> {
  label?: string;
  placeholder?: string;
  id?: string;
}
