/**
 * @module ref-store
 * @description
 * Vanilla TypeScript Form Store — the engine behind VoraForm's
 * "Zero Re-render" architecture.
 *
 * ### Architectural Overview
 *
 * This class is the **single source of truth** for all form state, and it
 * lives **entirely outside React**. No `useState`, no `useReducer`, no React
 * imports whatsoever. By keeping state in plain Maps, we guarantee that
 * updating a field value **never** triggers React reconciliation on sibling
 * fields.
 *
 * React components interact with this store through a thin context layer
 * (implemented in a separate file). Each field component subscribes to
 * exactly *one* path; the store notifies only matching subscribers when that
 * path changes. The result: **O(1) re-renders per keystroke**, regardless of
 * the total number of form fields.
 *
 * ### Dual-Store Design
 *
 * The store maintains two parallel Maps:
 *
 * | Map | Purpose |
 * |---|---|
 * | `refs` | DOM element handles — used for `.focus()`, `.blur()`, and syncing `.value` on native inputs (`<input>`, `<textarea>`, `<select>`). |
 * | `values` | **Canonical domain values** — source of truth for ALL fields. Native inputs write here via `onChange`; composite widgets (Signature → base64, DatePicker → ISO string) write here directly because their DOM element has no `.value` property. |
 *
 * `getValue()` always reads from the `values` Map, never from the DOM.
 * `setValue()` writes to the `values` Map **and** syncs to the DOM element's
 * `.value` if the ref is a native input element.
 *
 * This dual approach solves the "HTMLElement has no `.value`" problem:
 * - A `<canvas>` (Signature) has no `.value` — the base64 string lives in `values`.
 * - An `<input>` has a `.value` — the store keeps both in sync.
 *
 * ### Why Not React State?
 *
 * If field values lived in `useState` or `useReducer`, updating *any* field
 * would trigger a re-render of the context provider, which would cascade to
 * *every* consuming component. With 50+ fields, this creates measurable
 * jank. By keeping values in a plain `Map` and notifying subscribers
 * manually, we bypass React's reconciliation entirely for value changes.
 *
 * Error state is the **one exception** that is allowed to trigger targeted
 * re-renders — but only on the specific `<VRFieldError>` component bound
 * to that field, never the entire form tree.
 *
 * @example
 * ```ts
 * const store = new FormStore();
 *
 * // Register a native <input> element
 * const cleanup = store.registerField('email', inputElement);
 *
 * // Subscribe to value changes on 'email'
 * const unsub = store.subscribe('email', () => {
 *   console.log('email changed:', store.getValue('email'));
 * });
 *
 * // Set value — updates the values Map AND the DOM element's .value
 * store.setValue('email', 'user@example.com');
 *
 * // For a composite component (Signature canvas):
 * store.registerField('signature', canvasElement);
 * store.setValue('signature', 'data:image/png;base64,...');
 * // → values Map is updated; canvas has no .value, so DOM sync is skipped.
 *
 * // Cleanup
 * unsub();
 * cleanup();
 * ```
 */

import { isDeepEqual } from './is-equal';
import { unflattenDotNotation } from './unflatten';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Native HTML form elements that expose a `.value` property.
 * The store can read/write `.value` directly on these elements.
 */
export type NativeFieldElement =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;

/**
 * Callback function invoked when a subscribed field path changes.
 * Receives no arguments — the subscriber reads the new value from the store.
 *
 * This is intentionally argument-free to match the `useSyncExternalStore`
 * contract and to avoid allocating closures on every notification.
 */
export type Listener = () => void;

/**
 * The subset of subscriber topics. Allows subscribing to value changes,
 * error changes, or both.
 */
export type SubscriptionTopic = 'value' | 'error' | 'input' | 'touched' | 'submitting' | 'validating' | 'field';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Type guard: checks whether an element is a native form element with a
 * `.value` property that the store can read/write directly.
 *
 * This is the key discriminator in the dual-store design:
 * - **Native elements** (`<input>`, `<textarea>`, `<select>`) → DOM `.value`
 *   is kept in sync with the `values` Map.
 * - **Non-native elements** (`<canvas>`, `<div>`, custom widgets) → the
 *   `values` Map is the sole source of truth.
 */
function isNativeFieldElement(el: HTMLElement): el is NativeFieldElement {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  );
}

// ─── FormStore ────────────────────────────────────────────────────────────────

/**
 * A structured representation of a field's validation state.
 * Sync and Async errors are tracked separately to prevent race conditions.
 */
export type ValidationErrorState = {
  sync?: string;
  async?: string;
};

/**
 * Vanilla TypeScript form store — no React, no framework dependencies.
 *
 * Manages three concerns:
 * 1. **DOM Refs** (`refs`) — direct handles to field DOM elements for focus,
 *    blur, and native `.value` synchronization.
 * 2. **Domain Values** (`values`) — the canonical data for every registered
 *    field, whether it's a plain `<input>` or a complex canvas widget.
 * 3. **Validation Errors** (`errors`) — error messages keyed by field path,
 *    with per-field subscriber notification.
 *
 * The pub/sub system (`listeners`) is **path-scoped**: a subscriber on
 * `"email"` is never notified when `"password"` changes. This is the
 * mechanism that delivers the zero-cross-field-re-render guarantee.
 */
export class FormStore {
  // ── Internal State ────────────────────────────────────────────────────────

  /**
   * DOM element references keyed by field path.
   *
   * Used for:
   * - Calling `.focus()` / `.blur()` programmatically
   * - Syncing `.value` on native inputs when `setValue()` is called
   * - Reading initial `.value` from native inputs on registration
   *
   * Composite components (Signature, DatePicker, etc.) store their DOM
   * element here too (e.g., the `<canvas>`), but `.value` is never read
   * from or written to those elements — that goes through the `values` Map.
   */
  private refs: Map<string, NativeFieldElement | HTMLElement> = new Map();

  /**
   * Canonical domain values for every registered field.
   *
   * **This is the single source of truth for field data.**
   *
   * - For native inputs: synced from the DOM on `onChange`/`onBlur`, and
   *   written back to the DOM on `setValue()`.
   * - For composite widgets: written directly by the component when the
   *   user commits a value (e.g., lifts the pen on a signature pad).
   *
   * `getValue()` always reads from this Map, never from the DOM.
   */
  private values: Map<string, unknown> = new Map();

  /**
   * Validation error states keyed by field path.
   *
   * Only error state changes trigger re-renders, and only on the specific
   * `<VRFieldError>` component bound to that field path.
   */
  private errors: Map<string, ValidationErrorState> = new Map();

  /**
   * Initial values captured at field registration time.
   *
   * Used by `getDirtyValues()` to determine which fields have changed
   * from their original state. Only set once per field path — subsequent
   * registrations (e.g., StrictMode double-mount) do not overwrite.
   */
  private initialValues: Map<string, unknown> = new Map();

  /**
   * Tracks which fields have been "touched" (blurred at least once).
   *
   * Enterprise forms often defer showing errors until a field has been
   * touched, to avoid overwhelming users with errors before they've
   * had a chance to fill in the field.
   */
  private touched: Set<string> = new Set();

  /**
   * Global submitting state.
   */
  private submitting: boolean = false;

  // ============================================================================
  // FIX-2: Async Validation State Tracking
  // ============================================================================
  private _pendingValidations: number = 0;

  /**
   * Per-path, per-topic subscriber sets.
   *
   * Structure: `Map<"email:value", Set<Listener>>`
   *
   * The composite key `"${path}:${topic}"` ensures that value-change
   * listeners and error-change listeners can be managed independently.
   * A component that only cares about errors never re-renders for value
   * changes, and vice versa.
   */
  private listeners: Map<string, Set<Listener>> = new Map();

  // ── Constructor ───────────────────────────────────────────────────────────

  constructor(initialData?: Record<string, unknown>) {
    if (initialData) {
      for (const [key, value] of Object.entries(initialData)) {
        this.values.set(key, value);
        this.initialValues.set(key, value);
      }
    }
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  /**
   * Builds the composite key used to index into the `listeners` Map.
   *
   * @param path  - Field path, e.g. `"email"` or `"address.city"`
   * @param topic - Subscription topic: `"value"` or `"error"`
   * @returns A composite string key, e.g. `"email:value"`
   */
  private listenerKey(path: string, topic: SubscriptionTopic): string {
    return `${path}:${topic}`;
  }

  // ── Field Registration ────────────────────────────────────────────────────

  /**
   * Registers a field's DOM element with the store.
   *
   * This is called once when a field component mounts. The store saves a
   * reference to the DOM element so it can:
   * - Read/write `.value` for native inputs
   * - Call `.focus()` / `.blur()` programmatically
   *
   * For native inputs, the current `.value` is also read and stored in the
   * `values` Map as the initial value (unless a value is already set, e.g.
   * via `defaultValue`).
   *
   * @param path    - Unique field path (e.g., `"email"`, `"address.city"`)
   * @param element - The DOM element rendered by the field component
   * @returns A cleanup function that unregisters the field (call on unmount)
   *
   * @example
   * ```ts
   * // Inside a React component's ref callback:
   * const cleanup = store.registerField('email', inputElement);
   * // On unmount:
   * cleanup();
   * ```
   */
  registerField(
    path: string,
    element: NativeFieldElement | HTMLElement
  ): () => void {
    this.refs.set(path, element);

    // For native inputs, seed the values Map with the current DOM value
    // unless a value was already set programmatically (e.g., defaultValue
    // was provided before the DOM element mounted).
    if (isNativeFieldElement(element) && !this.values.has(path)) {
      // Checkboxes use `.checked` (boolean), all others use `.value` (string)
      if (
        element instanceof HTMLInputElement &&
        element.type === 'checkbox'
      ) {
        this.values.set(path, element.checked);
      } else if (
        element instanceof HTMLInputElement &&
        (element.type === 'range' || element.type === 'number')
      ) {
        // Range / Number inputs — store as JavaScript number, not string
        this.values.set(path, Number(element.value));
      } else {
        this.values.set(path, element.value);
      }
    }

    // Capture initial value for dirty tracking (only on first registration)
    if (!this.initialValues.has(path)) {
      this.initialValues.set(path, this.values.get(path));
    }

    return () => this.unregisterField(path);
  }

  /**
   * Removes a field's DOM reference from the store.
   *
   * By default, values, errors, and touched state are PRESERVED to support
   * multi-step forms. To completely wipe a field's state (e.g., in dynamic
   * lists), use `store.purgeField(path)` instead.
   *
   * @param path - The field path to unregister
   */
  unregisterField(path: string): void {
    this.refs.delete(path);
  }

  /**
   * Completely removes a field and all its associated state from the store.
   *
   * Cleans up:
   * - DOM ref
   * - Domain value
   * - Validation errors
   * - Touched status
   * - Initial value (dirty tracking)
   *
   * Use this for dynamic fields that are permanently removed from the UI
   * to prevent memory leaks.
   *
   * @param path - The field path to purge
   */
  purgeField(path: string): void {
    this.refs.delete(path);
    this.values.delete(path);
    this.errors.delete(path);
    this.initialValues.delete(path);
    this.touched.delete(path);
    this.fieldRules.delete(path);

    // Notify listeners so UI can clean up
    this.notify(path, 'value');
    this.notify(path, 'error');
    this.notify(path, 'touched');
  }

  // ── Value Access ──────────────────────────────────────────────────────────

  /**
   * Returns the current domain value for a field.
   *
   * **Always reads from the `values` Map, never from the DOM.**
   *
   * This works uniformly for both native inputs (whose values are synced
   * into the Map on `onChange`) and composite widgets (which write directly
   * to the Map).
   *
   * @typeParam T - The expected value type (e.g., `string`, `string | null`)
   * @param path  - The field path to read
   * @returns The current value, or `undefined` if the field is not registered
   *
   * @example
   * ```ts
   * const email = store.getValue<string>('email');
   * const signature = store.getValue<string | null>('signature');
   * ```
   */
  getValue<T = unknown>(path: string): T | undefined {
    return this.values.get(path) as T | undefined;
  }

  /**
   * Sets a field's domain value.
   *
   * Writes to the `values` Map (the canonical source of truth) and then:
   * - If a DOM ref exists **and** is a native input element, syncs the
   *   value to the DOM's `.value` property so the UI reflects the change.
   * - If the ref is a non-native element (e.g., `<canvas>`), the DOM is
   *   not touched — the widget handles its own rendering.
   *
   * After updating, notifies all `"value"` subscribers for this path.
   *
   * **Zero re-render guarantee:** This method mutates a plain Map and calls
   * listener callbacks directly. React's reconciliation engine is never
   * involved — only the specific subscriber component re-renders (if it
   * chooses to via `useSyncExternalStore` or `setState` in its callback).
   *
   * @param path  - The field path to update
   * @param value - The new domain value
   *
   * @example
   * ```ts
   * // Native input — updates Map AND DOM element
   * store.setValue('email', 'new@example.com');
   *
   * // Composite widget — updates Map only (canvas has no .value)
   * store.setValue('signature', 'data:image/png;base64,...');
   * ```
   */
  setValue(path: string, value: unknown): void {
    const prevValue = this.values.get(path);

    // ── FIX: Deep Equality Check ──────────────────────────────────────────
    // Prevents redundant re-renders for identical object/array contents.
    if (isDeepEqual(prevValue, value)) return;

    this.values.set(path, value);

    if (this.errors.has(path)) {
      this.clearError(path);
    }

    // Sync to DOM for native inputs so the visible value updates immediately
    const ref = this.refs.get(path);
    if (ref && isNativeFieldElement(ref)) {
      if (ref instanceof HTMLInputElement && ref.type === 'checkbox') {
        ref.checked = Boolean(value);
      } else {
        ref.value = String(value ?? '');
      }
    }

    this.notify(path, 'value');
    this.notify(path, 'field');
  }

  /**
   * Updates the `values` Map **without** notifying subscribers.
   *
   * ### Why This Exists (Uncontrolled-First Architecture)
   *
   * For **native inputs** (`<input>`, `<textarea>`, `<select>`), the DOM
   * element is the source of truth for the visible text. When the user
   * types, the browser updates the DOM immediately — React does not need
   * to re-render the component to reflect the change.
   *
   * However, the store still needs to know the current value (for
   * `getAllValues()` on submit, and for `onBlur` validation). Calling the
   * regular `setValue()` would fire the pub/sub listeners, which would
   * trigger `useSyncExternalStore` → React re-render → converting the
   * uncontrolled input into a **controlled** input on every keystroke.
   *
   * `setSilentValue` solves this: it syncs the store data without waking
   * up React. The DOM already shows the typed character; the store just
   * quietly records it.
   *
   * ### When to Use
   *
   * | Scenario | Method |
   * |---|---|
   * | Native `onChange` event (DOM already updated) | `setSilentValue` |
   * | Composite widget committing a domain value | `setValue` (needs React re-render) |
   * | Programmatic `formRef.setValue()` | `setValue` (needs DOM + React sync) |
   *
   * @param path  - The field path to update
   * @param value - The new domain value
   */
  setSilentValue(path: string, value: unknown): void {
    const prevValue = this.values.get(path);

    // ── FIX: Deep Equality Check ──────────────────────────────────────────
    if (isDeepEqual(prevValue, value)) return;

    this.values.set(path, value);

    // Auto-clear error when user types to improve UX natively
    if (this.errors.has(path)) {
      this.clearError(path);
    }

    // Notify 'input' subscribers — this is used by useAsyncValidation
    // to trigger debounced validation without a React re-render.
    // The 'value' topic is NOT notified, so useSyncExternalStore
    // subscriptions remain dormant (zero re-renders during typing).
    this.notify(path, 'input');
    this.notify(path, 'field');
  }

  /**
   * Returns a snapshot of all registered field values.
   *
   * @param options.unflatten - If true, unflattens dot-notation paths into
   *                            a nested object structure (e.g. "a.b" -> {a:{b:1}}).
   * @returns A Record of all field path -> value pairs
   */
  getAllValues(options?: { unflatten?: boolean }): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    // Only include currently mounted fields (those with an active ref)
    for (const path of this.refs.keys()) {
      if (this.values.has(path)) {
        result[path] = this.values.get(path);
      }
    }

    if (options?.unflatten) {
      return unflattenDotNotation(result);
    }

    return result;
  }

  /**
   * Returns all values, including those for fields currently unmounted.
   * Useful for multi-step forms where you need the complete persistent state.
   */
  getAllValuesIncludingHidden(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [path, value] of this.values) {
      result[path] = value;
    }
    return result;
  }

  // ── Internal Validation Engine ────────────────────────────────────────────

  /** Internal validation logic keyed by field path. */
  private fieldRules: Map<string, Array<(val: any) => string | undefined>> = new Map();

  /** Registers a native prop validation rule for a field. */
  registerRule(path: string, rule: (val: any) => string | undefined): () => void {
    if (!this.fieldRules.has(path)) {
      this.fieldRules.set(path, []);
    }
    this.fieldRules.get(path)!.push(rule);
    
    return () => {
      const rules = this.fieldRules.get(path);
      if (rules) {
        const index = rules.indexOf(rule);
        if (index > -1) rules.splice(index, 1);
        if (rules.length === 0) this.fieldRules.delete(path);
      }
    };
  }

  /**
   * Evaluates all native validation rules injected by field components.
   * Runs sequentially across all fields, populating the `errors` Map.
   */
  validateInternal(): boolean {
    this.clearAllErrors();
    const values = this.getAllValues();
    let isValid = true;

    for (const [path, rules] of this.fieldRules) {
      const val = values[path];
      for (const rule of rules) {
        const error = rule(val);
        // Guard: if a rule accidentally returns a Promise, skip it rather
        // than setting "[object Promise]" as the error string.
        if (error && !(typeof error === 'object' && typeof (error as any).then === 'function')) {
          this.setError(path, error, 'sync');
          isValid = false;
          break; // Show only the first sequential error for this field
        }
      }
    }
    return isValid;
  }

  /**
   * FIX C3: Validates a SINGLE field's rules only.
   *
   * Unlike `validateInternal()` which clears ALL errors and re-validates
   * every field, this method only touches the specified path. This is the
   * correct behavior for `onBlur` validation — the user blurred one field,
   * so only that field should be validated.
   *
   * @param path - The field path to validate
   * @returns `true` if the field is valid, `false` if it has errors
   */
  validateField(path: string): boolean {
    this.clearError(path, 'sync');
    const rules = this.fieldRules.get(path);
    if (!rules) return true; // No rules registered for this field

    const val = this.getValue(path);
    for (const rule of rules) {
      const error = rule(val);
      // Guard: skip Promise returns (async validators handled separately)
      if (error && !(typeof error === 'object' && typeof (error as any).then === 'function')) {
        this.setError(path, error, 'sync');
        return false; // Stop at first error for this field
      }
    }
    return true;
  }

  // ── Error Management ──────────────────────────────────────────────────────

  /**
   * Returns the current validation error for a field, if any.
   * Prioritizes synchronous errors over asynchronous ones.
   *
   * @param path - The field path to check
   * @returns The error message string, or `undefined` if no error
   */
  getError(path: string): string | undefined {
    const errorState = this.errors.get(path);
    if (!errorState) return undefined;
    return errorState.sync || errorState.async;
  }

  /**
   * Returns the raw structured error state for a field.
   * Internal use only.
   */
  getErrorState(path: string): ValidationErrorState | undefined {
    return this.errors.get(path);
  }

  /**
   * Sets a validation error for a field and notifies error subscribers.
   *
   * @param path    - The field path to set the error on
   * @param message - The error message to display
   * @param type    - Whether it's a 'sync' or 'async' error (defaults to 'sync')
   */
  setError(path: string, message: string, type: 'sync' | 'async' = 'sync'): void {
    const currentState = this.errors.get(path) || {};
    const nextState = { ...currentState, [type]: message };
    
    // Only update and notify if the error message for this type changed
    if (currentState[type] !== nextState[type]) {
      this.errors.set(path, nextState);
      this.notify(path, 'error');
      this.notify(path, 'field');
    }
  }

  /**
   * Clears a validation error for a specific field and notifies.
   *
   * @param path - The field path to clear
   * @param type - Which slot to clear. If omitted, clears BOTH sync and async.
   */
  clearError(path: string, type?: 'sync' | 'async'): void {
    const currentState = this.errors.get(path);
    if (!currentState) return;

    if (type) {
      if (currentState[type]) {
        const nextState = { ...currentState, [type]: undefined };
        // Check if the overall state is now empty
        if (!nextState.sync && !nextState.async) {
          this.errors.delete(path);
        } else {
          this.errors.set(path, nextState);
        }
        this.notify(path, 'error');
        this.notify(path, 'field');
      }
      // Clear both
      this.errors.delete(path);
      this.notify(path, 'error');
      this.notify(path, 'field');
    }
  }

  /**
   * Clears ALL validation errors across the entire form.
   */
  clearAllErrors(): void {
    const paths = Array.from(this.errors.keys());
    this.errors.clear();
    for (const path of paths) {
      this.notify(path, 'error');
    }
  }

  /**
   * Returns all current primary validation errors as a plain object.
   */
  getAllErrors(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [path, state] of this.errors) {
      const primaryError = state.sync || state.async;
      if (primaryError) {
        result[path] = primaryError;
      }
    }
    return result;
  }

  /**
   * Returns `true` if the form currently has any validation errors.
   */
  hasErrors(): boolean {
    return this.errors.size > 0;
  }

  /**
   * Returns a consolidated snapshot of a field's state.
   *
   * @param path - The field path
   * @returns An object containing value, error, and touched status
   */
  getFieldState<T = unknown>(path: string) {
    return {
      value: this.getValue<T>(path),
      error: this.getError(path),
      isTouched: this.isTouched(path),
    };
  }

  // ── Ref Access ────────────────────────────────────────────────────────────

  /**
   * Returns the DOM element reference for a field.
   *
   * Useful for programmatic `.focus()` and `.blur()` calls — e.g., when
   * validation fails, the form can focus the first errored field.
   *
   * @param path - The field path to look up
   * @returns The DOM element, or `undefined` if not registered
   */
  getRef(path: string): HTMLElement | undefined {
    return this.refs.get(path);
  }

  /**
   * Programmatically focuses the DOM element for a field.
   *
   * @param path - The field path to focus
   * @returns `true` if the element was found and focused, `false` otherwise
   */
  focusField(path: string): boolean {
    const ref = this.refs.get(path);
    if (ref) {
      ref.focus();
      return true;
    }
    return false;
  }

  // ── Pub/Sub (Path-Scoped) ─────────────────────────────────────────────────

  /**
   * Subscribes a listener to changes on a specific field path and topic.
   *
   * **This is the core mechanism that delivers zero cross-field re-renders.**
   *
   * Each field component subscribes to exactly its own path. When Field A
   * changes, only Field A's subscribers are notified. Fields B, C, … N are
   * never touched.
   *
   * @param path     - The field path to subscribe to (e.g., `"email"`)
   * @param listener - Callback invoked when the field's value or error changes
   * @param topic    - What to subscribe to: `"value"` (default) or `"error"`
   * @returns An unsubscribe function — call it to remove the listener
   *
   * @example
   * ```ts
   * // Subscribe to value changes on 'email'
   * const unsub = store.subscribe('email', () => {
   *   console.log('New email:', store.getValue('email'));
   * });
   *
   * // Subscribe to error changes on 'email'
   * const unsubErr = store.subscribe('email', () => {
   *   console.log('Error:', store.getError('email'));
   * }, 'error');
   *
   * // Later: clean up
   * unsub();
   * unsubErr();
   * ```
   */
  subscribe(
    path: string,
    listener: Listener,
    topic: SubscriptionTopic = 'value'
  ): () => void {
    const key = this.listenerKey(path, topic);

    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }

    this.listeners.get(key)!.add(listener);

    // Return unsubscribe function
    return () => {
      const set = this.listeners.get(key);
      if (set) {
        set.delete(listener);
        // Clean up empty Sets to prevent memory leaks
        if (set.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  /**
   * Notifies all listeners subscribed to a specific field path and topic.
   *
   * Called internally by `setValue()`, `setError()`, `clearError()`, etc.
   * Can also be called externally to force a subscriber refresh.
   *
   * @param path  - The field path whose subscribers to notify
   * @param topic - The topic to notify: `"value"` (default) or `"error"`
   */
  notify(path: string, topic: SubscriptionTopic = 'value'): void {
    const key = this.listenerKey(path, topic);
    const set = this.listeners.get(key);
    if (set) {
      for (const listener of set) {
        listener();
      }
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Resets the entire store to its initial empty state.
   *
   * Clears all refs, values, errors, and listeners. Used for form reset or
   * when the `<VoraForm>` component unmounts.
   */
  reset(): void {
    this.refs.clear();
    this.values.clear();
    this.errors.clear();
    this.initialValues.clear();
    this.touched.clear();
    this.listeners.clear();

    // ============================================================================
    // FIX-2: Async Validation State Tracking (Reset)
    // ============================================================================
    this._pendingValidations = 0;
  }

  // ── Touched & Dirty Tracking ─────────────────────────────────────────────

  /**
   * Marks a field as "touched" (the user has interacted and blurred it).
   *
   * Notifies the `"touched"` topic so subscribers can react (e.g., to
   * conditionally show errors only after touching).
   *
   * @param path - The field path to mark as touched
   */
  setTouched(path: string): void {
    if (!this.touched.has(path)) {
      this.touched.add(path);
      this.notify(path, 'touched');
      this.notify(path, 'field');
    }
  }

  /**
   * Returns whether a field has been touched (blurred at least once).
   *
   * @param path - The field path to check
   * @returns `true` if the user has blurred this field at least once
   */
  isTouched(path: string): boolean {
    return this.touched.has(path);
  }

  /**
   * Sets the submitting state and notifies 'submitting' subscribers.
   */
  setSubmitting(isSubmitting: boolean): void {
    if (this.submitting !== isSubmitting) {
      this.submitting = isSubmitting;
      this.notify('global', 'submitting');
    }
  }

  // ============================================================================
  // FIX-2: Async Validation State Tracking (Methods)
  // ============================================================================
  incrementPendingValidations(): void {
    this._pendingValidations++;
    if (this._pendingValidations === 1) {
      // FIX C2: Notify on dedicated 'validating' topic, not 'submitting'
      this.notify('global', 'validating');
    }
  }

  decrementPendingValidations(): void {
    this._pendingValidations = Math.max(0, this._pendingValidations - 1);
    if (this._pendingValidations === 0) {
      // FIX C2: Notify on dedicated 'validating' topic
      this.notify('global', 'validating');
    }
  }

  /**
   * Returns whether the form is currently submitting.
   */
  getIsSubmitting(): boolean {
    return this.submitting;
  }

  // ============================================================================
  // FIX-2: Async Validation State Tracking (Getter)
  // ============================================================================
  get isValidating(): boolean {
    return this._pendingValidations > 0;
  }

  /**
   * Returns only the values that have changed from their initial state.
   *
   * Compares current values against `initialValues` captured at
   * registration time. For objects/arrays, uses `JSON.stringify`
   * comparison. For primitives, uses strict `===`.
   *
   * @returns A `Record<string, unknown>` containing only dirty fields
   *
   * @example
   * ```ts
   * // User changed email but not firstName
   * store.getDirtyValues();
   * // { email: 'new@example.com' }
   * ```
   */
  getDirtyValues(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const path of this.refs.keys()) {
      const currentValue = this.values.get(path);
      const initialValue = this.initialValues.get(path);
      if (!isDeepEqual(currentValue, initialValue)) {
        result[path] = currentValue;
      }
    }
    return result;
  }

  /**
   * Returns the number of currently registered fields.
   * Useful for debugging and testing.
   */
  get fieldCount(): number {
    return this.refs.size;
  }
}
