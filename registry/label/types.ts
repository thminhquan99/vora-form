/**
 * Props for the `<PaulyLabel>` component.
 */
export interface PaulyLabelProps {
  /** The field name this label is associated with (used for `htmlFor`). */
  htmlFor: string;

  /** Label text content. */
  children: React.ReactNode;

  /** Whether the associated field is required — renders a visual indicator. */
  required?: boolean;

  /** Custom CSS class. */
  className?: string;
}
