import type { VRFieldProps } from '@vora/core';

/**
 * Props for the `<VRRating>` component.
 *
 * Stores the selected rating as a JavaScript `number` (1-based)
 * in the FormStore. Hover state is purely local UI state.
 */
export interface VRRatingProps
  extends VRFieldProps<number, HTMLDivElement> {
  /** Visible label text. If omitted, no label is rendered. */
  label?: string;

  /** Maximum number of stars. @default 5 */
  max?: number;

  /** HTML `id` override. Defaults to `name` if not provided. */
  id?: string;
}
