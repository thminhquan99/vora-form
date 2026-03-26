'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { useVoraField, useInitialSnapshot, serializeHtmlToTemplate } from '@vora/core';
import { VRLabel } from '../label';
import { VRFieldError } from '../field-error';
import type { VoraFormulaProps, FormulaVariable } from './types';
import styles from './VRFormula.module.css';

export function VRFormula({
  name,
  label,
  required = false,
  className,
  id,
  variables,
  serializationDebounceMs = 150,
}: VoraFormulaProps): React.JSX.Element {
  const field = useVoraField<string>(name);
  const inputId = id ?? name;

  const editorRef = useRef<HTMLDivElement | null>(null);
  
  // Local UI State for Dropdown Only. Domain data stays in DOM + FormStore
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const dropdownCoords = useRef({ top: 0, left: 0 });
  const savedRange = useRef<Range | null>(null);
  const lastHtmlRef = useRef<string>('');

  // Snapshot Pattern: Initialize exactly once
  const initialValue = useInitialSnapshot(field.value);

  // ── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Converts HTML content from contenteditable back to a template string.
   * Example: <span ... data-value="v1">@Var1</span> -> {{v1}}
   * 
   * Uses robust DOM tree walking via serializeHtmlToTemplate to ensure
   * attribute order and browser-specific HTML serialization differences
   * do not corrupt the template data.
   */
  const serialize = useCallback((html: string): string => {
    return serializeHtmlToTemplate(html);
  }, []);

  /**
   * Converts a template string back to HTML for the editor.
   * Example: {{v1}} -> <span ... data-value="v1">@Var1</span>
   */
  const deserialize = useCallback((template: string): string => {
    if (!template) return '';
    
    // Replace {{var}} with the Pill HTML
    let html = template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, val) => {
      const variable = variables.find(v => v.value === val);
      const label = variable ? variable.label : val;
      
      const cleanLabel = DOMPurify.sanitize(label).replace(/"/g, '&quot;');
      const cleanValue = DOMPurify.sanitize(val).replace(/"/g, '&quot;');
      
      return `<span contenteditable="false" class="vora-pill" data-value="${cleanValue}">@${cleanLabel}</span>`;
    });

    // Strip any stray template markers that might have been pasted or corrupted
    html = html.replace(/\{\{|\}\}/g, '');

    // Convert newlines back to <br> for display
    html = html.replace(/\n/g, '<br>');

    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['span', 'br'],
      ALLOWED_ATTR: ['contenteditable', 'class', 'data-value'],
    });
  }, [variables]);

  useEffect(() => {
    if (editorRef.current && initialValue) {
      editorRef.current.innerHTML = deserialize(initialValue);
    }
  }, []);

  // FIX-1: Synchronize external value updates (e.g. formRef.setValue, reset)
  useEffect(() => {
    const isFocused = editorRef.current === document.activeElement;
    
    // Only update if:
    // 1. We have a target element
    // 2. The store value (serialized) is different from current display (serialized)
    // 3. AND the user IS NOT currently typing/focused (to avoid cursor jumps)
    if (editorRef.current && field.value !== undefined) {
      const currentContent = serialize(editorRef.current.innerHTML);
      
      // Normalize both for comparison (ignore &nbsp; vs space differences)
      const normalizedStoreValue = field.value.replace(/\u00A0/g, ' ').trim();
      const normalizedCurrentContent = currentContent.replace(/\u00A0/g, ' ').trim();

      if (normalizedStoreValue !== normalizedCurrentContent && !isFocused) {
        editorRef.current.innerHTML = deserialize(field.value);
        // FIX: Synchronize our optimization ref to avoid stale comparison on next input
        lastHtmlRef.current = editorRef.current.innerHTML;
      }
    }
  }, [field.value, serialize, deserialize]);

  const syncToStore = useCallback(() => {
    if (editorRef.current) {
      const template = serialize(editorRef.current.innerHTML);
      field.setValue(template);
    }
  }, [field, serialize]);

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
        
        return true;
      }
    }
    
    setDropdownOpen(false);
    return false;
  };

  const lastInputTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (lastInputTimer.current) {
        clearTimeout(lastInputTimer.current);
      }
    };
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      const currentHtml = editorRef.current.innerHTML;
      
      // Optimization: Skip heavy serialization if DOM content hasn't changed
      if (currentHtml === lastHtmlRef.current) return;
      lastHtmlRef.current = currentHtml;

      // ── OPTIMIZATION: Debounce heavy serialization ──────────────────────
      if (lastInputTimer.current) {
        clearTimeout(lastInputTimer.current);
      }

      lastInputTimer.current = setTimeout(() => {
        if (editorRef.current) {
          const template = serialize(editorRef.current.innerHTML);
          field.setSilentValue(template);
        }
      }, serializationDebounceMs); // Slightly longer debounce for better performance on large formulas
    }
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

    if (node.nodeType === Node.TEXT_NODE) {
      const textBeforeCursor = node.textContent?.slice(0, range.startOffset) || '';
      const triggerMatch = textBeforeCursor.match(/\{\{([a-zA-Z0-9_]*)$/);
      
      if (triggerMatch) {
        const triggerLength = triggerMatch[0].length;
        range.setStart(node, range.startOffset - triggerLength);
        range.deleteContents();
      }
    }

    // Defense in depth: Sanitize variable components before injection
    const cleanLabel = DOMPurify.sanitize(variable.label).replace(/"/g, '&quot;');
    const cleanValue = DOMPurify.sanitize(variable.value).replace(/"/g, '&quot;');
    const pillHtml = `<span contenteditable="false" class="vora-pill" data-value="${cleanValue}">@${cleanLabel}</span>`;
    
    selection.removeAllRanges();
    selection.addRange(range);

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = DOMPurify.sanitize(pillHtml, {
      ALLOWED_TAGS: ['span'],
      ALLOWED_ATTR: ['contenteditable', 'class', 'data-value'],
    });
    const pillNode = tempDiv.firstChild;
    if (pillNode) {
      range.insertNode(pillNode);
      range.setStartAfter(pillNode);
      
      const spaceNode = document.createTextNode('\u00A0');
      range.insertNode(spaceNode);
      range.setStartAfter(spaceNode);

      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    setDropdownOpen(false);
    setSearchQuery('');
    savedRange.current = null;
    syncToStore();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    // ── FIX: Robust Paste Sanitization ──────────────────────────────────
    // Strip all HTML formatting to prevent XSS and DOM corruption.
    // Contenteditable editors are notoriously prone to "rich" paste bugs.
    const text = e.clipboardData.getData('text/plain');
    const cleanText = text.replace(/\{\{/g, '').replace(/\}\}/g, ''); // Strip template markers from paste

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    range.deleteContents();
    
    const textNode = document.createTextNode(cleanText);
    range.insertNode(textNode);
    
    // Move cursor to end of pasted text
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
    
    syncToStore();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!dropdownOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev: number) => (prev + 1) % filteredVariables.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev: number) => (prev - 1 + filteredVariables.length) % filteredVariables.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredVariables[activeIndex]) {
        insertVariable(filteredVariables[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDropdownOpen(false);
    }
  };

  const filteredVariables = useMemo(() => {
    return variables.filter(v => 
      v.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
      v.value.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [variables, searchQuery]);

  const dropdownId = `${inputId}-dropdown`;

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`} id={`${inputId}-wrapper`}>
      {label && <VRLabel htmlFor={inputId} required={required}>{label}</VRLabel>}

      <div
        id={inputId}
        ref={(el) => {
          editorRef.current = el;
          field.ref(el);
        }}
        className={styles.editor}
        contentEditable={true}
        onInput={handleInput}
        onKeyUp={detectTrigger}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        data-placeholder="Type something or use {{ to insert a variable..."
        aria-label={label || 'Formula Editor'}
        // ARIA for Combobox pattern
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={dropdownOpen}
        aria-haspopup="listbox"
        aria-controls={dropdownOpen ? dropdownId : undefined}
        aria-activedescendant={dropdownOpen && filteredVariables[activeIndex] ? `${inputId}-opt-${filteredVariables[activeIndex].value}` : undefined}
      />

      {dropdownOpen && filteredVariables.length > 0 && (
        <div 
          id={dropdownId}
          className={styles.dropdown}
          role="listbox"
          aria-label="Variable suggestions"
        >
          {filteredVariables.map((variable, index) => (
            <div
              key={variable.value}
              id={`${inputId}-opt-${variable.value}`}
              className={styles.dropdownItem}
              data-active={index === activeIndex}
              role="option"
              aria-selected={index === activeIndex}
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

      <VRFieldError name={name} />
    </div>
  );
}
