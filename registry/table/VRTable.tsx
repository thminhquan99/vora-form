'use client';

import React, { createContext, useContext } from 'react';
import { useVoraField } from '@vora/core';
import type {
  TableContextValue,
  RowContextValue,
  VRTableProps,
  VRTableRowProps,
  VRTableCellProps,
} from './types';
import styles from './VRTable.module.css';

// ─── Contexts ────────────────────────────────────────────────────────────────

const TableContext = createContext<TableContextValue | null>(null);
const RowContext = createContext<RowContextValue | null>(null);

function useTableContext(): TableContextValue {
  const ctx = useContext(TableContext);
  if (!ctx) {
    throw new Error(
      '[VRTable] <VRTableRow> must be used within a <VRTable>.'
    );
  }
  return ctx;
}

function useRowContext(): RowContextValue {
  const ctx = useContext(RowContext);
  if (!ctx) {
    throw new Error(
      '[VRTable] <VRTableCell> must be used within a <VRTableRow>.'
    );
  }
  return ctx;
}

// ─── VRTable ──────────────────────────────────────────────────────────────

/**
 * Table wrapper that subscribes to the array field to render rows.
 *
 * ### Architecture
 *
 * - Subscribes to `useVoraField<any[]>(name)` to know the row count.
 * - Provides `TableContext` (name + rowCount) to children.
 * - Re-renders ONLY when `append()` or `remove()` modify the array.
 * - Individual cell typing does NOT trigger a table re-render
 *   because cells use independent paths like `items.0.company`.
 *
 * @example
 * ```tsx
 * <VRTable name="items" columns={['Company', 'Role', '']}>
 *   {items.map((_, i) => (
 *     <VRTableRow key={i} index={i}>
 *       <VRTableCell field="company">
 *         {(path) => <VRText name={path} label="" />}
 *       </VRTableCell>
 *       <VRTableCell field="role">
 *         {(path) => <VRText name={path} label="" />}
 *       </VRTableCell>
 *     </VRTableRow>
 *   ))}
 * </VRTable>
 * ```
 */
export function VRTable({
  name,
  columns,
  children,
  className,
}: VRTableProps): React.JSX.Element {
  const field = useVoraField<Record<string, unknown>[]>(name);
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

// ─── VRTableRow ───────────────────────────────────────────────────────────

/**
 * Row wrapper that provides the path prefix for its cells.
 *
 * Each row computes its prefix as `${tableName}.${index}` (e.g., `items.0`).
 * Child `<VRTableCell>` components use this to construct full paths.
 */
export function VRTableRow({
  index,
  children,
  className,
}: VRTableRowProps): React.JSX.Element {
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

// ─── VRTableCell ──────────────────────────────────────────────────────────

/**
 * Cell that constructs the full field path and delegates rendering.
 *
 * Uses a **render function** pattern: the child receives the full
 * path (e.g., `items.0.company`) and returns the appropriate input.
 *
 * This lets developers use ANY VoraForm component inside a cell:
 * ```tsx
 * <VRTableCell field="qty">
 *   {(path) => <VRText name={path} label="" type="number" />}
 * </VRTableCell>
 * ```
 *
 * ### Why Render Functions?
 *
 * The cell itself does NOT subscribe to useVoraField — it only
 * constructs the path. The rendered input component (VRText, etc.)
 * does the subscribing. This means:
 * - The cell never re-renders from value changes.
 * - Only the input component inside it responds to its own field.
 */
export function VRTableCell({
  field,
  children,
  className,
}: VRTableCellProps): React.JSX.Element {
  const { prefix } = useRowContext();
  const fullPath = `${prefix}.${field}`;

  return (
    <td className={`${styles.td} ${className ?? ''}`}>{children(fullPath)}</td>
  );
}
