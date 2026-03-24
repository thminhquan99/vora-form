'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useVoraField } from '@vora/core';
import { VRLabel } from '../label';
import { VRFieldError } from '../field-error';
import type { VRPasswordInputProps } from './types';
import styles from './VRPasswordInput.module.css';

// Simple helper to calculate a 0-4 strength score
function calculateStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length > 5) score += 1;
  if (password.length > 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9!@#\$%\^\&*\)\(+=._-]/.test(password)) score += 1;
  return score;
}

const STRENGTH_COLORS = [
  'transparent',
  '#ef4444', // Red (Weak)
  '#f59e0b', // Orange (Fair)
  '#fbbf24', // Yellow (Good)
  '#10b981', // Green (Strong)
];

/**
 * Password input with strength meter and show/hide toggle.
 * 
 * Uses an uncontrolled input pattern for the password string. 
 * The strength meter updates directly via DOM reference to avoid 
 * form-wide or even field-level React re-renders while typing.
 */
export function VRPasswordInput({
  name,
  label,
  placeholder,
  showStrengthMeter = false,
  required = false,
  disabled = false,
  className,
  id,
}: VRPasswordInputProps): React.JSX.Element {
  const field = useVoraField<string>(name);
  const [showPassword, setShowPassword] = useState(false);
  const strengthBarRef = useRef<HTMLDivElement>(null);

  const inputId = id ?? name;
  const errorId = `${name}-error`;
  const hasError = !!field.error;

  const initialValue = field.value ?? '';
  const initialScore = calculateStrength(initialValue);
  const initialWidth = initialScore * 25;
  const initialColor = STRENGTH_COLORS[initialScore] ?? 'transparent';

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // 1. Let FormStore handle silent value sync
      field.onChange(e);

      // 2. Direct DOM update for strength meter (zero re-renders)
      if (showStrengthMeter && strengthBarRef.current) {
        const score = calculateStrength(e.target.value);
        const width = score * 25; // 0, 25, 50, 75, 100
        strengthBarRef.current.style.width = `${width}%`;
        strengthBarRef.current.style.backgroundColor = STRENGTH_COLORS[score] ?? 'transparent';
      }
    },
    [field, showStrengthMeter]
  );

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      {label && (
        <VRLabel htmlFor={inputId} required={required}>
          {label}
        </VRLabel>
      )}

      <div className={styles.inputWrapper}>
        <input
          ref={field.ref}
          id={inputId}
          name={name}
          type={showPassword ? 'text' : 'password'}
          defaultValue={initialValue}
          placeholder={placeholder}
          onChange={handleChange}
          onBlur={field.onBlur}
          disabled={disabled}
          required={required}
          aria-required={required || undefined}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? errorId : undefined}
          className={`${styles.input} ${hasError ? styles.inputError : ''}`}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          className={styles.toggleButton}
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
        >
          {showPassword ? (
            // Eye slash icon
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
            </svg>
          ) : (
            // Eye icon
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>

      {showStrengthMeter && (
        <div className={styles.strengthMeter} aria-hidden="true">
          <div 
            ref={strengthBarRef} 
            className={styles.strengthBar} 
            style={{ width: `${initialWidth}%`, backgroundColor: initialColor }}
          />
        </div>
      )}

      <VRFieldError name={name} />
    </div>
  );
}
