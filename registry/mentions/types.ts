import type { VRFieldProps } from '@vora/core';

export interface VRMentionUser {
  id: string;
  name: string;
}

export interface VRMentionsProps
  extends VRFieldProps<string, HTMLDivElement> {
  users: VRMentionUser[];
  label?: string;
  placeholder?: string;
  id?: string;
}
