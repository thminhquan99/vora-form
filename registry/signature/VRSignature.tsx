'use client';

import React, { useRef, useCallback, useEffect } from 'react';
import { useVoraField } from '@vora/core';
import { VRLabel } from '../label';
import { VRFieldError } from '../field-error';
import type { VRSignatureProps } from './types';
import styles from './VRSignature.module.css';

/**
 * Signature pad — freehand drawing captured as a base64 PNG data URL.
 *
 * ### Zero Re-render Drawing
 *
 * This component is the ultimate stress test of the uncontrolled-first
 * architecture. Drawing fires hundreds of `pointermove` events per
 * second. If any of those triggered a React re-render, the form would
 * become unusable.
 *
 * **How it works:**
 *
 * 1. `onPointerDown` — starts a stroke (native refs only, no state).
 * 2. `onPointerMove` — draws directly on the 2D canvas context.
 *    **No `field.onChange` call here.** Zero React involvement.
 * 3. `onPointerUp` / `onPointerLeave` — stroke ends. NOW we commit:
 *    `field.setValue(canvas.toDataURL('image/png'))`.
 *    This stores the composite domain value via `store.setValue()`,
 *    which is correct — the component needs to know it has data.
 * 4. Clear button — clears the canvas natively, then calls
 *    `field.setValue(null)` to reset the store.
 *
 * ### Performance Contract
 *
 * - During drawing: **0 React re-renders**, 0 store updates.
 * - On stroke end: **1 store update** (base64 string).
 * - Sibling fields: **never affected** (topic-based pub/sub).
 *
 * ### Accessibility
 *
 * - `role="img"` with `aria-label` on the canvas.
 * - Clear button is keyboard-focusable.
 * - Error state linked via `aria-describedby`.
 */
export function VRSignature({
  name,
  label,
  penColor = '#000000',
  penWidth = 2,
  canvasHeight = 200,
  disabled = false,
  required = false,
  className,
  id,
}: VRSignatureProps): React.JSX.Element {
  const field = useVoraField<string | null>(name);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawing = useRef(false);
  const hasStrokes = useRef(false);

  const inputId = id ?? name;
  const errorId = `${name}-error`;
  const hasError = !!field.error;

  // ── Initialize canvas context ─────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Size canvas to container width
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = canvasHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctxRef.current = ctx;
  }, [penColor, penWidth, canvasHeight]);

  // ── Register canvas element as the field ref ──────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && field.ref) {
      field.ref(canvas);
    }
  }, [field.ref]);

  // ── Pointer handlers (all native, zero React state) ──────────────

  const getPosition = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (disabled) return;
      const ctx = ctxRef.current;
      if (!ctx) return;

      isDrawing.current = true;
      hasStrokes.current = true;

      const { x, y } = getPosition(e);
      ctx.beginPath();
      ctx.moveTo(x, y);

      // Capture pointer for smooth drawing outside canvas bounds
      canvasRef.current?.setPointerCapture(e.pointerId);
    },
    [disabled, getPosition]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      // CRITICAL: No field.onChange here. Pure canvas drawing.
      if (!isDrawing.current) return;
      const ctx = ctxRef.current;
      if (!ctx) return;

      const { x, y } = getPosition(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [getPosition]
  );

  /**
   * Commit the drawing to the store ONLY on stroke end.
   * This is the single point where React learns about the signature.
   */
  const commitStroke = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Commit base64 data URL as the domain value
    const dataUrl = canvas.toDataURL('image/png');
    field.setValue(dataUrl);
  }, [field]);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      canvasRef.current?.releasePointerCapture(e.pointerId);
      commitStroke();
    },
    [commitStroke]
  );

  const handlePointerLeave = useCallback(() => {
    commitStroke();
  }, [commitStroke]);

  // ── Clear button ──────────────────────────────────────────────────

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasStrokes.current = false;

    // Reset store value to null
    field.setValue(null);
  }, [field]);

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      <div className={styles.header}>
        <VRLabel htmlFor={inputId} required={required}>
          {label}
        </VRLabel>
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          className={styles.clearBtn}
          aria-label={`Clear ${label}`}
        >
          Clear
        </button>
      </div>

      <canvas
        ref={canvasRef}
        id={inputId}
        role="img"
        aria-label={`${label} drawing area`}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        className={`${styles.canvas} ${hasError ? styles.canvasError : ''} ${disabled ? styles.canvasDisabled : ''}`}
        style={{ height: canvasHeight, touchAction: 'none' }}
      />

      <VRFieldError name={name} />
    </div>
  );
}
