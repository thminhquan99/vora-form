import type { VRFieldProps } from '@vora/core';

export interface VRCodeEditorProps extends VRFieldProps<string, HTMLTextAreaElement> {
  label?: string;
  language?: string;
  placeholder?: string;
  rows?: number;
  id?: string;
}
