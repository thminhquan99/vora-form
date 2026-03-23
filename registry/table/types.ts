/**
 * Types for the PaulyTable composition components.
 *
 * ### Architecture
 *
 * ```
 * <PaulyTable name="items">          → TableContext { name, items[] }
 *   <PaulyTableRow index={0}>        → RowContext  { prefix: "items.0" }
 *     <PaulyTableCell field="qty">   → renders <PaulyText name="items.0.qty" />
 *   </PaulyTableRow>
 * </PaulyTable>
 * ```
 *
 * Each cell subscribes to its own flat path (`items.0.qty`) in the
 * store — completely independent of other cells and rows.
 */

// ─── Context Values ──────────────────────────────────────────────────────────

/** Provided by `<PaulyTable>` to its children. */
export interface TableContextValue {
  /** The array field name (e.g., "items"). */
  name: string;
  /** Current number of rows. */
  rowCount: number;
}

/** Provided by `<PaulyTableRow>` to its children. */
export interface RowContextValue {
  /** Full path prefix for this row (e.g., "items.0"). */
  prefix: string;
  /** The row index. */
  index: number;
}

// ─── Component Props ─────────────────────────────────────────────────────────

export interface PaulyTableProps {
  /** The array field path in the store (e.g., "items"). */
  name: string;
  /** Column headers. */
  columns: string[];
  /** Table content (`<PaulyTableRow>` elements). */
  children: React.ReactNode;
  /** Additional CSS class. */
  className?: string;
}

export interface PaulyTableRowProps {
  /** The row index within the array. */
  index: number;
  /** Row content (`<PaulyTableCell>` elements). */
  children: React.ReactNode;
  /** Additional CSS class. */
  className?: string;
}

export interface PaulyTableCellProps {
  /** The field key within the row object (e.g., "company"). */
  field: string;
  /**
   * A render function that receives the full path and returns a component.
   * This gives the developer full control over which input to render.
   *
   * @example
   * ```tsx
   * <PaulyTableCell field="company">
   *   {(path) => <PaulyText name={path} label="" />}
   * </PaulyTableCell>
   * ```
   */
  children: (fullPath: string) => React.ReactNode;
  /** Additional CSS class. */
  className?: string;
}

// ─── Hook Return ─────────────────────────────────────────────────────────────

export interface UsePaulyTableReturn {
  /** Append a new row to the array. */
  append: (item: Record<string, unknown>) => void;
  /** Remove a row by index. */
  remove: (index: number) => void;
  /** Current number of rows. */
  rowCount: number;
}
