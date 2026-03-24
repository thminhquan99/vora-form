'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePaulyField } from '@pauly/core';
import { PaulyText } from '../text-input';
import { PaulyLabel } from '../label';
import { PaulyFieldError } from '../field-error';
import type { PaulyKeyValueProps } from './types';
import styles from './PaulyKeyValue.module.css';

export function PaulyKeyValue({
  name,
  label,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  className,
}: PaulyKeyValueProps): React.JSX.Element {
  const field = usePaulyField<Array<{ key: string; value: string }>>(name);
  const items = field.value ?? [];

  // Track unique IDs for rows to prevent input value shifting on deletion
  const [rowIds, setRowIds] = useState<number[]>([]);
  const nextId = useRef(0);

  // Sync rowIds length with store array length
  useEffect(() => {
    const currentLen = items.length;
    if (rowIds.length < currentLen) {
      setRowIds((curr) => {
        const needed = currentLen - curr.length;
        return [...curr, ...Array.from({ length: needed }, () => nextId.current++)];
      });
    } else if (rowIds.length > currentLen) {
      setRowIds((curr) => curr.slice(0, currentLen));
    }
  }, [items.length]);

  const append = useCallback(() => {
    field.setValue([...items, { key: '', value: '' }]);
    setRowIds((curr) => [...curr, nextId.current++]);
  }, [field, items]);

  const remove = useCallback(
    (indexToRemove: number) => {
      const newItems = items.filter((_, i) => i !== indexToRemove);
      field.setValue(newItems);
      setRowIds((curr) => curr.filter((_, i) => i !== indexToRemove));
    },
    [field, items]
  );

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`} id={name}>
      {label && <PaulyLabel htmlFor={`${name}.0.key`}>{label}</PaulyLabel>}

      {items.map((_, index) => {
        // Fallback to index if rowIds isn't fully synced yet
        const rowKey = rowIds[index] ?? `fallback-${index}`;

        return (
          <div key={rowKey} className={styles.row}>
            <div className={styles.keyInput}>
              <PaulyText name={`${name}.${index}.key`} placeholder={keyPlaceholder} />
            </div>
            <div className={styles.valueInput}>
              <PaulyText name={`${name}.${index}.value`} placeholder={valuePlaceholder} />
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

      <PaulyFieldError name={name} />
    </div>
  );
}
