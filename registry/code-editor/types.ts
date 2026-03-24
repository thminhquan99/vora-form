import type { PaulyFieldProps } from '@pauly/core';

export interface PaulyCodeEditorProps extends PaulyFieldProps<string, HTMLTextAreaElement> {
  label?: string;
  language?: string;
  placeholder?: string;
  rows?: number;
  id?: string;
}
