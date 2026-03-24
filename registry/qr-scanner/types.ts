import type { VRFieldProps } from '@vora/core';

/**
 * Props for the `<VRQRScanner>` component.
 *
 * The field value is `string | null`:
 * - `null` → no QR/barcode detected yet
 * - `string` → the decoded text from the QR/barcode
 */
export interface VRQRScannerProps
  extends VRFieldProps<string | null, HTMLDivElement> {
  /** Label text displayed above the scanner. */
  label: string;

  /** Camera facing mode. Default: `'environment'` (rear camera). */
  facingMode?: 'user' | 'environment';

  /** Whether the field is required. */
  required?: boolean;

  /** HTML `id` override. Defaults to `name`. */
  id?: string;
}
