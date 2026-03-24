import type { VRFieldProps } from '@vora/core';

export interface VRDropzoneProps
  extends VRFieldProps<File[], HTMLDivElement> {
  /** Label text displayed above the dropzone. */
  label: string;

  /**
   * Accepted file types (maps to `<input accept>`).
   * @example "image/*" | "image/*,.pdf" | ".png,.jpg,.jpeg"
   */
  accept?: string;

  /** Maximum number of files allowed. Default: unlimited. */
  maxFiles?: number;

  /** Maximum file size in bytes. Default: unlimited. */
  maxSize?: number;

  /** Whether the field is required. */
  required?: boolean;

  /** HTML `id` override. Defaults to `name`. */
  id?: string;
}
