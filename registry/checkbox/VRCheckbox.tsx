'use client';

import React from 'react';
import { useVoraField } from '@vora/core';
import { VRFieldError } from '../field-error';
import type { VRCheckboxProps } from './types';
import styles from './VRCheckbox.module.css';

/**
 * Single boolean checkbox integrated with VoraForm.
 *
 * ### Uncontrolled-First Architecture
 *
 * Uses `defaultChecked` (not `checked`) to keep the input uncontrolled.
 * When toggled:
 * 1. Browser updates `.checked` on the DOM immediately.
 * 2. `onChange` calls `field.setValue(target.checked)` — this notifies
 *    subscribers (e.g., `VRConditional`) via pub/sub.
 * 3. The checkbox itself stays uncontrolled (`defaultChecked`).
 *
 * ### Accessibility
 *
 * - The `<input>` and `<label>` are linked via `id` / `htmlFor`.
 * - `aria-invalid` and `aria-describedby` are set when an error exists.
 * - The label is clickable — toggling the checkbox.
 */
export function VRCheckbox({
  name,
  label,
  disabled = false,
  required = false,
  className,
  id,
}: VRCheckboxProps): React.JSX.Element {
  const field = useVoraField<boolean>(name);

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
          aria-invalid={hasError && field.isTouched ? "true" : "false"}
          aria-describedby={hasError && field.isTouched ? errorId : undefined}
          className={`${styles.checkbox} ${hasError && field.isTouched ? styles.checkboxError : ''}`}
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
      <VRFieldError name={name} />
    </div>
  );
}
