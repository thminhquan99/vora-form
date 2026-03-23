'use client';

import React, { createContext, useContext } from 'react';
import { usePaulyField } from '@pauly/core';
import type {
  TableContextValue,
  RowContextValue,
  PaulyTableProps,
  PaulyTableRowProps,
  PaulyTableCellProps,
} from './types';
import styles from './PaulyTable.module.css';

// ─── Contexts ────────────────────────────────────────────────────────────────

const TableContext = createContext<TableContextValue | null>(null);
const RowContext = createContext<RowContextValue | null>(null);

function useTableContext(): TableContextValue {
  const ctx = useContext(TableContext);
  if (!ctx) {
    throw new Error(
      '[PaulyTable] <PaulyTableRow> must be used within a <PaulyTable>.'
    );
  }
  return ctx;
}

function useRowContext(): RowContextValue {
  const ctx = useContext(RowContext);
  if (!ctx) {
    throw new Error(
      '[PaulyTable] <PaulyTableCell> must be used within a <PaulyTableRow>.'
    );
  }
  return ctx;
}

// ─── PaulyTable ──────────────────────────────────────────────────────────────

/**
 * Table wrapper that subscribes to the array field to render rows.
 *
 * ### Architecture
 *
 * - Subscribes to `usePaulyField<any[]>(name)` to know the row count.
 * - Provides `TableContext` (name + rowCount) to children.
 * - Re-renders ONLY when `append()` or `remove()` modify the array.
 * - Individual cell typing does NOT trigger a table re-render
 *   because cells use independent paths like `items.0.company`.
 *
 * @example
 * ```tsx
 * <PaulyTable name="items" columns={['Company', 'Role', '']}>
 *   {items.map((_, i) => (
 *     <PaulyTableRow key={i} index={i}>
 *       <PaulyTableCell field="company">
 *         {(path) => <PaulyText name={path} label="" />}
 *       </PaulyTableCell>
 *       <PaulyTableCell field="role">
 *         {(path) => <PaulyText name={path} label="" />}
 *       </PaulyTableCell>
 *     </PaulyTableRow>
 *   ))}
 * </PaulyTable>
 * ```
 */
export function PaulyTable({
  name,
  columns,
  children,
  className,
}: PaulyTableProps): React.JSX.Element {
  const field = usePaulyField<Record<string, unknown>[]>(name);
  const items = field.value ?? [];

  const contextValue: TableContextValue = {
    name,
    rowCount: items.length,
  };

  return (
    <TableContext.Provider value={contextValue}>
      <div className={`${styles.wrapper} ${className ?? ''}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} className={styles.th}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </TableContext.Provider>
  );
}

// ─── PaulyTableRow ───────────────────────────────────────────────────────────

/**
 * Row wrapper that provides the path prefix for its cells.
 *
 * Each row computes its prefix as `${tableName}.${index}` (e.g., `items.0`).
 * Child `<PaulyTableCell>` components use this to construct full paths.
 */
export function PaulyTableRow({
  index,
  children,
  className,
}: PaulyTableRowProps): React.JSX.Element {
  const { name } = useTableContext();

  const contextValue: RowContextValue = {
    prefix: `${name}.${index}`,
    index,
  };

  return (
    <RowContext.Provider value={contextValue}>
      <tr className={`${styles.tr} ${className ?? ''}`}>{children}</tr>
    </RowContext.Provider>
  );
}

// ─── PaulyTableCell ──────────────────────────────────────────────────────────

/**
 * Cell that constructs the full field path and delegates rendering.
 *
 * Uses a **render function** pattern: the child receives the full
 * path (e.g., `items.0.company`) and returns the appropriate input.
 *
 * This lets developers use ANY PaulyForm component inside a cell:
 * ```tsx
 * <PaulyTableCell field="qty">
 *   {(path) => <PaulyText name={path} label="" type="number" />}
 * </PaulyTableCell>
 * ```
 *
 * ### Why Render Functions?
 *
 * The cell itself does NOT subscribe to usePaulyField — it only
 * constructs the path. The rendered input component (PaulyText, etc.)
 * does the subscribing. This means:
 * - The cell never re-renders from value changes.
 * - Only the input component inside it responds to its own field.
 */
export function PaulyTableCell({
  field,
  children,
  className,
}: PaulyTableCellProps): React.JSX.Element {
  const { prefix } = useRowContext();
  const fullPath = `${prefix}.${field}`;

  return (
    <td className={`${styles.td} ${className ?? ''}`}>{children(fullPath)}</td>
  );
}
