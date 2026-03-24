import type { VRFieldProps } from '@vora/core';

export type Coordinate = { x: number; y: number };

export interface VRCoordinatePickerProps extends VRFieldProps<Coordinate | null, HTMLDivElement> {
  label?: string;
  height?: number;
  id?: string;
}
