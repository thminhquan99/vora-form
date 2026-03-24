import type { PaulyFieldProps } from '@pauly/core';

export interface PaulyMentionUser {
  id: string;
  name: string;
}

export interface PaulyMentionsProps
  extends PaulyFieldProps<string, HTMLDivElement> {
  users: PaulyMentionUser[];
  label?: string;
  placeholder?: string;
  id?: string;
}
