'use client';

import React from 'react';
import { useVoraField } from '@vora/core';
import { VRLabel } from '../label';
import { VRFieldError } from '../field-error';
import type { VRDatePickerProps } from './types';
import styles from './VRDatePicker.module.css';

/**
 * Native date picker wrapped in the VoraForm zero-re-render architecture.
 *
 * ### Why Native `<input type="date">`?
 *
 * - **Zero dependencies** — no third-party date picker library needed.
 * - **Platform-native UX** — uses the OS/browser date picker (calendar
 *   popup on Chrome/Edge, spinner on Safari, etc.).
 * - **Accessibility** — native inputs have full keyboard + screen reader
 *   support out of the box.
 * - **ISO format** — the browser always returns `YYYY-MM-DD` from
 *   `input.value`, which is the ideal storage format.
 *
 * ### How It Works
 *
 * 1. Renders an uncontrolled `<input type="date">` with `defaultValue`.
 * 2. `onChange` calls `field.onChange(e)` → `setSilentValue(name, e.target.value)`.
 *    The value is always a `YYYY-MM-DD` string (or `""` if cleared).
 * 3. No React re-render happens on date selection — the DOM is the
 *    source of truth. Counter stays at 1.
 */
export function VRDatePicker({
  name,
  label,
  min,
  max,
  disabled = false,
  required = false,
  className,
  id,
}: VRDatePickerProps): React.JSX.Element {
  const field = useVoraField<string>(name);

  const inputId = id ?? name;
  const errorId = `${name}-error`;
  const hasError = !!field.error;

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      {label && (
        <VRLabel htmlFor={inputId} required={required}>
          {label}
        </VRLabel>
      )}

      <input
        ref={field.ref}
        id={inputId}
        name={name}
        type="date"
        defaultValue={field.value ?? ''}
        onChange={field.onChange}
        onBlur={field.onBlur}
        min={min}
        max={max}
        disabled={disabled}
        required={required}
        aria-required={required || undefined}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : undefined}
        className={`${styles.input} ${hasError ? styles.inputError : ''}`}
      />

      <VRFieldError name={name} />
    </div>
  );
}
