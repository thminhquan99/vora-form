'use client';

import React from 'react';
import { useVoraField } from '@vora/core';
import type { VRFieldErrorProps } from './types';
import styles from './VRFieldError.module.css';

/**
 * Inline validation error display, bound to a single field path.
 *
 * ### How it Achieves Zero Cross-Field Re-renders
 *
 * This component uses `useVoraField(name)` but only reads the `error`
 * property. Under the hood, `useSyncExternalStore` is subscribed to the
 * `"error"` topic for this field path. When a *sibling* field's error
 * changes, this component is **never notified** and **never re-renders**.
 *
 * ### Conditional Rendering
 *
 * Returns `null` when there is no error — the component unmounts from
 * the DOM entirely, producing zero layout impact.
 *
 * ### Accessibility
 *
 * Uses `role="alert"` by default, making it a live region. Screen readers
 * announce the error text immediately when it appears without the user
 * needing to navigate to it.
 */
export function VRFieldError({
  name,
  className,
  role = 'alert',
}: VRFieldErrorProps): React.JSX.Element | null {
  const { error } = useVoraField(name);

  if (!error) {
    return null;
  }

  return (
    <p
      id={`${name}-error`}
      role={role}
      className={`${styles.error} ${className ?? ''}`}
    >
      {error}
    </p>
  );
}
