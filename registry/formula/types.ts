import type { PaulyFieldProps } from '@pauly/core';

export interface FormulaVariable {
  label: string;
  value: string;
}

export interface PaulyFormulaProps extends PaulyFieldProps<string, HTMLDivElement> {
  label?: string;
  id?: string;
  required?: boolean;
  className?: string;
  variables: FormulaVariable[];
}
