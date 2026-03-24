import type { VRFieldProps } from '@vora/core';

export interface VRCreditCardProps
  extends VRFieldProps<string, HTMLInputElement> {
  label?: string;
  placeholder?: string;
  id?: string;
}
