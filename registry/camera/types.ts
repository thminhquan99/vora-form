import type { VRFieldProps } from '@vora/core';

/**
 * Props for the `<VRCamera>` capture component.
 *
 * The field value is `string | null`:
 * - `null` → no photo captured / retaken
 * - `string` → base64 data URL (`image/png`)
 */
export interface VRCameraProps
  extends VRFieldProps<string | null, HTMLDivElement> {
  /** Label text displayed above the camera. */
  label: string;

  /** Camera facing mode. Default: `'user'` (selfie). */
  facingMode?: 'user' | 'environment';

  /** Whether the field is required. */
  required?: boolean;

  /** HTML `id` override. Defaults to `name`. */
  id?: string;
}
