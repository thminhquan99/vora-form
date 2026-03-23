'use client';

import React from 'react';
import type { PaulyLabelProps } from './types';
import styles from './PaulyLabel.module.css';

/**
 * Accessible form label that auto-links to its field via `htmlFor`.
 *
 * Renders a native `<label>` element with an optional required indicator.
 * Compliant with WCAG 2.1 AA — the `htmlFor` attribute ensures assistive
 * technology correctly associates the label with its input.
 */
export function PaulyLabel({
  htmlFor,
  children,
  required = false,
  className,
}: PaulyLabelProps): React.JSX.Element {
  return (
    <label
      htmlFor={htmlFor}
      className={`${styles.label} ${className ?? ''}`}
    >
      {children}
      {required && (
        <span className={styles.required} aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}
