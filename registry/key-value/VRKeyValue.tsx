'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useVoraField } from '@vora/core';
import { VRLabel } from '../label';
import { VRFieldError } from '../field-error';
import type { VRKeyValueProps } from './types';
import styles from './VRKeyValue.module.css';
import textStyles from '../text-input/VRText.module.css';

export function VRKeyValue({
  name,
  label,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  className,
}: VRKeyValueProps): React.JSX.Element {
  const field = useVoraField<Array<{ key: string; value: string }>>(name);

  // Mirror store value in local state
  const [rows, setRows] = useState<Array<{key: string; value: string}>>(
    () => field.value ?? []
  );

  // Track unique IDs for rows to prevent input value shifting on deletion
  const nextId = useRef(rows.length);
  const [rowIds, setRowIds] = useState<number[]>(() => rows.map((_, i) => i));

  const handleChange = (index: number, fieldName: 'key' | 'value', val: string) => {
    const next = rows.map((row, i) =>
      i === index ? { ...row, [fieldName]: val } : row
    );
    setRows(next);
    field.setValue(next); // Single write to parent path
  };

  const append = useCallback(() => {
    const next = [...rows, { key: '', value: '' }];
    setRows(next);
    field.setValue(next);
    setRowIds((curr) => [...curr, nextId.current++]);
  }, [field, rows]);

  const remove = useCallback(
    (indexToRemove: number) => {
      const next = rows.filter((_, i) => i !== indexToRemove);
      setRows(next);
      field.setValue(next);
      setRowIds((curr) => curr.filter((_, i) => i !== indexToRemove));
    },
    [field, rows]
  );

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`} id={name}>
      {label && <VRLabel htmlFor={`${name}.0.key`}>{label}</VRLabel>}

      {rows.map((row, index) => {
        // Fallback to index if rowIds isn't fully synced yet
        const rowKey = rowIds[index] ?? `fallback-${index}`;

        return (
          <div key={rowKey} className={styles.row}>
            <div className={styles.keyInput}>
              <input
                type="text"
                value={row.key}
                onChange={(e) => handleChange(index, 'key', e.target.value)}
                className={textStyles.input}
                placeholder={keyPlaceholder}
                id={`${name}.${index}.key`}
              />
            </div>
            <div className={styles.valueInput}>
              <input
                type="text"
                value={row.value}
                onChange={(e) => handleChange(index, 'value', e.target.value)}
                className={textStyles.input}
                placeholder={valuePlaceholder}
                id={`${name}.${index}.value`}
              />
            </div>
            <button
              type="button"
              className={styles.removeButton}
              onClick={() => remove(index)}
              aria-label={`Remove item at index ${index}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6M14 11v6" />
              </svg>
            </button>
          </div>
        );
      })}

      <button type="button" className={styles.addButton} onClick={append}>
        + Add Variable
      </button>

      <VRFieldError name={name} />
    </div>
  );
}
