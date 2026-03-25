'use client';

import React from 'react';
import { useVoraField } from '@vora/core';
import { VRLabel } from '../label';
import { VRFieldError } from '../field-error';
import type { VRSelectProps } from './types';
import styles from './VRSelect.module.css';

/**
 * Native `<select>` dropdown integrated with VoraForm.
 *
 * ### Uncontrolled-First Architecture
 *
 * Uses `defaultValue` (not `value`) to keep the select uncontrolled.
 * When the user picks an option:
 * 1. Browser updates the DOM natively.
 * 2. `field.onChange` calls `setSilentValue(name, target.value)` —
 *    no React re-render.
 * 3. On blur, single-field validation runs against the store value.
 *
 * ### Placeholder
 *
 * The optional `placeholder` prop renders a disabled, selected-by-default
 * `<option>` with an empty value. This ensures the select shows a
 * prompt text until the user makes a deliberate selection.
 *
 * ### Accessibility
 *
 * - `<label>` linked via `htmlFor` / `id`.
 * - `aria-invalid` and `aria-describedby` for error states.
 * - `aria-required` when required.
 */
export function VRSelect({
  name,
  label,
  options,
  placeholder,
  disabled = false,
  required = false,
  className,
  id,
}: VRSelectProps): React.JSX.Element {
  const field = useVoraField<string>(name);

  const inputId = id ?? name;
  const errorId = `${name}-error`;
  const hasError = !!field.error;

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      <VRLabel htmlFor={inputId} required={required}>
        {label}
      </VRLabel>

      <select
        ref={field.ref}
        id={inputId}
        name={name}
        defaultValue={field.value ?? ''}
        onChange={field.onChange}
        onBlur={field.onBlur}
        disabled={disabled}
        required={required}
        aria-required={required || undefined}
        aria-invalid={hasError && field.isTouched ? "true" : "false"}
        aria-describedby={hasError && field.isTouched ? errorId : undefined}
        className={`${styles.select} ${hasError && field.isTouched ? styles.selectError : ''}`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>

      <VRFieldError name={name} />
    </div>
  );
}
