'use client';

import React from 'react';
import { useVoraField } from '@vora/core';
import { VRLabel } from '../label';
import { VRFieldError } from '../field-error';
import type { VRTextareaProps } from './types';
import styles from './VRTextarea.module.css';

/**
 * Multi-line text input integrated with VoraForm.
 *
 * ### Uncontrolled-First Architecture
 *
 * Uses `defaultValue` (not `value`) to keep the textarea uncontrolled.
 * On every keystroke:
 * 1. Browser updates the DOM natively — instant feedback.
 * 2. `field.onChange` calls `setSilentValue(name, target.value)` —
 *    the store is synced without triggering a React re-render.
 * 3. On blur, single-field validation runs against the store value.
 *
 * ### Accessibility
 *
 * - `<label>` linked via `htmlFor` / `id`.
 * - `aria-invalid` and `aria-describedby` for error states.
 * - `aria-required` when the field is required.
 */
export function VRTextarea({
  name,
  label,
  rows = 3,
  placeholder,
  disabled = false,
  required = false,
  className,
  id,
}: VRTextareaProps): React.JSX.Element {
  const field = useVoraField<string>(name);

  const inputId = id ?? name;
  const errorId = `${name}-error`;
  const hasError = !!field.error;

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      <VRLabel htmlFor={inputId} required={required}>
        {label}
      </VRLabel>

      <textarea
        ref={field.ref}
        id={inputId}
        name={name}
        rows={rows}
        defaultValue={field.value ?? ''}
        onChange={field.onChange}
        onBlur={field.onBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        aria-required={required || undefined}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : undefined}
        className={`${styles.textarea} ${hasError ? styles.textareaError : ''}`}
      />

      <VRFieldError name={name} />
    </div>
  );
}
