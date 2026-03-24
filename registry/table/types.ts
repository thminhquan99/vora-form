/**
 * Types for the VRTable composition components.
 *
 * ### Architecture
 *
 * ```
 * <VRTable name="items">          → TableContext { name, items[] }
 *   <VRTableRow index={0}>        → RowContext  { prefix: "items.0" }
 *     <VRTableCell field="qty">   → renders <VRText name="items.0.qty" />
 *   </VRTableRow>
 * </VRTable>
 * ```
 *
 * Each cell subscribes to its own flat path (`items.0.qty`) in the
 * store — completely independent of other cells and rows.
 */

// ─── Context Values ──────────────────────────────────────────────────────────

/** Provided by `<VRTable>` to its children. */
export interface TableContextValue {
  /** The array field name (e.g., "items"). */
  name: string;
  /** Current number of rows. */
  rowCount: number;
}

/** Provided by `<VRTableRow>` to its children. */
export interface RowContextValue {
  /** Full path prefix for this row (e.g., "items.0"). */
  prefix: string;
  /** The row index. */
  index: number;
}

// ─── Component Props ─────────────────────────────────────────────────────────

export interface VRTableProps {
  /** The array field path in the store (e.g., "items"). */
  name: string;
  /** Column headers. */
  columns: string[];
  /** Table content (`<VRTableRow>` elements). */
  children: React.ReactNode;
  /** Additional CSS class. */
  className?: string;
}

export interface VRTableRowProps {
  /** The row index within the array. */
  index: number;
  /** Row content (`<VRTableCell>` elements). */
  children: React.ReactNode;
  /** Additional CSS class. */
  className?: string;
}

export interface VRTableCellProps {
  /** The field key within the row object (e.g., "company"). */
  field: string;
  /**
   * A render function that receives the full path and returns a component.
   * This gives the developer full control over which input to render.
   *
   * @example
   * ```tsx
   * <VRTableCell field="company">
   *   {(path) => <VRText name={path} label="" />}
   * </VRTableCell>
   * ```
   */
  children: (fullPath: string) => React.ReactNode;
  /** Additional CSS class. */
  className?: string;
}

// ─── Hook Return ─────────────────────────────────────────────────────────────

export interface UseVRTableReturn {
  /** Append a new row to the array. */
  append: (item: Record<string, unknown>) => void;
  /** Remove a row by index. */
  remove: (index: number) => void;
  /** Current number of rows. */
  rowCount: number;
}
