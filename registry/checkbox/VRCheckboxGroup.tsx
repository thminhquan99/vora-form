'use client';

import React, { useCallback } from 'react';
import { useVoraField } from '@vora/core';
import { VRLabel } from '../label';
import { VRFieldError } from '../field-error';
import type { VRCheckboxGroupProps } from './types';
import styles from './VRCheckbox.module.css';

/**
 * Multi-select checkbox group — manages an **array** of selected values.
 *
 * ### Composite Widget Pattern
 *
 * Unlike `VRCheckbox` (single boolean, uncontrolled), this component
 * is a **composite widget**. It subscribes to `useVoraField<string[]>(name)`
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
 * VRText fields (subscribed to different paths) are NOT affected.
 * The pub/sub only notifies `"roles:value"`, not `"firstName:value"`.
 *
 * ### Accessibility
 *
 * - Uses `role="group"` with `aria-labelledby` pointing to the label.
 * - Each child checkbox has its own `<label>` linked via `id`/`htmlFor`.
 */
export function VRCheckboxGroup({
  name,
  label,
  options,
  disabled = false,
  required = false,
  className,
  id,
}: VRCheckboxGroupProps): React.JSX.Element {
  const field = useVoraField<string[]>(name);

  const groupId = id ?? name;
  const labelId = `${groupId}-label`;
  const errorId = `${name}-error`;
  const hasError = !!field.error;
  const currentValues = field.value ?? [];

  /**
   * Toggle a value in the selected array.
   * Uses `field.setValue(newArray)` — domain value path → store.setValue()
   * → triggers re-render so checked states update.
   */
  const handleToggle = useCallback(
    (optionValue: string) => {
      const next = currentValues.includes(optionValue)
        ? currentValues.filter((v) => v !== optionValue)
        : [...currentValues, optionValue];
      field.setValue(next);
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
        <VRLabel htmlFor={groupId} required={required}>
          <span id={labelId}>{label}</span>
        </VRLabel>
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

      <VRFieldError name={name} />
    </div>
  );
}
