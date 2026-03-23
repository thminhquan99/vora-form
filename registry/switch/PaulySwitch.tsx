'use client';

import React, { useCallback, useRef } from 'react';
import { usePaulyField } from '@pauly/core';
import { PaulyLabel } from '../label';
import { PaulyFieldError } from '../field-error';
import type { PaulySwitchProps } from './types';
import styles from './PaulySwitch.module.css';

/**
 * Accessible switch toggle integrated with PaulyForm.
 *
 * ### Composite Widget
 *
 * This is a composite widget — it renders a `<button role="switch">`
 * and toggles the boolean value via `field.setValue(!current)` on
 * click. This triggers a re-render of **this component only** to
 * slide the knob. Sibling fields are unaffected.
 *
 * ### Why `<button>` Instead of `<input type="checkbox">`?
 *
 * A native checkbox would work, but a `<button role="switch">` gives
 * us full CSS control over the sliding track/knob animation without
 * fighting browser-default checkbox styling.
 *
 * ### Accessibility
 *
 * - `role="switch"` communicates toggle semantics to screen readers.
 * - `aria-checked` reflects the current boolean state.
 * - `aria-labelledby` links to the adjacent label.
 * - Keyboard: `Enter` / `Space` toggle the switch (native button behavior).
 *
 * ### Re-render Contract
 *
 * | Action       | This component | Sibling fields |
 * |-------------|---------------|----------------|
 * | Toggle      | 1 (knob slide) | 0              |
 */
export function PaulySwitch({
  name,
  label,
  disabled = false,
  required = false,
  className,
  id,
}: PaulySwitchProps): React.JSX.Element {
  const field = usePaulyField<boolean>(name);

  const inputId = id ?? name;
  const labelId = `${name}-label`;
  const errorId = `${name}-error`;
  const hasError = !!field.error;
  const isOn = !!field.value;

  // ── Merge field.ref + local ref for the <button> ───────────────────
  // We need both: field.ref registers the element with the store,
  // and we may need a local ref for imperative access.
  // CRITICAL: field.ref MUST be passed directly (not via useEffect)
  // because unregisterField() deletes ALL listeners, which would
  // destroy useSyncExternalStore's subscription in StrictMode.
  const localRef = useRef<HTMLButtonElement>(null);

  const mergedRef = useCallback(
    (el: HTMLButtonElement | null) => {
      localRef.current = el;
      // Forward to field.ref (callback ref from usePaulyField)
      if (typeof field.ref === 'function') {
        field.ref(el as HTMLElement | null);
      }
    },
    [field.ref]
  );

  // ── Toggle handler (composite → setValue) ──────────────────────────
  const handleToggle = useCallback(() => {
    if (disabled) return;
    field.setValue(!isOn);
  }, [disabled, field, isOn]);

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      <div className={styles.row}>
        <button
          ref={mergedRef}
          id={inputId}
          type="button"
          role="switch"
          aria-checked={isOn}
          aria-labelledby={labelId}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? errorId : undefined}
          onClick={handleToggle}
          disabled={disabled}
          className={`${styles.track} ${isOn ? styles.trackOn : ''} ${hasError ? styles.trackError : ''
            }`}
        >
          <span className={styles.knob} />
        </button>
        <span id={labelId}>
          <PaulyLabel htmlFor={inputId} required={required}>
            {label}
          </PaulyLabel>
        </span>
      </div>
      <PaulyFieldError name={name} />
    </div>
  );
}
