import type { VRFieldProps } from '@vora/core';

export interface VRSpreadsheetProps extends VRFieldProps<string[][], HTMLDivElement> {
  label?: string;
  id?: string;
  required?: boolean;
  className?: string;
  rows: number;
  cols: number;
}
