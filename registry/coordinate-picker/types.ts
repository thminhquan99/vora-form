import type { PaulyFieldProps } from '@pauly/core';

export type Coordinate = { x: number; y: number };

export interface PaulyCoordinatePickerProps extends PaulyFieldProps<Coordinate | null, HTMLDivElement> {
  label?: string;
  height?: number;
  id?: string;
}
