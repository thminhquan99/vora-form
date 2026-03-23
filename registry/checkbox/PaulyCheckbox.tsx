'use client';

import React from 'react';
import { usePaulyField } from '@pauly/core';
import { PaulyFieldError } from '../field-error';
import type { PaulyCheckboxProps } from './types';
import styles from './PaulyCheckbox.module.css';

/**
 * Single boolean checkbox integrated with PaulyForm.
 *
 * ### Uncontrolled-First Architecture
 *
 * Uses `defaultChecked` (not `checked`) to keep the input uncontrolled.
 * When toggled:
 * 1. Browser updates `.checked` on the DOM immediately.
 * 2. `onChange` calls `field.setValue(target.checked)` — this notifies
 *    subscribers (e.g., `PaulyConditional`) via pub/sub.
 * 3. The checkbox itself stays uncontrolled (`defaultChecked`).
 *
 * ### Accessibility
 *
 * - The `<input>` and `<label>` are linked via `id` / `htmlFor`.
 * - `aria-invalid` and `aria-describedby` are set when an error exists.
 * - The label is clickable — toggling the checkbox.
 */
export function PaulyCheckbox({
  name,
  label,
  disabled = false,
  required = false,
  className,
  id,
}: PaulyCheckboxProps): React.JSX.Element {
  const field = usePaulyField<boolean>(name);

  const inputId = id ?? name;
  const errorId = `${name}-error`;
  const hasError = !!field.error;

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      <div className={styles.checkboxRow}>
        <input
          ref={field.ref}
          id={inputId}
          name={name}
          type="checkbox"
          defaultChecked={!!field.value}
          onChange={(e) => field.setValue(e.target.checked)}
          onBlur={field.onBlur}
          disabled={disabled}
          required={required}
          aria-required={required || undefined}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? errorId : undefined}
          className={`${styles.checkbox} ${hasError ? styles.checkboxError : ''}`}
        />
        <label
          htmlFor={inputId}
          className={styles.label}
        >
          {label}
          {required && (
            <span className={styles.required} aria-hidden="true"> *</span>
          )}
        </label>
      </div>
      <PaulyFieldError name={name} />
    </div>
  );
}
