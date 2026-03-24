'use client';

import React, { useRef } from 'react';
import { usePaulyField } from '@pauly/core';
import { PaulyLabel } from '../label';
import { PaulyFieldError } from '../field-error';
import type { PaulyCodeEditorProps } from './types';
import styles from './PaulyCodeEditor.module.css';

export function PaulyCodeEditor({
  name,
  label,
  required = false,
  className,
  id,
  language = 'text',
  placeholder = 'Write code here...',
  rows = 8,
}: PaulyCodeEditorProps): React.JSX.Element {
  const field = usePaulyField<string>(name);
  const inputId = id ?? name;
  const localRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;

      // Insert 2 spaces at cursor position
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      target.value = newValue;
      
      // Move cursor forward
      target.selectionStart = target.selectionEnd = start + 2;

      // Update FormStore (Zero Re-render from the store side)
      field.setValue(newValue);
    }
  };

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      {label && <PaulyLabel htmlFor={inputId} required={required}>{label}</PaulyLabel>}
      
      <div className={styles.editorContainer}>
        <div className={styles.header}>
          <span>{inputId}</span>
          <span className={styles.languageBadge}>{language}</span>
        </div>
        <textarea
          id={inputId}
          ref={(el) => {
            if (typeof field.ref === 'function') {
              field.ref(el);
            } else if (field.ref) {
              (field.ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
            }
            if (localRef) localRef.current = el;
          }}
          className={styles.textarea}
          placeholder={placeholder}
          defaultValue={field.value ?? ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          onKeyDown={handleKeyDown}
          rows={rows}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>

      <PaulyFieldError name={name} />
    </div>
  );
}
