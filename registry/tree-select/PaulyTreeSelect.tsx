'use client';

import React, { useState } from 'react';
import { usePaulyField } from '@pauly/core';
import { PaulyLabel } from '../label';
import { PaulyFieldError } from '../field-error';
import type { PaulyTreeSelectProps, TreeNode } from './types';
import styles from './PaulyTreeSelect.module.css';

const flattenValues = (node: TreeNode): string[] => {
  return [node.value, ...(node.children ? node.children.flatMap(flattenValues) : [])];
};

const isAllSelected = (node: TreeNode, selected: string[]): boolean => {
  const allVals = flattenValues(node);
  return allVals.every((v) => selected.includes(v));
};

const isSomeSelected = (node: TreeNode, selected: string[]): boolean => {
  const allVals = flattenValues(node);
  return allVals.some((v) => selected.includes(v)) && !isAllSelected(node, selected);
};

const toggleNode = (
  node: TreeNode,
  selected: string[],
  onChange: (newVals: string[]) => void
) => {
  const allVals = flattenValues(node);
  if (isAllSelected(node, selected)) {
    onChange(selected.filter((v) => !allVals.includes(v)));
  } else {
    const toAdd = allVals.filter((v) => !selected.includes(v));
    onChange([...selected, ...toAdd]);
  }
};

function TreeNodeItem({
  node,
  selectedValues,
  onChange,
  disabled,
}: {
  node: TreeNode;
  selectedValues: string[];
  onChange: (newVals: string[]) => void;
  disabled: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const checked = isAllSelected(node, selectedValues);
  const indeterminate = isSomeSelected(node, selectedValues);

  return (
    <div className={styles.treeNode}>
      <div className={`${styles.nodeContent} ${disabled ? styles.disabled : ''}`}>
        {node.children && node.children.length > 0 ? (
          <span
            className={`${styles.expandIcon} ${expanded ? styles.expanded : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        ) : (
          <span className={styles.spacer} />
        )}

        <input
          type="checkbox"
          className={styles.checkbox}
          checked={checked}
          ref={(el) => {
            if (el) el.indeterminate = indeterminate;
          }}
          onChange={() => toggleNode(node, selectedValues, onChange)}
          disabled={disabled}
        />
        <span
          className={styles.label}
          onClick={() => {
            if (!disabled) toggleNode(node, selectedValues, onChange);
          }}
        >
          {node.label}
        </span>
      </div>

      {expanded && node.children && node.children.length > 0 && (
        <div className={styles.childrenGroup}>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.value}
              node={child}
              selectedValues={selectedValues}
              onChange={onChange}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function PaulyTreeSelect({
  name,
  label,
  data,
  required = false,
  disabled = false,
  className,
  id,
}: PaulyTreeSelectProps): React.JSX.Element {
  const field = usePaulyField<string[]>(name);
  const selectedValues = field.value ?? [];
  const inputId = id ?? name;

  const handleChange = (newValues: string[]) => {
    field.setValue(newValues);
  };

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`} id={inputId}>
      {label && <PaulyLabel htmlFor={inputId} required={required}>{label}</PaulyLabel>}

      <div className={styles.treeContainer}>
        {data.length === 0 ? (
          <div style={{ padding: 8, color: '#9ca3af', fontSize: '0.875rem' }}>No data</div>
        ) : (
          data.map((node) => (
            <TreeNodeItem
              key={node.value}
              node={node}
              selectedValues={selectedValues}
              onChange={handleChange}
              disabled={disabled}
            />
          ))
        )}
      </div>

      <PaulyFieldError name={name} />
    </div>
  );
}
