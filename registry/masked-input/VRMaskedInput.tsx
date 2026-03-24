'use client';

import React, { useCallback } from 'react';
import { useVoraField } from '@vora/core';
import { VRLabel } from '../label';
import { VRFieldError } from '../field-error';
import type { VRMaskedInputProps } from './types';
import styles from './VRMaskedInput.module.css';

/**
 * Formatted text input with native DOM cursor management.
 *
 * ### The Problem with Controlled + Formatting
 *
 * When React controls an input via `value`, setting a formatted string
 * (e.g., adding commas) causes the browser cursor to jump to the END
 * of the input. This is because React replaces the entire `.value`
 * property, losing the cursor position.
 *
 * ### Our Solution: Uncontrolled + Direct DOM Manipulation
 *
 * 1. The `<input>` is uncontrolled (`defaultValue`, not `value`).
 * 2. On every keystroke, we:
 *    a. Read the raw value and cursor position from the DOM.
 *    b. Run the `formatter` function to produce the display string.
 *    c. Write the formatted value directly to `e.target.value` (DOM).
 *    d. Calculate the new cursor position based on length difference.
 *    e. Restore the cursor via `setSelectionRange()`.
 *    f. Call `field.onChange(e)` so `setSilentValue` syncs the store.
 *
 * Result: The input formats instantly, the cursor never jumps, and
 * React never re-renders (counter stays at 1).
 */
export function VRMaskedInput({
  name,
  label,
  placeholder,
  formatter,
  disabled = false,
  required = false,
  className,
  id,
}: VRMaskedInputProps): React.JSX.Element {
  const field = useVoraField<string>(name);

  const inputId = id ?? name;
  const errorId = `${name}-error`;
  const hasError = !!field.error;

  // ── Magic onChange: format + preserve cursor ─────────────────────────────
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const rawValue = input.value;
      const cursor = input.selectionStart ?? rawValue.length;
      const beforeLength = rawValue.length;

      // Run the formatter
      const formattedValue = formatter(rawValue);

      // Write formatted value directly to the DOM
      input.value = formattedValue;

      // Calculate new cursor position:
      // If the formatter added characters (e.g., commas), shift cursor forward.
      // If it removed characters, shift cursor backward.
      const lengthDiff = formattedValue.length - beforeLength;
      const newPos = Math.max(0, cursor + lengthDiff);

      // Restore cursor position (prevents jumping to end)
      input.setSelectionRange(newPos, newPos);

      // Sync the formatted value to the store via setSilentValue
      // (field.onChange reads e.target.value which is now formatted)
      field.onChange(e);
    },
    [formatter, field]
  );

  // Format the initial value for display
  const displayValue = field.value ? formatter(field.value) : '';

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
        type="text"
        defaultValue={displayValue}
        onChange={handleChange}
        onBlur={field.onBlur}
        placeholder={placeholder}
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
