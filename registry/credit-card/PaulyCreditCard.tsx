'use client';

import React, { useRef, useCallback } from 'react';
import { usePaulyField } from '@pauly/core';
import { PaulyLabel } from '../label';
import { PaulyFieldError } from '../field-error';
import type { PaulyCreditCardProps } from './types';
import styles from './PaulyCreditCard.module.css';

const formatCC = (val: string) => {
  const digits = val.replace(/\D/g, '');
  if (digits.startsWith('34') || digits.startsWith('37')) {
    // Amex: 4-6-5
    const p1 = digits.substring(0, 4);
    const p2 = digits.substring(4, 10);
    const p3 = digits.substring(10, 15);
    return [p1, p2, p3].filter(Boolean).join(' ');
  } else {
    // Default: 4-4-4-4
    const chunks = [];
    for (let i = 0; i < digits.length && i < 16; i += 4) {
      chunks.push(digits.substring(i, i + 4));
    }
    return chunks.join(' ');
  }
};

export function PaulyCreditCard({
  name,
  label,
  placeholder = '0000 0000 0000 0000',
  required = false,
  disabled = false,
  className,
  id,
}: PaulyCreditCardProps): React.JSX.Element {
  const field = usePaulyField<string>(name);
  const inputId = id ?? name;
  const errorId = `${name}-error`;
  const hasError = !!field.error;

  const inputRef = useRef<HTMLInputElement>(null);

  const mergedRef = useCallback(
    (el: HTMLInputElement | null) => {
      inputRef.current = el;
      if (typeof field.ref === 'function') field.ref(el);
    },
    [field.ref]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const originalVal = input.value;
      const cursor = input.selectionStart || 0;

      const formatted = formatCC(originalVal);

      // Calculate new cursor
      let nonDigitsBeforeCursor = 0;
      for (let i = 0; i < cursor; i++) {
        if (!/\d/.test(originalVal[i])) nonDigitsBeforeCursor++;
      }
      const digitGoal = cursor - nonDigitsBeforeCursor;

      let newCursor = 0;
      let digitsPassed = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (digitsPassed === digitGoal) break;
        if (/\d/.test(formatted[i])) digitsPassed++;
        newCursor++;
      }

      input.value = formatted;
      input.setSelectionRange(newCursor, newCursor);

      field.onChange(e); 
    },
    [field]
  );

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      {label && (
        <PaulyLabel htmlFor={inputId} required={required}>
          {label}
        </PaulyLabel>
      )}
      <div className={styles.inputWrapper}>
        <svg
          className={styles.icon}
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
          <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
        <input
          ref={mergedRef}
          id={inputId}
          type="text"
          className={`${styles.input} ${hasError ? styles.inputError : ''}`}
          defaultValue={field.value ?? ''}
          onChange={handleChange}
          onBlur={field.onBlur}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? errorId : undefined}
          inputMode="numeric"
          autoComplete="cc-number"
        />
      </div>
      <PaulyFieldError name={name} />
    </div>
  );
}
