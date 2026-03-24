import type { PaulyFieldProps } from '@pauly/core';

export interface PaulySpreadsheetProps extends PaulyFieldProps<string[][], HTMLDivElement> {
  label?: string;
  id?: string;
  required?: boolean;
  className?: string;
  rows: number;
  cols: number;
}
