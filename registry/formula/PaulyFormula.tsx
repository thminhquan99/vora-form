'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { usePaulyField } from '@pauly/core';
import { PaulyLabel } from '../label';
import { PaulyFieldError } from '../field-error';
import type { PaulyFormulaProps, FormulaVariable } from './types';
import styles from './PaulyFormula.module.css';

export function PaulyFormula({
  name,
  label,
  required = false,
  className,
  id,
  variables,
}: PaulyFormulaProps): React.JSX.Element {
  const field = usePaulyField<string>(name);
  const inputId = id ?? name;

  const editorRef = useRef<HTMLDivElement>(null);
  
  // Local UI State for Dropdown Only. Domain data stays in DOM + FormStore
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const dropdownCoords = useRef({ top: 0, left: 0 });
  const savedRange = useRef<Range | null>(null);

  // Snapshot Pattern: Initialize exactly once
  const initialValueRef = useRef(field.value);

  useEffect(() => {
    if (editorRef.current && initialValueRef.current) {
      editorRef.current.innerHTML = initialValueRef.current;
    }
  }, []);

  const syncToStore = useCallback(() => {
    if (editorRef.current) {
      field.setValue(editorRef.current.innerHTML);
    }
  }, [field]);

  const detectTrigger = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const node = range.startContainer;

    // Check if we are inside a text node
    if (node.nodeType === Node.TEXT_NODE) {
      const textBeforeCursor = node.textContent?.slice(0, range.startOffset) || '';
      
      // Look for "{{" match
      const triggerMatch = textBeforeCursor.match(/\{\{([a-zA-Z0-9_]*)$/);
      
      if (triggerMatch) {
        savedRange.current = range.cloneRange();
        setSearchQuery(triggerMatch[1] || '');
        setDropdownOpen(true);
        setActiveIndex(0);
        
        // Approximate coordinates (for a perfect Notion clone you'd get the bounding rect of the Range)
        // MVP: Just drop it below the editor for now, CSS handles position: absolute below wrapper.
        return true;
      }
    }
    
    setDropdownOpen(false);
    return false;
  };

  const handleInput = () => {
    syncToStore();
    detectTrigger();
  };

  const insertVariable = (variable: FormulaVariable) => {
    if (!editorRef.current || !savedRange.current) return;
    
    editorRef.current.focus();
    const selection = window.getSelection();
    if (!selection) return;

    // Use our saved range
    const range = savedRange.current;
    const node = range.startContainer;

    // First delete the trigger sequence "{{..."
    // Because we know we are actively typing it, we can modify the text node directly
    if (node.nodeType === Node.TEXT_NODE) {
      const textBeforeCursor = node.textContent?.slice(0, range.startOffset) || '';
      const triggerMatch = textBeforeCursor.match(/\{\{([a-zA-Z0-9_]*)$/);
      
      if (triggerMatch) {
        const triggerLength = triggerMatch[0].length;
        range.setStart(node, range.startOffset - triggerLength);
        range.deleteContents();
      }
    }

    // Insert the Pill HTML natively
    const pillHtml = `<span contenteditable="false" class="pauly-pill" data-value="${variable.value}">@${variable.label}</span>&nbsp;`;
    
    // Restore selection to the modified range
    selection.removeAllRanges();
    selection.addRange(range);
    
    document.execCommand('insertHTML', false, pillHtml);

    setDropdownOpen(false);
    setSearchQuery('');
    savedRange.current = null;
    syncToStore();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!dropdownOpen) return;

    const filteredVars = variables.filter(v => 
      v.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
      v.value.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev: number) => (prev + 1) % filteredVars.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev: number) => (prev - 1 + filteredVars.length) % filteredVars.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredVars[activeIndex]) {
        insertVariable(filteredVars[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDropdownOpen(false);
    }
  };

  const filteredVariables = variables.filter(v => 
    v.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
    v.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`} id={`${inputId}-wrapper`} ref={field.ref}>
      {label && <PaulyLabel htmlFor={inputId} required={required}>{label}</PaulyLabel>}

      <div
        id={inputId}
        ref={editorRef}
        className={styles.editor}
        contentEditable={true}
        onInput={handleInput}
        onKeyUp={detectTrigger}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        data-placeholder="Type something or use {{ to insert a variable..."
        aria-label={label || 'Formula Editor'}
      />

      {dropdownOpen && filteredVariables.length > 0 && (
        <div className={styles.dropdown}>
          {filteredVariables.map((variable, index) => (
            <div
              key={variable.value}
              className={styles.dropdownItem}
              data-active={index === activeIndex}
              onMouseDown={(e) => {
                // Prevent onBlur clearing selection range before onClick fires
                e.preventDefault(); 
                insertVariable(variable);
              }}
            >
              <span className={styles.itemLabel}>{variable.label}</span>
              <span className={styles.itemDesc}>{variable.value}</span>
            </div>
          ))}
        </div>
      )}

      <PaulyFieldError name={name} />
    </div>
  );
}
