'use client';

import { useVoraField } from '@vora/core';
import type { VRConditionalProps } from './types';

/**
 * Conditionally renders children based on another field's value.
 *
 * ### How It Works
 *
 * 1. Subscribes to the `watch` field via `useVoraField(watch)`.
 * 2. Evaluates `condition(field.value)`.
 * 3. Returns `<>{children}</>` if true, `null` if false.
 *
 * ### Zero Re-render Isolation
 *
 * Because `useVoraField` uses `useSyncExternalStore` with path-scoped
 * pub/sub, this component re-renders **only** when the watched field's
 * value changes. It does NOT re-render when:
 * - Sibling fields change
 * - The conditionally-rendered child fields change
 * - Any other form state changes
 *
 * ### Not an Input
 *
 * This component is purely a subscriber — it does NOT:
 * - Attach `field.ref` to any element
 * - Call `field.onChange` or `field.setValue`
 * - Call `field.onBlur`
 *
 * It only reads `field.value` to decide whether to mount/unmount children.
 *
 * @example
 * ```tsx
 * <VRConditional
 *   watch="hasReason"
 *   condition={(val) => val === true}
 * >
 *   <VRText name="reason" label="Why?" />
 * </VRConditional>
 * ```
 */
export function VRConditional({
  watch,
  condition,
  children,
}: VRConditionalProps): React.JSX.Element | null {
  const field = useVoraField(watch);

  if (!condition(field.value)) {
    return null;
  }

  return <>{children}</>;
}
