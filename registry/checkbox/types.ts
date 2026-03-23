import type { PaulyFieldProps } from '@pauly/core';

/**
 * Props for the single `<PaulyCheckbox>` component.
 * Represents a boolean toggle (e.g., "Accept Terms").
 */
export interface PaulyCheckboxProps
  extends PaulyFieldProps<boolean, HTMLInputElement> {
  /** Label text shown next to the checkbox. */
  label: string;

  /** HTML `id` override. Defaults to `name` if not provided. */
  id?: string;
}

/**
 * A single option within a `<PaulyCheckboxGroup>`.
 */
export interface CheckboxOption {
  /** Visible label text. */
  label: string;
  /** The value added to the array when this option is checked. */
  value: string;
  /** Whether this individual option is disabled. */
  disabled?: boolean;
}

/**
 * Props for the `<PaulyCheckboxGroup>` component.
 * Manages an array of selected string values.
 */
export interface PaulyCheckboxGroupProps
  extends PaulyFieldProps<string[], HTMLDivElement> {
  /** Group label displayed above the options. */
  label?: string;

  /** Available options to render as checkboxes. */
  options: CheckboxOption[];

  /** Whether the field is required — shows visual indicator on label. */
  required?: boolean;

  /** HTML `id` override for the group container. Defaults to `name`. */
  id?: string;
}
