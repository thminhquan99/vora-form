import type { PaulyFieldProps } from '@pauly/core';

export interface PaulyTagInputProps
  extends PaulyFieldProps<string[], HTMLDivElement> {
  label?: string;
  placeholder?: string;
  id?: string;
}
