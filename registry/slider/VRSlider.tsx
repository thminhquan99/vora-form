'use client';

import React, { useCallback, useRef, useState } from 'react';
import { useVoraField } from '@vora/core';
import { VRLabel } from '../label';
import { VRFieldError } from '../field-error';
import type { VRSliderProps } from './types';
import styles from './VRSlider.module.css';

/**
 * Native range slider integrated with VoraForm.
 *
 * ### How It Works
 *
 * 1. Renders an uncontrolled `<input type="range">` with `defaultValue`.
 * 2. `onChange` calls `field.onChange(e)` → `setSilentValue(name, Number(value))`.
 *    The `useVoraField` hook automatically converts range values to numbers.
 * 3. The numeric value display is updated via a local ref to avoid React
 *    re-renders on every slider drag.
 *
 * ### Re-render Contract
 *
 * Dragging the slider does NOT trigger a React re-render. The counter
 * stays at 1. The value badge updates via direct DOM manipulation.
 */
export function VRSlider({
  name,
  label,
  min = 0,
  max = 100,
  step = 1,
  showValue = true,
  disabled = false,
  required = false,
  className,
  id,
}: VRSliderProps): React.JSX.Element {
  const field = useVoraField<number>(name);

  const inputId = id ?? name;
  const errorId = `${name}-error`;
  const hasError = !!field.error;

  // Direct DOM ref for the value display — avoids React re-renders on drag
  const valueDisplayRef = useRef<HTMLSpanElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Update the value badge via DOM (zero re-renders)
      if (valueDisplayRef.current) {
        valueDisplayRef.current.textContent = e.target.value;
      }
      // Sync to store (setSilentValue with Number conversion)
      field.onChange(e);
    },
    [field]
  );

  const initialValue = field.value ?? min;

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      {label && (
        <VRLabel htmlFor={inputId} required={required}>
          {label}
        </VRLabel>
      )}

      <div className={styles.sliderRow}>
        <input
          ref={field.ref}
          id={inputId}
          name={name}
          type="range"
          defaultValue={initialValue}
          min={min}
          max={max}
          step={step}
          onChange={handleChange}
          onBlur={field.onBlur}
          disabled={disabled}
          required={required}
          aria-required={required || undefined}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? errorId : undefined}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={initialValue}
          className={`${styles.input} ${hasError ? styles.inputError : ''}`}
        />

        {showValue && (
          <span ref={valueDisplayRef} className={styles.valueDisplay}>
            {initialValue}
          </span>
        )}
      </div>

      <VRFieldError name={name} />
    </div>
  );
}
