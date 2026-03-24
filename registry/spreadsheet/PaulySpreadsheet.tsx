'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { usePaulyField } from '@pauly/core';
import { PaulyLabel } from '../label';
import { PaulyFieldError } from '../field-error';
import type { PaulySpreadsheetProps } from './types';
import styles from './PaulySpreadsheet.module.css';

export function PaulySpreadsheet({
  name,
  label,
  required = false,
  className,
  id,
  rows,
  cols,
}: PaulySpreadsheetProps): React.JSX.Element {
  const field = usePaulyField<string[][]>(name);
  const inputId = id ?? name;

  // Snapshot Pattern: Initialize exactly once
  const initialValueRef = useRef(field.value);

  // Local mutable domain state bridging bypasses React rendering entirely
  const matrixRef = useRef<string[][]>(Array.from({ length: rows }, () => Array(cols).fill('')));

  // Read snapshot exactly once on mount
  useEffect(() => {
    const initData = initialValueRef.current;
    if (initData && Array.isArray(initData)) {
      for (let r = 0; r < Math.min(rows, initData.length); r++) {
        if (!initData[r]) continue;
        for (let c = 0; c < Math.min(cols, initData[r].length); c++) {
          matrixRef.current[r][c] = initData[r][c] || '';
        }
      }
    }
  }, [rows, cols]);

  // Synchronize completely mutably across DOM and FormStore
  const syncToStore = useCallback(() => {
    // We deep clone matrixRef.current to create a new array ref for `store.setValue` to trigger correct proxy diffs
    const snapshot = matrixRef.current.map((row: string[]) => [...row]);
    field.setValue(snapshot);
  }, [field]);

  const handleInput = (r: number, c: number, value: string) => {
    matrixRef.current[r][c] = value;
    syncToStore();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      let nextR = r;
      let nextC = c;

      if (e.key === 'ArrowUp') nextR = Math.max(0, r - 1);
      if (e.key === 'ArrowDown') nextR = Math.min(rows - 1, r + 1);
      if (e.key === 'ArrowLeft') {
        if (e.currentTarget.selectionStart !== 0) return;
        nextC = Math.max(0, c - 1);
      }
      if (e.key === 'ArrowRight') {
        if (e.currentTarget.selectionEnd !== e.currentTarget.value.length) return;
        nextC = Math.min(cols - 1, c + 1);
      }

      if (nextR !== r || nextC !== c) {
        e.preventDefault();
        const targetId = `${inputId}-cell-${nextR}-${nextC}`;
        const el = document.getElementById(targetId) as HTMLInputElement;
        if (el) {
          el.focus();
          // Wait till next tick to avoid arrow shifting cursor to front of text
          setTimeout(() => el.select(), 0);
        }
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, startR: number, startC: number) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    if (!text) return;

    // Excel copies data as tab/newline delimited text
    const pasteRows = text.split(/\r?\n/);
    
    // Track bounds mapping for the subset array applied
    const maxR = Math.min(rows, startR + pasteRows.length);
    
    for (let r = startR; r < maxR; r++) {
      const pasteRowIdx = r - startR;
      const pasteCols = pasteRows[pasteRowIdx].split('\t');
      
      const maxC = Math.min(cols, startC + pasteCols.length);
      
      for (let c = startC; c < maxC; c++) {
        const pasteColIdx = c - startC;
        const mappedValue = pasteCols[pasteColIdx] || '';
        
        matrixRef.current[r][c] = mappedValue;
        
        // Dom sync directly
        const targetId = `${inputId}-cell-${r}-${c}`;
        const el = document.getElementById(targetId) as HTMLInputElement;
        if (el) el.value = mappedValue;
      }
    }
    
    syncToStore();
  };

  // Pre-generate grid array to map cleanly
  const gridRows = Array.from({ length: rows }, (_, i) => i);
  const gridCols = Array.from({ length: cols }, (_, i) => i);

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`} id={inputId} ref={field.ref}>
      {label && <PaulyLabel htmlFor={`${inputId}-cell-0-0`} required={required}>{label}</PaulyLabel>}

      <div className={styles.tableContainer}>
        <div 
          className={styles.table} 
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {gridRows.map(r => (
            gridCols.map(c => (
              <div key={`${r}-${c}`} className={styles.cell}>
                <input
                  id={`${inputId}-cell-${r}-${c}`}
                  type="text"
                  className={styles.input}
                  onInput={(e) => handleInput(r, c, e.currentTarget.value)}
                  onKeyDown={(e) => handleKeyDown(e, r, c)}
                  onPaste={(e) => handlePaste(e, r, c)}
                  // Uncontrolled natively
                  defaultValue={initialValueRef.current?.[r]?.[c] || ''}
                  aria-label={`Cell ${r}, ${c}`}
                />
              </div>
            ))
          ))}
        </div>
      </div>

      <PaulyFieldError name={name} />
    </div>
  );
}
