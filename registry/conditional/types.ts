/**
 * Props for the `<VRConditional>` layout component.
 *
 * This is NOT a form input — it's a layout controller that
 * conditionally renders children based on another field's value.
 */
export interface VRConditionalProps {
  /** The field path to subscribe to (e.g., "hasReason"). */
  watch: string;

  /**
   * Predicate that receives the watched field's current value.
   * Return `true` to render `children`, `false` to render nothing.
   */
  condition: (value: unknown) => boolean;

  /** Content to render when `condition` returns true. */
  children: React.ReactNode;
}
