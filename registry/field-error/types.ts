import type { PaulyFieldProps } from '@pauly/core';

/**
 * Props for the `<PaulyFieldError>` component.
 *
 * Only requires `name` to bind to the correct field's error state.
 * Inherits from `PaulyFieldProps` for consistency but only uses
 * the `name` and `className` props.
 */
export interface PaulyFieldErrorProps
  extends Pick<PaulyFieldProps, 'name' | 'className'> {
  /**
   * Optional role override. Defaults to `"alert"` for live-region
   * accessibility — screen readers announce the error immediately.
   */
  role?: string;
}
