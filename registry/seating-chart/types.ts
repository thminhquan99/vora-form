import { VRFieldProps } from '@vora/core';

export interface VRSeatingChartProps extends VRFieldProps<string[], HTMLDivElement> {
  label?: string;
  required?: boolean;
  className?: string;
  id?: string;
  svgContent?: string;
}
