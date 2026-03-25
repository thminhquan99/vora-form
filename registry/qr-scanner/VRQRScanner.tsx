'use client';

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useVoraField } from '@vora/core';
import { VRLabel } from '../label';
import { VRFieldError } from '../field-error';
import type { VRQRScannerProps } from './types';
import styles from './VRQRScanner.module.css';

// ─── BarcodeDetector type shim ──────────────────────────────────────────────
// The BarcodeDetector API is not yet in all TS lib definitions.

interface DetectedBarcode {
  rawValue: string;
  format: string;
  boundingBox: DOMRectReadOnly;
}

interface BarcodeDetectorInstance {
  detect: (source: ImageBitmapSource) => Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
}

/**
 * QR/Barcode scanner using the native `BarcodeDetector` API.
 *
 * ### Zero Re-render Streaming
 *
 * Like `VRCamera`, the live video feed runs entirely in the DOM
 * via native `<video>` + `MediaStream`. The detection loop runs in
 * `requestAnimationFrame`, reading frames from the video element
 * directly — **zero React involvement** during scanning.
 *
 * ### Detection Flow
 *
 * 1. `useEffect` starts `getUserMedia` and assigns to `videoRef`.
 * 2. A `requestAnimationFrame` loop calls `barcodeDetector.detect(video)`.
 * 3. On detection: stop stream, cancel rAF loop, call
 *    `field.setValue(decodedText)`, switch to "detected" mode.
 * 4. **Rescan**: call `field.setValue(null)`, restart stream + loop.
 *
 * ### BarcodeDetector Fallback
 *
 * If the native `BarcodeDetector` API is not available (e.g., Firefox),
 * the component renders a fallback error message suggesting the user
 * try Chrome or Safari.
 *
 * ### Performance Contract
 *
 * | Phase              | React re-renders | Store updates |
 * |--------------------|-----------------|---------------|
 * | Scanning (rAF)     | 0               | 0             |
 * | Code detected      | 1 (mode switch) | 1             |
 * | Rescan             | 1 (mode switch) | 1 (null)      |
 * | Sibling fields     | 0               | 0             |
 */
/**
 * ### Browser Compatibility — BarcodeDetector API
 *
 * BarcodeDetector is currently supported in:
 *   - Chrome/Edge 83+ (desktop & Android)
 *   - Safari 17.4+ (macOS & iOS)
 *   - NOT supported in Firefox (as of 2025)
 *
 * This component already handles the unsupported case via feature detection:
 *   if (!('BarcodeDetector' in window)) { ... fallback ... }
 *
 * No action required — track Safari rollout for team awareness.
 * When Safari adoption of 17.4+ is confirmed sufficient for your user base,
 * this note can be removed.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector
 */
export function VRQRScanner({
  name,
  label,
  facingMode = 'environment',
  disabled = false,
  required = false,
  className,
  id,
}: VRQRScannerProps): React.JSX.Element {
  const field = useVoraField<string | null>(name);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);

  // Check for BarcodeDetector support
  const BarcodeDetectorCtor = (
    typeof globalThis !== 'undefined'
      ? (globalThis as unknown as Record<string, unknown>)['BarcodeDetector']
      : undefined
  ) as BarcodeDetectorConstructor | undefined;

  const isSupported = !!BarcodeDetectorCtor;

  const [mode, setMode] = useState<'scanning' | 'detected'>(
    field.value ? 'detected' : 'scanning'
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

  // ── Initialize detector ───────────────────────────────────────────
  useEffect(() => {
    if (BarcodeDetectorCtor) {
      detectorRef.current = new BarcodeDetectorCtor({
        formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39'],
      });
    }
  }, [BarcodeDetectorCtor]);

  // ── Stream management ─────────────────────────────────────────────
  const stopStream = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startScan = useCallback(async (isCancelled: () => boolean) => {
    if (!isSupported || !detectorRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      
      if (isCancelled()) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      
      try {
        await video.play();
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        throw err;
      }
      
      if (isCancelled()) return;

      // ── Detection loop (rAF — zero React) ───────────────────────
      const detector = detectorRef.current;

      const scan = async () => {
        if (isCancelled()) return;

        if (!video || video.readyState < 2) {
          rafRef.current = requestAnimationFrame(scan);
          return;
        }

        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0) {
            const decoded = barcodes[0].rawValue;
            // Stop everything and commit
            stopStream();
            field.setValue(decoded);
            setMode('detected');
            return;
          }
        } catch {
          // Detection failed for this frame — continue scanning
        }

        if (!isCancelled()) {
          rafRef.current = requestAnimationFrame(scan);
        }
      };

      rafRef.current = requestAnimationFrame(scan);
    } catch (err) {
      console.error('[VRQRScanner] Failed to access camera:', err);
    }
  }, [facingMode, isSupported, field, stopStream]);

  useEffect(() => {
    let isCancelled = false;
    
    if (mode === 'scanning' && !disabled && isSupported) {
      startScan(() => isCancelled);
    }
    return () => {
      isCancelled = true;
      stopStream();
    };
  }, [mode, disabled, isSupported, startScan, stopStream]);

  // ── Rescan action ─────────────────────────────────────────────────
  const handleRescan = useCallback(() => {
    field.setValue(null);
    setMode('scanning');
  }, [field]);

  // ── Render ────────────────────────────────────────────────────────
  if (!isSupported) {
    return (
      <div
        ref={wrapperRef}
        id={inputId}
        className={`${styles.wrapper} ${className ?? ''}`}
      >
        <VRLabel htmlFor={inputId} required={required}>
          {label}
        </VRLabel>
        <div className={styles.fallback}>
          <p className={styles.fallbackTitle}>⚠️ BarcodeDetector not supported</p>
          <p className={styles.fallbackText}>
            Your browser does not support the native BarcodeDetector API.
            Please use Chrome 83+, Edge 83+, or Safari 16.4+.
          </p>
        </div>
        <VRFieldError name={name} />
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      id={inputId}
      className={`${styles.wrapper} ${className ?? ''}`}
    >
      <div className={styles.header}>
        <VRLabel htmlFor={inputId} required={required}>
          {label}
        </VRLabel>
        {mode === 'detected' && (
          <button
            type="button"
            onClick={handleRescan}
            disabled={disabled}
            className={styles.actionBtn}
            aria-label={`Rescan ${label}`}
          >
            ↺ Rescan
          </button>
        )}
      </div>

      <div
        className={`${styles.viewport} ${hasError ? styles.viewportError : ''}`}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : undefined}
      >
        {mode === 'scanning' ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={styles.video}
            />
            <div className={styles.scanOverlay}>
              <div className={styles.scanLine} />
            </div>
          </>
        ) : (
          <div className={styles.detected}>
            <span className={styles.detectedIcon}>✅</span>
            <p className={styles.detectedLabel}>Code Detected</p>
            <code className={styles.detectedValue}>{field.value}</code>
          </div>
        )}
      </div>

      <VRFieldError name={name} />
    </div>
  );
}
