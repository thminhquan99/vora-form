'use client';

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { usePaulyField } from '@pauly/core';
import { PaulyLabel } from '../label';
import { PaulyFieldError } from '../field-error';
import type { PaulyCameraProps } from './types';
import styles from './PaulyCamera.module.css';

/**
 * Camera capture component — takes a photo via `getUserMedia`.
 *
 * ### Zero Re-render Streaming
 *
 * The live video feed runs entirely in the DOM via native `<video>`
 * element + `MediaStream`. React never touches the video frames.
 *
 * **How it works:**
 *
 * 1. `useEffect` calls `navigator.mediaDevices.getUserMedia()` and
 *    assigns the `MediaStream` to `videoRef.current.srcObject`
 *    **natively** (no React state for the stream).
 * 2. The `<video>` plays at native frame rate (30–60fps).
 *    **Zero React re-renders** during streaming.
 * 3. **Capture**: Draw `<video>` frame onto hidden `<canvas>`,
 *    extract `canvas.toDataURL('image/png')`, call
 *    `field.setValue(base64)`. Stop the stream.
 * 4. **Retake**: Call `field.setValue(null)`, restart the stream.
 *
 * ### Performance Contract
 *
 * | Phase              | React re-renders | Store updates |
 * |--------------------|-----------------|---------------|
 * | Live streaming     | 0               | 0             |
 * | Capture photo      | 1 (mode switch) | 1             |
 * | Retake             | 1 (mode switch) | 1 (null)      |
 * | Sibling fields     | 0               | 0             |
 *
 * ### State Usage
 *
 * We use ONE `useState` (`mode: 'streaming' | 'captured'`) purely to
 * toggle the UI between the live feed and the captured preview image.
 * This is a local UI concern, not a form data concern.
 */
export function PaulyCamera({
  name,
  label,
  facingMode = 'user',
  disabled = false,
  required = false,
  className,
  id,
}: PaulyCameraProps): React.JSX.Element {
  const field = usePaulyField<string | null>(name);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ONE piece of local state: whether we're streaming or showing a capture.
  const [mode, setMode] = useState<'streaming' | 'captured'>(
    field.value ? 'captured' : 'streaming'
  );

  const inputId = id ?? name;
  const errorId = `${name}-error`;
  const hasError = !!field.error;

  // ── Register wrapper as the field ref ──────────────────────────────
  useEffect(() => {
    const el = wrapperRef.current;
    if (el && field.ref) {
      if (typeof field.ref === 'function') {
        field.ref(el);
      } else {
        (field.ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }
    }
  }, [field.ref]);

  // ── Start/stop camera stream ──────────────────────────────────────
  const startStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => {
          if (err.name !== 'AbortError') {
            console.error('[PaulyCamera] play() failed:', err);
          }
        });
      }
    } catch (err) {
      console.error('[PaulyCamera] Failed to access camera:', err);
    }
  }, [facingMode]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // ── Auto-start stream when in streaming mode ──────────────────────
  useEffect(() => {
    if (mode === 'streaming' && !disabled) {
      startStream();
    }
    return () => {
      stopStream();
    };
  }, [mode, disabled, startStream, stopStream]);

  // ── Capture action ────────────────────────────────────────────────
  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Size canvas to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw current video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Extract base64 and commit to store
    const base64 = canvas.toDataURL('image/png');
    field.setValue(base64);

    // Stop the stream and switch mode
    stopStream();
    setMode('captured');
  }, [field, stopStream]);

  // ── Retake action ─────────────────────────────────────────────────
  const handleRetake = useCallback(() => {
    field.setValue(null);
    setMode('streaming');
  }, [field]);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div
      ref={wrapperRef}
      id={inputId}
      className={`${styles.wrapper} ${className ?? ''}`}
    >
      <div className={styles.header}>
        <PaulyLabel htmlFor={inputId} required={required}>
          {label}
        </PaulyLabel>
        {mode === 'captured' ? (
          <button
            type="button"
            onClick={handleRetake}
            disabled={disabled}
            className={styles.actionBtn}
            aria-label={`Retake ${label}`}
          >
            ↺ Retake
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCapture}
            disabled={disabled}
            className={`${styles.actionBtn} ${styles.captureBtn}`}
            aria-label={`Capture ${label}`}
          >
            📷 Capture
          </button>
        )}
      </div>

      <div
        className={`${styles.viewport} ${hasError ? styles.viewportError : ''}`}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : undefined}
      >
        {mode === 'streaming' ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={styles.video}
          />
        ) : (
          field.value && (
            <img
              src={field.value}
              alt="Captured photo"
              className={styles.preview}
            />
          )
        )}
      </div>

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <PaulyFieldError name={name} />
    </div>
  );
}
