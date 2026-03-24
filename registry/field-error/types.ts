import type { VRFieldProps } from '@vora/core';

/**
 * Props for the `<VRFieldError>` component.
 *
 * Only requires `name` to bind to the correct field's error state.
 * Inherits from `VRFieldProps` for consistency but only uses
 * the `name` and `className` props.
 */
export interface VRFieldErrorProps
  extends Pick<VRFieldProps, 'name' | 'className'> {
  /**
   * Optional role override. Defaults to `"alert"` for live-region
   * accessibility — screen readers announce the error immediately.
   */
  role?: string;
}
