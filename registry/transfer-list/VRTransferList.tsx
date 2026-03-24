'use client';

import React, { useState, useMemo } from 'react';
import { useVoraField } from '@vora/core';
import { VRLabel } from '../label';
import { VRFieldError } from '../field-error';
import type { VRTransferListProps } from './types';
import styles from './VRTransferList.module.css';

export function VRTransferList({
  name,
  label,
  options,
  leftTitle = 'Available',
  rightTitle = 'Selected',
  required = false,
  disabled = false,
  className,
  id,
}: VRTransferListProps): React.JSX.Element {
  const field = useVoraField<string[]>(name);
  const inputId = id ?? name;
  
  const [checkedLeft, setCheckedLeft] = useState<string[]>([]);
  const [checkedRight, setCheckedRight] = useState<string[]>([]);

  const selectedValues = field.value ?? [];

  const availableOptions = useMemo(
    () => options.filter((opt) => !selectedValues.includes(opt.value)),
    [options, selectedValues]
  );

  const selectedOptions = useMemo(
    () => options.filter((opt) => selectedValues.includes(opt.value)),
    [options, selectedValues]
  );

  const handleToggleLeft = (value: string) => {
    setCheckedLeft((curr) =>
      curr.includes(value) ? curr.filter((v) => v !== value) : [...curr, value]
    );
  };

  const handleToggleRight = (value: string) => {
    setCheckedRight((curr) =>
      curr.includes(value) ? curr.filter((v) => v !== value) : [...curr, value]
    );
  };

  const moveRight = () => {
    field.setValue([...selectedValues, ...checkedLeft]);
    setCheckedLeft([]);
  };

  const moveLeft = () => {
    field.setValue(selectedValues.filter((v) => !checkedRight.includes(v)));
    setCheckedRight([]);
  };

  const moveAllRight = () => {
    field.setValue(options.map((o) => o.value));
    setCheckedLeft([]);
  };

  const moveAllLeft = () => {
    field.setValue([]);
    setCheckedRight([]);
  };

  const renderList = (
    title: string,
    items: { label: string; value: string }[],
    checkedItems: string[],
    toggleFn: (val: string) => void
  ) => (
    <div className={`${styles.listPanel} ${disabled ? styles.listPanelDisabled : ''}`}>
      <div className={styles.listPanelHeader}>
        <span>{title}</span>
        <span>{items.length}</span>
      </div>
      <div className={styles.listContent}>
        {items.length === 0 ? (
          <div className={styles.emptyMessage}>Empty list</div>
        ) : (
          items.map((item) => (
            <label key={item.value} className={styles.listItem}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={checkedItems.includes(item.value)}
                onChange={() => toggleFn(item.value)}
                disabled={disabled}
              />
              <span>{item.label}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`} id={inputId}>
      {label && <VRLabel htmlFor={inputId} required={required}>{label}</VRLabel>}

      <div className={styles.container}>
        {renderList(leftTitle, availableOptions, checkedLeft, handleToggleLeft)}

        <div className={styles.controls}>
          <button
            type="button"
            className={styles.controlButton}
            onClick={moveAllRight}
            disabled={disabled || availableOptions.length === 0}
            aria-label="Move all right"
          >
            {'>>'}
          </button>
          <button
            type="button"
            className={styles.controlButton}
            onClick={moveRight}
            disabled={disabled || checkedLeft.length === 0}
            aria-label="Move selected right"
          >
            {'>'}
          </button>
          <button
            type="button"
            className={styles.controlButton}
            onClick={moveLeft}
            disabled={disabled || checkedRight.length === 0}
            aria-label="Move selected left"
          >
            {'<'}
          </button>
          <button
            type="button"
            className={styles.controlButton}
            onClick={moveAllLeft}
            disabled={disabled || selectedOptions.length === 0}
            aria-label="Move all left"
          >
            {'<<'}
          </button>
        </div>

        {renderList(rightTitle, selectedOptions, checkedRight, handleToggleRight)}
      </div>

      <VRFieldError name={name} />
    </div>
  );
}
