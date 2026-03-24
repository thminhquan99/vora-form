import type { PaulyFieldProps } from '@pauly/core';

export interface TreeNode {
  label: string;
  value: string;
  children?: TreeNode[];
}

export interface PaulyTreeSelectProps
  extends PaulyFieldProps<string[], HTMLDivElement> {
  data: TreeNode[];
  label?: string;
  placeholder?: string;
  id?: string;
}
