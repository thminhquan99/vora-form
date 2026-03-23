'use client';

import React, { useCallback } from 'react';
import { usePaulyField } from '@pauly/core';
import { PaulyLabel } from '../label';
import { PaulyFieldError } from '../field-error';
import type { PaulyCheckboxGroupProps } from './types';
import styles from './PaulyCheckbox.module.css';

/**
 * Multi-select checkbox group — manages an **array** of selected values.
 *
 * ### Composite Widget Pattern
 *
 * Unlike `PaulyCheckbox` (single boolean, uncontrolled), this component
 * is a **composite widget**. It subscribes to `usePaulyField<string[]>(name)`
 * and renders multiple native checkboxes based on the `options` prop.
 *
 * When a child checkbox is toggled:
 * 1. We intercept the native event.
 * 2. Compute the new array (add or remove the toggled value).
 * 3. Call `field.onChange(newArray)` — this passes a **domain value**
 *    (not a ChangeEvent), triggering `store.setValue()` → pub/sub →
 *    React re-render.
 *
 * This re-render is **expected and correct**: the group needs to
 * re-evaluate which checkboxes are checked after the array changes.
 *
 * ### Cross-field Isolation
 *
 * Even though the CheckboxGroup re-renders when toggled, sibling
 * PaulyText fields (subscribed to different paths) are NOT affected.
 * The pub/sub only notifies `"roles:value"`, not `"firstName:value"`.
 *
 * ### Accessibility
 *
 * - Uses `role="group"` with `aria-labelledby` pointing to the label.
 * - Each child checkbox has its own `<label>` linked via `id`/`htmlFor`.
 */
export function PaulyCheckboxGroup({
  name,
  label,
  options,
  disabled = false,
  required = false,
  className,
  id,
}: PaulyCheckboxGroupProps): React.JSX.Element {
  const field = usePaulyField<string[]>(name);

  const groupId = id ?? name;
  const labelId = `${groupId}-label`;
  const errorId = `${name}-error`;
  const hasError = !!field.error;
  const currentValues = field.value ?? [];

  /**
   * Toggle a value in the selected array.
   * Uses `field.onChange(newArray)` — domain value path → store.setValue()
   * → triggers re-render so checked states update.
   */
  const handleToggle = useCallback(
    (optionValue: string) => {
      const next = currentValues.includes(optionValue)
        ? currentValues.filter((v) => v !== optionValue)
        : [...currentValues, optionValue];
      field.onChange(next as string[] & React.ChangeEvent<HTMLElement>);
    },
    [currentValues, field]
  );

  return (
    <div
      ref={field.ref}
      id={groupId}
      role="group"
      aria-labelledby={label ? labelId : undefined}
      aria-invalid={hasError || undefined}
      aria-describedby={hasError ? errorId : undefined}
      className={`${styles.groupWrapper} ${className ?? ''}`}
    >
      {label && (
        <PaulyLabel htmlFor={groupId} required={required}>
          <span id={labelId}>{label}</span>
        </PaulyLabel>
      )}

      <div className={styles.optionsList}>
        {options.map((option) => {
          const optionId = `${groupId}-${option.value}`;
          const isChecked = currentValues.includes(option.value);

          return (
            <div key={option.value} className={styles.checkboxRow}>
              <input
                id={optionId}
                type="checkbox"
                checked={isChecked}
                onChange={() => handleToggle(option.value)}
                onBlur={field.onBlur}
                disabled={disabled || option.disabled}
                className={`${styles.checkbox} ${hasError ? styles.checkboxError : ''}`}
              />
              <label htmlFor={optionId} className={styles.label}>
                {option.label}
              </label>
            </div>
          );
        })}
      </div>

      <PaulyFieldError name={name} />
    </div>
  );
}
