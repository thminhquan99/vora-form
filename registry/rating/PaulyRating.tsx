'use client';

import React, { useCallback, useState } from 'react';
import { usePaulyField } from '@pauly/core';
import { PaulyLabel } from '../label';
import { PaulyFieldError } from '../field-error';
import type { PaulyRatingProps } from './types';
import styles from './PaulyRating.module.css';

/**
 * Star rating component with hover preview.
 *
 * ### State Separation
 *
 * - **Domain value** (selected rating): Stored in FormStore via
 *   `field.setValue(n)`. Triggers a re-render to update filled stars.
 * - **UI state** (hover preview): Local `useState`. Only affects which
 *   stars appear highlighted on hover — no form data changes, no
 *   sibling re-renders.
 *
 * ### Accessibility
 *
 * Each star is a `<button>` with `aria-label`, keyboard-focusable,
 * and responds to Enter/Space for selection.
 */
export function PaulyRating({
  name,
  label,
  max = 5,
  disabled = false,
  required = false,
  className,
  id,
}: PaulyRatingProps): React.JSX.Element {
  const field = usePaulyField<number>(name);
  const [hoverValue, setHoverValue] = useState(0);

  const inputId = id ?? name;
  const errorId = `${name}-error`;
  const hasError = !!field.error;

  const selectedValue = field.value ?? 0;
  // Show hover preview, fallback to selected value
  const displayValue = hoverValue || selectedValue;

  const handleClick = useCallback(
    (starIndex: number) => {
      field.setValue(starIndex);
    },
    [field]
  );

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`} ref={field.ref}>
      {label && (
        <PaulyLabel htmlFor={`${inputId}-star-1`} required={required}>
          {label}
        </PaulyLabel>
      )}

      <div
        className={styles.starRow}
        role="radiogroup"
        aria-label={label ?? 'Rating'}
        onMouseLeave={() => setHoverValue(0)}
      >
        {Array.from({ length: max }, (_, i) => {
          const starValue = i + 1;
          const isFilled = starValue <= displayValue;
          const isHovered = hoverValue > 0 && starValue <= hoverValue;

          return (
            <button
              key={starValue}
              type="button"
              id={starValue === 1 ? `${inputId}-star-1` : undefined}
              className={styles.star}
              onClick={() => handleClick(starValue)}
              onMouseEnter={() => setHoverValue(starValue)}
              disabled={disabled}
              role="radio"
              aria-checked={starValue === selectedValue}
              aria-label={`${starValue} star${starValue > 1 ? 's' : ''}`}
            >
              <svg
                viewBox="0 0 24 24"
                className={[
                  styles.starIcon,
                  isHovered
                    ? styles.starHovered
                    : isFilled
                      ? styles.starFilled
                      : styles.starEmpty,
                ].join(' ')}
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
              </svg>
            </button>
          );
        })}
        {selectedValue > 0 && (
          <span className={styles.valueLabel}>{selectedValue}/{max}</span>
        )}
      </div>

      <PaulyFieldError name={name} />
    </div>
  );
}
