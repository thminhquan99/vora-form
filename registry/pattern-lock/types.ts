import type { PaulyFieldProps } from '@pauly/core';

export interface PaulyPatternLockProps extends PaulyFieldProps<number[], HTMLDivElement> {
  label?: string;
  id?: string;
}
