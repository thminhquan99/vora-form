'use client';

import React from 'react';
import { usePaulyField } from '@pauly/core';
import { PaulyFieldError } from '../field-error';
import type { PaulyRadioGroupProps } from './types';
import styles from './PaulyRadioGroup.module.css';

/**
 * Radio button group integrated with PaulyForm.
 *
 * ### Uncontrolled-First Architecture
 *
 * Each `<input type="radio">` shares the same `name` attribute.
 * Uses `defaultChecked` (not `checked`) to stay uncontrolled.
 * When a radio is selected:
 * 1. Browser selects the radio natively — instant visual feedback.
 * 2. `field.onChange` calls `setSilentValue(name, target.value)` —
 *    the store syncs without triggering a React re-render.
 * 3. On blur, single-field validation runs.
 *
 * ### Why Uncontrolled Works for Radios
 *
 * Native radio groups enforce mutual exclusivity via the shared `name`
 * attribute — the browser deselects the previous radio when a new one
 * is selected. No React state management is needed.
 *
 * ### Accessibility
 *
 * - `<fieldset>` with `<legend>` provides group semantics.
 * - Each radio has its own `<label>` linked via `id`/`htmlFor`.
 * - `aria-invalid` and `aria-describedby` for error states.
 */
export function PaulyRadioGroup({
  name,
  label,
  options,
  disabled = false,
  required = false,
  className,
  id,
}: PaulyRadioGroupProps): React.JSX.Element {
  const field = usePaulyField<string>(name);

  const groupId = id ?? name;
  const errorId = `${name}-error`;
  const hasError = !!field.error;

  return (
    <fieldset
      ref={field.ref}
      id={groupId}
      aria-invalid={hasError || undefined}
      aria-describedby={hasError ? errorId : undefined}
      className={`${styles.fieldset} ${className ?? ''}`}
    >
      <legend className={styles.legend}>
        {label}
        {required && (
          <span className={styles.required} aria-hidden="true"> *</span>
        )}
      </legend>

      <div className={styles.optionsList}>
        {options.map((option) => {
          const optionId = `${groupId}-${option.value}`;

          return (
            <div key={option.value} className={styles.radioRow}>
              <input
                id={optionId}
                type="radio"
                name={name}
                value={option.value}
                defaultChecked={field.value === option.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={disabled || option.disabled}
                className={`${styles.radio} ${hasError ? styles.radioError : ''}`}
              />
              <label htmlFor={optionId} className={styles.label}>
                {option.label}
              </label>
            </div>
          );
        })}
      </div>

      <PaulyFieldError name={name} />
    </fieldset>
  );
}
