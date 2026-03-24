import type { VRFieldProps } from '@vora/core';

export interface TreeNode {
  label: string;
  value: string;
  children?: TreeNode[];
}

export interface VRTreeSelectProps
  extends VRFieldProps<string[], HTMLDivElement> {
  data: TreeNode[];
  label?: string;
  placeholder?: string;
  id?: string;
}
