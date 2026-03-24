'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useVoraField } from '@vora/core';
import { VRLabel } from '../label';
import { VRFieldError } from '../field-error';
import type { VRComboboxProps } from './types';
import styles from './VRCombobox.module.css';

/**
 * Searchable dropdown (combobox) integrated with VoraForm.
 *
 * ### Composite Widget
 *
 * This is a composite widget — it commits the selected option's
 * `value` string via `field.setValue()`, triggering a re-render
 * of **this component only** so it can display the selected label.
 *
 * ### Local vs Store State (Crucial Distinction)
 *
 * | State        | Owner       | Why                                      |
 * |-------------|-------------|------------------------------------------|
 * | Selected val | FormStore   | Domain data — submitted with the form    |
 * | isOpen       | React state | UI-only — opening dropdown ≠ form change |
 * | searchTerm   | React state | UI-only — filtering ≠ form change        |
 *
 * Local `useState` for `isOpen` and `searchTerm` is correct because
 * these are transient UI states that don't affect form data until an
 * option is actually clicked.
 *
 * ### Re-render Contract
 *
 * | Action               | This component | Sibling fields |
 * |---------------------|---------------|----------------|
 * | Open/close dropdown  | ✔ (local)     | 0              |
 * | Type in search       | ✔ (local)     | 0              |
 * | Select an option     | ✔ (setValue)  | 0              |
 */
export function VRCombobox({
  name,
  label,
  options,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyText = 'No results found.',
  disabled = false,
  required = false,
  className,
  id,
}: VRComboboxProps): React.JSX.Element {
  const field = useVoraField<string>(name);

  // ── Local UI state (NOT form data) ────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(-1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const inputId = id ?? name;
  const listboxId = `${name}-listbox`;
  const errorId = `${name}-error`;
  const hasError = !!field.error;

  // ── Merge field.ref with local wrapper ref ────────────────────────
  const mergedRef = useCallback(
    (el: HTMLDivElement | null) => {
      (wrapperRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      if (typeof field.ref === 'function') {
        field.ref(el as HTMLElement | null);
      }
    },
    [field.ref]
  );

  // ── Derived: selected label + filtered options ────────────────────
  const selectedLabel = options.find((o) => o.value === field.value)?.label;

  const filtered = searchTerm
    ? options.filter((o) =>
        o.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  // ── Toggle dropdown ───────────────────────────────────────────────
  const open = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    setSearchTerm('');
    setHighlightIdx(-1);
    // Focus search input after dropdown opens
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [disabled]);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearchTerm('');
    setHighlightIdx(-1);
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) close();
    else open();
  }, [isOpen, close, open]);

  // ── Select an option ──────────────────────────────────────────────
  const selectOption = useCallback(
    (value: string) => {
      field.setValue(value);
      close();
    },
    [field, close]
  );

  // ── Click-outside handler ─────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, close]);

  // ── Keyboard navigation ───────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightIdx((prev) =>
            prev < filtered.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightIdx((prev) =>
            prev > 0 ? prev - 1 : filtered.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightIdx >= 0 && highlightIdx < filtered.length) {
            selectOption(filtered[highlightIdx].value);
          }
          break;
        case 'Escape':
          e.preventDefault();
          close();
          break;
      }
    },
    [isOpen, open, close, filtered, highlightIdx, selectOption]
  );

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIdx < 0 || !listRef.current) return;
    const items = listRef.current.children;
    if (items[highlightIdx]) {
      (items[highlightIdx] as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIdx]);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div
      ref={mergedRef}
      className={`${styles.wrapper} ${className ?? ''}`}
      onKeyDown={handleKeyDown}
    >
      <VRLabel htmlFor={inputId} required={required}>
        {label}
      </VRLabel>

      {/* Toggle button */}
      <button
        id={inputId}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? listboxId : undefined}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : undefined}
        onClick={toggle}
        disabled={disabled}
        className={`${styles.trigger} ${hasError ? styles.triggerError : ''} ${
          isOpen ? styles.triggerOpen : ''
        }`}
      >
        <span className={selectedLabel ? styles.selectedText : styles.placeholder}>
          {selectedLabel ?? placeholder}
        </span>
        <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>
          ▾
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={styles.dropdown} role="presentation">
          {/* Search input */}
          <div className={styles.searchWrap}>
            <input
              ref={searchInputRef}
              type="text"
              className={styles.searchInput}
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setHighlightIdx(-1);
              }}
              aria-label="Search options"
              autoComplete="off"
            />
          </div>

          {/* Options list */}
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            className={styles.optionsList}
          >
            {filtered.length === 0 ? (
              <li className={styles.empty}>{emptyText}</li>
            ) : (
              filtered.map((option, idx) => {
                const isSelected = option.value === field.value;
                const isHighlighted = idx === highlightIdx;
                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    className={`${styles.option} ${
                      isSelected ? styles.optionSelected : ''
                    } ${isHighlighted ? styles.optionHighlighted : ''}`}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    onClick={() => selectOption(option.value)}
                  >
                    <span>{option.label}</span>
                    {isSelected && <span className={styles.check}>✓</span>}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      <VRFieldError name={name} />
    </div>
  );
}
