import type { PaulyFieldProps } from '@pauly/core';

/**
 * Props for the `<PaulySlider>` component.
 *
 * Extends `PaulyFieldProps<number, HTMLInputElement>` — the store value
 * is a JavaScript `number`, not a string. The `usePaulyField` onChange
 * handler automatically converts `input[type="range"]` values to numbers.
 */
export interface PaulySliderProps
  extends PaulyFieldProps<number, HTMLInputElement> {
  /** Visible label text. If omitted, no label is rendered. */
  label?: string;

  /** Minimum value. @default 0 */
  min?: number;

  /** Maximum value. @default 100 */
  max?: number;

  /** Step increment. @default 1 */
  step?: number;

  /** Whether to show the current numeric value next to the slider. @default true */
  showValue?: boolean;

  /** HTML `id` override. Defaults to `name` if not provided. */
  id?: string;
}
