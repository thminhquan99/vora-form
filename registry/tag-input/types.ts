import type { VRFieldProps } from '@vora/core';

export interface VRTagInputProps
  extends VRFieldProps<string[], HTMLDivElement> {
  label?: string;
  placeholder?: string;
  id?: string;
}
