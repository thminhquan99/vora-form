'use client';

import React from 'react';
import { useVoraField } from '@vora/core';
import { VRLabel } from '../label';
import { VRFieldError } from '../field-error';
import type { VRTextProps } from './types';
import styles from './VRText.module.css';

/**
 * Uncontrolled text input integrated with VoraForm via the universal
 * field contract.
 *
 * ### Uncontrolled-First Architecture
 *
 * This component renders a **native `<input>`** using `defaultValue`,
 * NOT `value`. The DOM element is the source of truth for the displayed
 * text. When the user types:
 *
 * 1. The browser updates the DOM immediately (no React involvement).
 * 2. The `onChange` handler calls `store.setSilentValue()` to sync the
 *    store without triggering a React re-render.
 * 3. React never re-renders this component on keystroke.
 *
 * The component only re-renders when:
 * - Its **error** changes (e.g., on blur validation).
 * - It is **initially mounted** (reading `defaultValue` from the store).
 *
 * ### Accessibility
 *
 * - Label is linked via `htmlFor` / `id`.
 * - Error is linked via `aria-describedby` pointing to the error element.
 * - `aria-invalid` is set when an error exists.
 * - Required indicator is both visual (`*`) and semantic (`aria-required`).
 */
export function VRText({
  name,
  label,
  placeholder,
  type = 'text',
  autoComplete,
  maxLength,
  disabled = false,
  required = false,
  className,
  id,
}: VRTextProps): React.JSX.Element {
  const field = useVoraField<string>(name);

  const inputId = id ?? name;
  const errorId = `${name}-error`;
  const hasError = !!field.error;

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      {/* ── Label ──────────────────────────────────────────────────────── */}
      {label && (
        <VRLabel htmlFor={inputId} required={required}>
          {label}
        </VRLabel>
      )}

      {/* ── Native Input (UNCONTROLLED) ───────────────────────────────── */}
      {/*
        CRITICAL: Uses `defaultValue`, NOT `value`.
        The DOM is the source of truth for the typed text.
        `ref` is bound so the store can read/write the DOM directly.
        `onChange` calls `setSilentValue` — no React re-render on keystroke.
      */}
      <input
        ref={field.ref}
        id={inputId}
        name={name}
        type={type}
        defaultValue={field.value ?? ''}
        onChange={field.onChange}
        onBlur={field.onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={maxLength}
        disabled={disabled}
        required={required}
        aria-required={required || undefined}
        aria-invalid={hasError && field.isTouched ? "true" : "false"}
        aria-describedby={hasError && field.isTouched ? errorId : undefined}
        className={`${styles.input} ${hasError && field.isTouched ? styles.inputError : ''}`}
      />

      {/* ── Inline Error ──────────────────────────────────────────────── */}
      <VRFieldError name={name} />
    </div>
  );
}
