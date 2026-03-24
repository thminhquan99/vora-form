'use client';

import React, { useRef, useState, useCallback } from 'react';
import { useVoraField } from '@vora/core';
import { VRLabel } from '../label';
import { VRFieldError } from '../field-error';
import type { VRMentionsProps, VRMentionUser } from './types';
import styles from './VRMentions.module.css';

export function VRMentions({
  name,
  label,
  users,
  placeholder = 'Type @ to mention someone...',
  required = false,
  disabled = false,
  className,
  id,
}: VRMentionsProps): React.JSX.Element {
  const field = useVoraField<string>(name);
  const inputId = id ?? name;
  const errorId = `${name}-error`;
  const hasError = !!field.error;

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  
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

  const insertMention = (user: VRMentionUser) => {
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
      {label && <VRLabel htmlFor={inputId} required={required}>{label}</VRLabel>}
      
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

      <VRFieldError name={name} />
    </div>
  );
}
