import type { PaulyFieldProps } from '@pauly/core';

export type WidgetNode = {
  id: string;
  type: 'folder' | 'field';
  title: string;
  children?: WidgetNode[];
};

export interface PaulyWidgetBuilderProps
  extends PaulyFieldProps<WidgetNode[], HTMLDivElement> {
  label?: string;
  id?: string;
}
