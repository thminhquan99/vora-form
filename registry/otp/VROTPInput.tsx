'use client';

import React, { useCallback, useRef } from 'react';
import { useVoraField } from '@vora/core';
import { VRLabel } from '../label';
import { VRFieldError } from '../field-error';
import type { VROTPInputProps } from './types';
import styles from './VROTPInput.module.css';

/**
 * OTP (One-Time-Password) input with auto-focus management.
 *
 * ### Architecture
 *
 * - Renders `length` individual `<input maxLength={1}>` boxes.
 * - Stores the **entire OTP string** (e.g., "123456") under a single
 *   field `name` in the FormStore — NOT as individual fields.
 * - Focus auto-advances on digit entry and auto-retreats on backspace.
 * - Paste is intercepted and distributed across all boxes.
 * - All DOM manipulation is direct — zero React re-renders on typing.
 */
export function VROTPInput({
  name,
  label,
  length = 6,
  disabled = false,
  required = false,
  className,
  id,
}: VROTPInputProps): React.JSX.Element {
  const field = useVoraField<string>(name);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const inputId = id ?? name;
  const errorId = `${name}-error`;
  const hasError = !!field.error;

  // Current stored value, split into characters for initial render
  const currentChars = (field.value ?? '').split('');

  // ── Collect full string from DOM boxes ──────────────────────────────────
  const collectValue = useCallback((): string => {
    return inputsRef.current
      .map((el) => el?.value ?? '')
      .join('');
  }, []);

  // ── Sync to store silently ──────────────────────────────────────────────
  const syncToStore = useCallback(() => {
    const fullValue = collectValue();
    field.setValue(fullValue);
  }, [collectValue, field]);

  // ── onInput: type a digit → advance focus ───────────────────────────────
  const handleInput = useCallback(
    (index: number) => (e: React.FormEvent<HTMLInputElement>) => {
      const input = e.currentTarget;
      // Keep only last digit typed (handles overwrite)
      const char = input.value.slice(-1);
      input.value = char;

      syncToStore();

      // Advance focus to next box
      if (char && index < length - 1) {
        inputsRef.current[index + 1]?.focus();
      }
    },
    [length, syncToStore]
  );

  // ── onKeyDown: backspace → retreat focus ────────────────────────────────
  const handleKeyDown = useCallback(
    (index: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        const input = inputsRef.current[index];
        if (input && !input.value && index > 0) {
          // Current box is empty — move to previous and clear it
          const prev = inputsRef.current[index - 1];
          if (prev) {
            prev.value = '';
            prev.focus();
          }
          syncToStore();
        }
      }
    },
    [syncToStore]
  );

  // ── onPaste: distribute pasted text across boxes ────────────────────────
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData
        .getData('text')
        .replace(/\D/g, '')
        .slice(0, length);

      for (let i = 0; i < length; i++) {
        const el = inputsRef.current[i];
        if (el) {
          el.value = pasted[i] ?? '';
        }
      }

      syncToStore();

      // Focus the next empty box, or the last box
      const focusIndex = Math.min(pasted.length, length - 1);
      inputsRef.current[focusIndex]?.focus();
    },
    [length, syncToStore]
  );

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      {label && (
        <VRLabel htmlFor={`${inputId}-0`} required={required}>
          {label}
        </VRLabel>
      )}

      <div className={styles.boxRow} ref={field.ref}>
        {Array.from({ length }, (_, i) => {
          const isFilled = !!(currentChars[i] || inputsRef.current[i]?.value);
          return (
            <input
              key={i}
              ref={(el) => { inputsRef.current[i] = el; }}
              id={i === 0 ? `${inputId}-0` : undefined}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              defaultValue={currentChars[i] ?? ''}
              onInput={handleInput(i)}
              onKeyDown={handleKeyDown(i)}
              onPaste={i === 0 ? handlePaste : undefined}
              onBlur={i === length - 1 ? field.onBlur : undefined}
              disabled={disabled}
              required={required && i === 0}
              aria-label={`Digit ${i + 1}`}
              aria-invalid={hasError || undefined}
              aria-describedby={hasError && i === 0 ? errorId : undefined}
              className={[
                styles.box,
                isFilled ? styles.boxFilled : '',
                hasError ? styles.boxError : '',
              ]
                .filter(Boolean)
                .join(' ')}
              autoComplete="one-time-code"
            />
          );
        })}
      </div>

      <VRFieldError name={name} />
    </div>
  );
}
