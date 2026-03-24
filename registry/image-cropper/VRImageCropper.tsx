'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { useVoraField } from '@vora/core';
import { VRLabel } from '../label';
import { VRFieldError } from '../field-error';
import type { VRImageCropperProps, ImageCropData } from './types';
import styles from './VRImageCropper.module.css';

export function VRImageCropper({
  name,
  label,
  required = false,
  className,
  id,
  aspectRatio,
}: VRImageCropperProps): React.JSX.Element {
  const field = useVoraField<ImageCropData | null>(name);
  const inputId = id ?? name;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Local mutable state bypassing React render
  const imgRef = useRef<HTMLImageElement | null>(null);
  const zoomRef = useRef(1);
  const imageXRef = useRef(0);
  const imageYRef = useRef(0);
  const cropRef = useRef({ x: 50, y: 50, width: 200, height: 200 }); // Canvas-relative now
  const blobUrlRef = useRef<string | null>(null);
  
  // Input references for Zero-render updates
  const inputX = useRef<HTMLInputElement>(null);
  const inputY = useRef<HTMLInputElement>(null);
  const inputW = useRef<HTMLInputElement>(null);
  const inputH = useRef<HTMLInputElement>(null);
  const zoomSlider = useRef<HTMLInputElement>(null);

  // Drag tracking
  const dragTarget = useRef<'none' | 'image' | 'crop'>('none');
  const lastMouse = useRef({ x: 0, y: 0 });

  // Cleanup ObjectURLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const commitToStore = useCallback(() => {
    if (!imgRef.current) return;

    // Convert canvas-relative cropRef back to source image coordinates for the schema
    const sx = (cropRef.current.x - imageXRef.current) / zoomRef.current;
    const sy = (cropRef.current.y - imageYRef.current) / zoomRef.current;
    const sw = cropRef.current.width / zoomRef.current;
    const sh = cropRef.current.height / zoomRef.current;

    field.setValue({
      originalUrl: imgRef.current.src,
      zoom: zoomRef.current,
      crop: { x: sx, y: sy, width: sw, height: sh },
    });
  }, [field]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset dimensions to match container exactly without CSS stretching
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect && (canvas.width !== rect.width || canvas.height !== rect.height)) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (imgRef.current) {
      const img = imgRef.current;
      const z = zoomRef.current;
      const iw = img.width * z;
      const ih = img.height * z;

      // Draw original image (panned & zoomed)
      ctx.drawImage(img, imageXRef.current, imageYRef.current, iw, ih);

      // Draw semi-transparent overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Enforce aspect ratio visually if needed based on the canvas-relative crop box
      if (aspectRatio) {
        if (cropRef.current.width / cropRef.current.height !== aspectRatio) {
           cropRef.current.height = cropRef.current.width / aspectRatio;
        }
      }

      // Cutout coordinates (canvas-relative)
      const cx = cropRef.current.x;
      const cy = cropRef.current.y;
      const cw = cropRef.current.width;
      const ch = cropRef.current.height;

      // Source mapping for accurate drawing
      const sx = (cx - imageXRef.current) / z;
      const sy = (cy - imageYRef.current) / z;
      const sw = cw / z;
      const sh = ch / z;

      // Ensure we don't try to draw outside source dimensions which could throw errors
      if (sw > 0 && sh > 0) {
        // Clear the overlay over the crop box
        ctx.clearRect(cx, cy, cw, ch);
        // Draw the exact source chunk into the crop box coordinates
        ctx.drawImage(img, sx, sy, sw, sh, cx, cy, cw, ch);
      }

      // Draw crop border
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx, cy, cw, ch);

      // Update uncontrolled native inputs flawlessly
      if (inputX.current) inputX.current.value = Math.round(cx).toString();
      if (inputY.current) inputY.current.value = Math.round(cy).toString();
      if (inputW.current) inputW.current.value = Math.round(cw).toString();
      if (inputH.current) inputH.current.value = Math.round(ch).toString();
      if (zoomSlider.current) zoomSlider.current.value = z.toString();
    }
  }, [aspectRatio]);

  // Responsive canvas via ResizeObserver
  useEffect(() => {
    const parent = canvasRef.current?.parentElement;
    if (!parent) return;

    const observer = new ResizeObserver(() => {
      redraw();
    });
    observer.observe(parent);

    return () => observer.disconnect();
  }, [redraw]);

  // Snapshot Pattern to prevent triggering on every commitToStore
  const initialValueRef = useRef(field.value);

  // Load image heavily based on field.value init
  useEffect(() => {
    const initVal = initialValueRef.current;
    if (initVal?.originalUrl && !imgRef.current) {
      const loadImg = new Image();
      loadImg.crossOrigin = 'anonymous'; // Prevent Tainted Canvas / CORS
      loadImg.onload = () => {
        imgRef.current = loadImg;
        zoomRef.current = initVal.zoom;
        
        // Convert initial source coordinates to canvas-relative crop coordinates
        imageXRef.current = 20; // Default pan margin
        imageYRef.current = 20;
        
        const initSource = initVal.crop;
        cropRef.current = {
          x: imageXRef.current + (initSource.x * zoomRef.current),
          y: imageYRef.current + (initSource.y * zoomRef.current),
          width: initSource.width * zoomRef.current,
          height: initSource.height * zoomRef.current,
        };
        
        redraw();
      };
      loadImg.src = initVal.originalUrl;
    }
  }, [redraw]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    blobUrlRef.current = url;

    const loadImg = new Image();
    loadImg.crossOrigin = 'anonymous'; // Prevent Tainted Canvas / CORS
    loadImg.onload = () => {
      imgRef.current = loadImg;
      zoomRef.current = 1;
      imageXRef.current = 20;
      imageYRef.current = 20;
      cropRef.current = { 
        x: 50, 
        y: 50, 
        width: 200, 
        height: aspectRatio ? 200 / aspectRatio : 200 
      };
      redraw();
      commitToStore();
    };
    loadImg.src = url;
  };

  // Canvas Native Pointer Events
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !imgRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    lastMouse.current = { x: mx, y: my };

    // Check if clicked inside crop box (using canvas-relative coordinates direct)
    const cx = cropRef.current.x;
    const cy = cropRef.current.y;
    const cw = cropRef.current.width;
    const ch = cropRef.current.height;

    if (mx >= cx && mx <= cx + cw && my >= cy && my <= cy + ch) {
      dragTarget.current = 'crop';
    } else {
      dragTarget.current = 'image';
    }
    
    // Capture pointer to track outside canvas
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragTarget.current === 'none' || !canvasRef.current || !imgRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const dx = mx - lastMouse.current.x;
    const dy = my - lastMouse.current.y;

    if (dragTarget.current === 'image') {
      imageXRef.current += dx;
      imageYRef.current += dy;
    } else if (dragTarget.current === 'crop') {
      let newX = cropRef.current.x + dx;
      let newY = cropRef.current.y + dy;

      // Boundary Lock (Optional MVP check)
      const z = zoomRef.current;
      const imgW = imgRef.current.width * z;
      const imgH = imgRef.current.height * z;

      if (newX < imageXRef.current) newX = imageXRef.current;
      if (newX > imageXRef.current + imgW - cropRef.current.width) {
        newX = imageXRef.current + imgW - cropRef.current.width;
      }
      if (newY < imageYRef.current) newY = imageYRef.current;
      if (newY > imageYRef.current + imgH - cropRef.current.height) {
        newY = imageYRef.current + imgH - cropRef.current.height;
      }

      cropRef.current.x = newX;
      cropRef.current.y = newY;
    }

    lastMouse.current = { x: mx, y: my };
    redraw();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragTarget.current !== 'none') {
      dragTarget.current = 'none';
      (e.target as Element).releasePointerCapture(e.pointerId);
      commitToStore();
    }
  };

  // Micro-Precision Input Handler
  const handleManualInput = () => {
    if (inputX.current) cropRef.current.x = Number(inputX.current.value);
    if (inputY.current) cropRef.current.y = Number(inputY.current.value);
    if (inputW.current) cropRef.current.width = Number(inputW.current.value);
    if (inputH.current) cropRef.current.height = Number(inputH.current.value);
    
    if (zoomSlider.current) zoomRef.current = Number(zoomSlider.current.value);

    redraw();
    commitToStore();
  };

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`} id={inputId} ref={field.ref}>
      {label && <VRLabel htmlFor={inputId} required={required}>{label}</VRLabel>}

      <div className={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>

      <div className={styles.controls}>
        <div className={styles.controlRow}>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileSelect} 
            className={styles.fileInput}
            aria-label="Select Image to Crop"
          />
          <input
            ref={zoomSlider}
            type="range"
            min="0.1"
            max="5"
            step="0.01"
            className={styles.zoomSlider}
            onChange={handleManualInput}
            aria-label="Zoom Image"
          />
        </div>

        <div className={styles.microControls}>
          <div className={styles.microInputGroup}>
            <span className={styles.microLabel}>X Offset</span>
            <input ref={inputX} type="number" className={styles.microInput} onBlur={handleManualInput} />
          </div>
          <div className={styles.microInputGroup}>
            <span className={styles.microLabel}>Y Offset</span>
            <input ref={inputY} type="number" className={styles.microInput} onBlur={handleManualInput} />
          </div>
          <div className={styles.microInputGroup}>
            <span className={styles.microLabel}>Width</span>
            <input ref={inputW} type="number" className={styles.microInput} onBlur={handleManualInput} min="10" />
          </div>
          <div className={styles.microInputGroup}>
            <span className={styles.microLabel}>Height</span>
            <input 
              ref={inputH} 
              type="number" 
              className={styles.microInput} 
              onBlur={handleManualInput} 
              min="10"
              readOnly={!!aspectRatio} // Lock if aspect ratio is forced
            />
          </div>
        </div>
      </div>

      <VRFieldError name={name} />
    </div>
  );
}
