'use client';

import React, { useRef, useState, useCallback } from 'react';
import { usePaulyField } from '@pauly/core';
import { PaulyLabel } from '../label';
import { PaulyFieldError } from '../field-error';
import type { PaulyMentionsProps, PaulyMentionUser } from './types';
import styles from './PaulyMentions.module.css';

export function PaulyMentions({
  name,
  label,
  users,
  placeholder = 'Type @ to mention someone...',
  required = false,
  disabled = false,
  className,
  id,
}: PaulyMentionsProps): React.JSX.Element {
  const field = usePaulyField<string>(name);
  const inputId = id ?? name;
  const errorId = `${name}-error`;
  const hasError = !!field.error;

  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Local React State for the Mention Dropdown UI only
  const [dropdownPos, setDropdownPos] = useState<{ start: number, search: string } | null>(null);

  const mergedRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      inputRef.current = el;
      if (typeof field.ref === 'function') field.ref(el);
    },
    [field.ref]
  );

  const handleInput = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    
    const cursor = input.selectionStart;
    const textBeforeCursor = input.value.substring(0, cursor);
    
    // Look for @ followed by word characters right before the cursor
    const match = textBeforeCursor.match(/@(\w*)$/);
    if (match) {
      setDropdownPos({
        start: cursor - match[0].length, // index of the @ symbol
        search: match[1],
      });
    } else {
      setDropdownPos(null);
    }

    // Still sync the uncontrolled value to the domain store silently
    field.onChange({ target: input } as any);
  }, [field]);

  const insertMention = (user: PaulyMentionUser) => {
    if (!inputRef.current || !dropdownPos) return;
    const input = inputRef.current;
    const text = input.value;
    
    const beforeMention = text.substring(0, dropdownPos.start);
    const afterMention = text.substring(input.selectionStart);
    
    const mentionText = `@${user.name} `;
    const newText = beforeMention + mentionText + afterMention;
    
    input.value = newText;
    
    // Move cursor right after the newly inserted mention
    const newCursorPos = dropdownPos.start + mentionText.length;
    input.setSelectionRange(newCursorPos, newCursorPos);
    input.focus();
    
    field.setValue(newText);
    setDropdownPos(null);
  };

  const filteredUsers = dropdownPos 
    ? users.filter(u => u.name.toLowerCase().includes(dropdownPos.search.toLowerCase()))
    : [];

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      {label && <PaulyLabel htmlFor={inputId} required={required}>{label}</PaulyLabel>}
      
      <textarea
        ref={mergedRef}
        id={inputId}
        className={styles.textarea}
        defaultValue={field.value ?? ''}
        onInput={handleInput}
        onBlur={() => {
          // Delay clearing dropdown so clicks on items register first
          setTimeout(() => setDropdownPos(null), 150);
          field.onBlur();
        }}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : undefined}
      />

      {dropdownPos && filteredUsers.length > 0 && (
        <div className={styles.dropdown}>
          {filteredUsers.map(u => (
            <button
              key={u.id}
              type="button"
              className={styles.dropdownItem}
              onMouseDown={(e) => {
                // Prevent input blur before click registers
                e.preventDefault();
                insertMention(u);
              }}
            >
              {u.name}
            </button>
          ))}
        </div>
      )}

      <PaulyFieldError name={name} />
    </div>
  );
}
