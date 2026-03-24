import type { VRFieldProps } from '@vora/core';

/**
 * Props for the `<VRSignature>` canvas component.
 *
 * The field value is `string | null`:
 * - `null` → empty / cleared canvas
 * - `string` → base64 data URL (`image/png`)
 */
export interface VRSignatureProps
  extends VRFieldProps<string | null, HTMLCanvasElement> {
  /** Label text displayed above the canvas. */
  label: string;

  /** Pen / stroke color. Default: `'#000000'`. */
  penColor?: string;

  /** Pen / stroke width in pixels. Default: `2`. */
  penWidth?: number;

  /** Canvas height in pixels. Default: `200`. */
  canvasHeight?: number;

  /** Whether the field is required — shows visual indicator on label. */
  required?: boolean;

  /** HTML `id` override. Defaults to `name`. */
  id?: string;
}
