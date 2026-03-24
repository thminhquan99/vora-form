'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useVoraField } from '@vora/core';
import { VRLabel } from '../label';
import { VRFieldError } from '../field-error';
import type { VRTagInputProps } from './types';
import styles from './VRTagInput.module.css';

export function VRTagInput({
  name,
  label,
  placeholder,
  required = false,
  disabled = false,
  className,
  id,
}: VRTagInputProps): React.JSX.Element {
  const field = useVoraField<string[]>(name);
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Merge the internal ref and the FormStore's ref safely
  const mergedRef = useCallback(
    (el: HTMLInputElement | null) => {
      if (inputRef) {
        (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
      }
      if (field?.ref && typeof field.ref === 'function') {
        field.ref(el);
      } else if (field?.ref && 'current' in field.ref) {
        (field.ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
      }
    },
    [field?.ref]
  );

  const inputId = id ?? name;
  const errorId = `${name}-error`;
  const hasError = !!field.error;
  const tags = Array.isArray(field.value) ? field.value : [];

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
        <VRLabel htmlFor={inputId} required={required}>
          {label}
        </VRLabel>
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

      <VRFieldError name={name} />
    </div>
  );
}
