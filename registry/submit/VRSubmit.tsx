'use client';

import React from 'react';
import { useFormCore } from '@vora/core';
import styles from './VRSubmit.module.css';

export interface VRSubmitProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
}

/**
 * A self-aware submit button for VoraForm.
 * Consumes form context to automatically disable and show a loading state
 * when the form is submitting.
 */
export function VRSubmit({
  children = 'Submit',
  className,
  disabled,
  ...props
}: VRSubmitProps): React.JSX.Element {
  const { isSubmitting, isValidating } = useFormCore();

  const isDisabled = disabled || isSubmitting || isValidating;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className={`${styles.submitButton} ${className ?? ''}`}
      {...props}
    >
      {isSubmitting ? 'Submitting...' : isValidating ? 'Validating...' : children}
    </button>
  );
}
