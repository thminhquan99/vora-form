'use client';

import React from 'react';
import { useVoraField } from '@vora/core';
import { VRLabel } from '../label';
import { VRFieldError } from '../field-error';
import type { VRCoordinatePickerProps, Coordinate } from './types';
import styles from './VRCoordinatePicker.module.css';

export function VRCoordinatePicker({
  name,
  label,
  required = false,
  className,
  id,
  height = 200,
}: VRCoordinatePickerProps): React.JSX.Element {
  const field = useVoraField<Coordinate | null>(name);
  const inputId = id ?? name;
  const pos = field.value;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Round to 2 decimal places for cleaner data
    field.setValue({
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
    });
  };

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`} id={inputId} ref={field.ref}>
      {label && <VRLabel htmlFor={inputId} required={required}>{label}</VRLabel>}
      
      <div 
        className={styles.mapBox} 
        style={{ height: `${height}px` }}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label="Coordinate Picker Map"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            field.setValue({ x: 50, y: 50 }); // Fallback for a11y keyboard users
          }
        }}
      >
        {pos && (
          <div 
            className={styles.pin} 
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          />
        )}
      </div>

      {pos && (
        <div className={styles.valueDisplay}>
          X: {pos.x.toFixed(1)}% | Y: {pos.y.toFixed(1)}%
        </div>
      )}

      <VRFieldError name={name} />
    </div>
  );
}
