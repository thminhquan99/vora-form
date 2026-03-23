import type { PaulyFieldProps } from '@pauly/core';

export interface ComboboxOption {
  /** Display text shown in the dropdown. */
  label: string;
  /** Domain value committed to the store on selection. */
  value: string;
}

export interface PaulyComboboxProps
  extends PaulyFieldProps<string, HTMLDivElement> {
  /** Label text displayed above the combobox. */
  label: string;

  /** List of selectable options. */
  options: ComboboxOption[];

  /** Placeholder shown when no option is selected. */
  placeholder?: string;

  /** Placeholder for the search input inside the dropdown. */
  searchPlaceholder?: string;

  /** Text shown when the search filter produces no results. */
  emptyText?: string;

  /** Whether the field is required. */
  required?: boolean;

  /** HTML `id` override. Defaults to `name`. */
  id?: string;
}
