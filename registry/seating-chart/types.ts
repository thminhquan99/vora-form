import { PaulyFieldProps } from '@pauly/core';

export interface PaulySeatingChartProps extends PaulyFieldProps<string[], HTMLDivElement> {
  label?: string;
  required?: boolean;
  className?: string;
  id?: string;
  svgContent?: string;
}
