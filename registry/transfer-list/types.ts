import type { PaulyFieldProps } from '@pauly/core';

export interface PaulyTransferListOption {
  value: string;
  label: string;
}

export interface PaulyTransferListProps
  extends PaulyFieldProps<string[], HTMLDivElement> {
  options: PaulyTransferListOption[];
  leftTitle?: string;
  rightTitle?: string;
  label?: string;
  id?: string;
}
