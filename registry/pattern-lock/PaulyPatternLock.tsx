'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePaulyField } from '@pauly/core';
import { PaulyLabel } from '../label';
import { PaulyFieldError } from '../field-error';
import type { PaulyPatternLockProps } from './types';
import styles from './PaulyPatternLock.module.css';

const DOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// Calculate percentage-based coordinates for the 3x3 grid
const getDotPos = (dot: number) => {
  const zeroIndex = dot - 1;
  const col = zeroIndex % 3;
  const row = Math.floor(zeroIndex / 3);
  return {
    x: 16.666 + col * 33.333,
    y: 16.666 + row * 33.333,
  };
};

export function PaulyPatternLock({
  name,
  label,
  required = false,
  className,
  id,
}: PaulyPatternLockProps): React.JSX.Element {
  const field = usePaulyField<number[]>(name);
  const inputId = id ?? name;

  // Local state for actively drawing the pattern
  const [pattern, setPattern] = useState<number[]>(field.value ?? []);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const isDrawing = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes (e.g. form reset)
  useEffect(() => {
    if (!isDrawing.current) {
      setPattern(field.value ?? []);
    }
  }, [field.value]);

  const handlePointerDown = (dot: number) => {
    isDrawing.current = true;
    setPattern([dot]);
  };

  const handlePointerEnter = (dot: number) => {
    if (isDrawing.current && !pattern.includes(dot)) {
      setPattern((prev) => [...prev, dot]);
    }
  };

  const stopDrawing = useCallback(() => {
    if (isDrawing.current) {
      isDrawing.current = false;
      setMousePos(null);
      field.setValue(pattern);
    }
  }, [pattern, field]);

  useEffect(() => {
    const handleMouseUp = () => stopDrawing();
    window.addEventListener('pointerup', handleMouseUp);
    return () => window.removeEventListener('pointerup', handleMouseUp);
  }, [stopDrawing]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDrawing.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setMousePos({ x, y });
    }
  };

  const clearPattern = () => {
    setPattern([]);
    field.setValue([]);
  };

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`} id={inputId} ref={field.ref}>
      {label && <PaulyLabel htmlFor={inputId} required={required}>{label}</PaulyLabel>}
      
      <div 
        className={styles.lockContainer}
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setMousePos(null)}
      >
        <svg className={styles.svgOverlay} viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Draw confirmed lines */}
          {pattern.length > 1 &&
            pattern.slice(0, -1).map((dot, index) => {
              const start = getDotPos(dot);
              const end = getDotPos(pattern[index + 1]);
              return (
                <line
                  key={`line-${index}`}
                  className={styles.svgLine}
                  x1={`${start.x}%`}
                  y1={`${start.y}%`}
                  x2={`${end.x}%`}
                  y2={`${end.y}%`}
                />
              );
            })}
          
          {/* Draw active line following mouse */}
          {isDrawing.current && pattern.length > 0 && mousePos && (
            <line
              className={styles.svgLine}
              x1={`${getDotPos(pattern[pattern.length - 1]).x}%`}
              y1={`${getDotPos(pattern[pattern.length - 1]).y}%`}
              x2={`${mousePos.x}%`}
              y2={`${mousePos.y}%`}
            />
          )}
        </svg>

        <div className={styles.grid}>
          {DOTS.map((dot) => (
            <div
              key={dot}
              className={styles.dotWrapper}
              onPointerDown={(e) => {
                e.preventDefault();
                handlePointerDown(dot);
              }}
              onPointerEnter={() => handlePointerEnter(dot)}
            >
              <div className={`${styles.dot} ${pattern.includes(dot) ? styles.active : ''}`} />
            </div>
          ))}
        </div>
      </div>

      <button type="button" onClick={clearPattern} className={styles.clearBtn}>
        Clear Pattern
      </button>

      <PaulyFieldError name={name} />
    </div>
  );
}
