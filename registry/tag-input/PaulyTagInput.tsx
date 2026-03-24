'use client';

import React, { useState, useCallback, useRef } from 'react';
import { usePaulyField } from '@pauly/core';
import { PaulyLabel } from '../label';
import { PaulyFieldError } from '../field-error';
import type { PaulyTagInputProps } from './types';
import styles from './PaulyTagInput.module.css';

export function PaulyTagInput({
  name,
  label,
  placeholder,
  required = false,
  disabled = false,
  className,
  id,
}: PaulyTagInputProps): React.JSX.Element {
  const field = usePaulyField<string[]>(name);
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Merge the internal ref and the FormStore's ref
  const mergedRef = useCallback(
    (el: HTMLInputElement | null) => {
      (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
      if (typeof field.ref === 'function') {
        field.ref(el);
      }
    },
    [field.ref]
  );

  const inputId = id ?? name;
  const errorId = `${name}-error`;
  const hasError = !!field.error;
  const tags = field.value ?? [];

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const value = inputRef.current?.value || '';

      if (e.key === 'Enter') {
        const trimmed = value.trim();
        // ONLY prevent default and do work if there is text to add
        if (trimmed) {
          e.preventDefault();
          field.setValue([...tags, trimmed]);
          if (inputRef.current) {
            inputRef.current.value = ''; // Direct DOM clear
          }
        }
      } else if (e.key === 'Backspace' && value === '') {
        // Remove last tag if input is currently empty
        if (tags.length > 0) {
          field.setValue(tags.slice(0, -1));
        }
      }
    },
    [tags, field]
  );

  const removeTag = useCallback(
    (indexToRemove: number) => {
      field.setValue(tags.filter((_, i) => i !== indexToRemove));
      inputRef.current?.focus();
    },
    [tags, field]
  );

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      {label && (
        <PaulyLabel htmlFor={inputId} required={required}>
          {label}
        </PaulyLabel>
      )}

      <div
        className={[
          styles.inputContainer,
          isFocused ? styles.inputContainerFocus : '',
          hasError ? styles.inputContainerError : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, index) => (
          <span key={index} className={styles.tag}>
            {tag}
            <button
              type="button"
              className={styles.removeButton}
              onClick={(e) => {
                e.stopPropagation();
                removeTag(index);
              }}
              disabled={disabled}
              aria-label={`Remove ${tag}`}
            >
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor">
                <path d="M1 1L13 13M1 13L13 1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={mergedRef}
          id={inputId}
          type="text"
          className={styles.input}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            field.onBlur();
          }}
          placeholder={tags.length === 0 ? placeholder : ''}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? errorId : undefined}
        />
      </div>

      <PaulyFieldError name={name} />
    </div>
  );
}
