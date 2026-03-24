import type { VRFieldProps } from '@vora/core';

export type WidgetNode = {
  id: string;
  type: 'folder' | 'field';
  title: string;
  children?: WidgetNode[];
};

export interface VRWidgetBuilderProps
  extends VRFieldProps<WidgetNode[], HTMLDivElement> {
  label?: string;
  id?: string;
}
