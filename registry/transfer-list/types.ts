import type { VRFieldProps } from '@vora/core';

export interface VRTransferListOption {
  value: string;
  label: string;
}

export interface VRTransferListProps
  extends VRFieldProps<string[], HTMLDivElement> {
  options: VRTransferListOption[];
  leftTitle?: string;
  rightTitle?: string;
  label?: string;
  id?: string;
}
