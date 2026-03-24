'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { useVoraField, useInitialSnapshot } from '@vora/core';
import { VRLabel } from '../label';
import { VRFieldError } from '../field-error';
import type { VRSeatingChartProps } from './types';
import styles from './VRSeatingChart.module.css';

export function VRSeatingChart({
  name,
  label,
  required = false,
  className,
  id,
  svgContent,
}: VRSeatingChartProps): React.JSX.Element {
  const field = useVoraField<string[]>(name);
  const inputId = id ?? name;
  const hasError = !!field.error;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Snapshot initialization ensuring we don't trap stale closures
  const initialValue = useInitialSnapshot(field.value);

  // Track selected IDs without triggering React state
  const selectedRef = useRef<string[]>(Array.isArray(initialValue) ? [...initialValue] : []);

  // Pan / Zoom Native State
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, hasMoved: false });

  // 1. Synchronize completely mutably across DOM and FormStore
  const isInternalChange = useRef(false);

  const syncToStore = useCallback(() => {
    isInternalChange.current = true;
    field.setValue([...selectedRef.current]);
  }, [field]);

  // 2. Safely Parse Dynamic External SVG ensuring no XSS execution possible
  const safeSVGContent = React.useMemo(() => {
    if (!svgContent) return '';
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, 'image/svg+xml');
      const scripts = doc.getElementsByTagName('script');
      for (let i = scripts.length - 1; i >= 0; i--) {
        scripts[i].parentNode?.removeChild(scripts[i]);
      }
      return doc.documentElement.outerHTML;
    } catch {
      return '';
    }
  }, [svgContent]);

  // 3. Initialize & External Value Sync (Reset & Hydration Bypass)
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    selectedRef.current = Array.isArray(field.value) ? [...field.value] : [];

    if (!mapRef.current) return;
    const seats = mapRef.current.querySelectorAll('.seat');
    seats.forEach((seat) => {
      const seatId = seat.id || seat.getAttribute('data-seat-id');
      if (seatId && selectedRef.current.includes(seatId)) {
        seat.classList.add('active'); 
      } else {
        seat.classList.remove('active');
      }
    });
  }, [field.value, safeSVGContent]);

  // 4. Pan / Zoom Logic
  const updateTransform = useCallback(() => {
    if (mapRef.current) {
      const { x, y, scale } = transformRef.current;
      mapRef.current.style.transform = `matrix(${scale}, 0, 0, ${scale}, ${x}, ${y})`;
    }
  }, []);

  const handleZoom = (delta: number, clientX?: number, clientY?: number) => {
    if (!wrapperRef.current) return;
    const t = transformRef.current;
    
    // Simplistic center zooming if no coordinates provided
    const rect = wrapperRef.current.getBoundingClientRect();
    const cx = clientX !== undefined ? clientX - rect.left : rect.width / 2;
    const cy = clientY !== undefined ? clientY - rect.top : rect.height / 2;

    const newScale = Math.min(Math.max(0.5, t.scale + delta), 5);
    const ratio = 1 - newScale / t.scale;

    t.x += (cx - t.x) * ratio;
    t.y += (cy - t.y) * ratio;
    t.scale = newScale;

    updateTransform();
  };

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      handleZoom(e.deltaY * -0.005, e.clientX, e.clientY);
    };

    // Passive: false is required to ensure preventDefault works natively
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [handleZoom]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (e.target instanceof Element && e.target.closest('.controlBtn')) return;
    
    dragRef.current.isDragging = true;
    dragRef.current.hasMoved = false;
    dragRef.current.startX = e.clientX - transformRef.current.x;
    dragRef.current.startY = e.clientY - transformRef.current.y;
    
    if (wrapperRef.current) {
      wrapperRef.current.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.isDragging) return;
    
    dragRef.current.hasMoved = true;
    transformRef.current.x = e.clientX - dragRef.current.startX;
    transformRef.current.y = e.clientY - dragRef.current.startY;
    updateTransform();
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const wasDraggingAndMoved = dragRef.current.isDragging && dragRef.current.hasMoved;
    dragRef.current.isDragging = false;
    
    if (wrapperRef.current) {
      wrapperRef.current.releasePointerCapture(e.pointerId);
    }

    // Only process clicks if we weren't just panning the map
    if (!wasDraggingAndMoved) {
      const target = e.target as HTMLElement;
      const closestSeat = target.closest('.seat');
      
      if (closestSeat) {
        const seatId = closestSeat.id || closestSeat.getAttribute('data-seat-id');
        if (seatId) {
          closestSeat.classList.toggle('active');
          const isSelected = closestSeat.classList.contains('active');
          
          let selected = [...selectedRef.current];
          if (isSelected) {
            selected.push(seatId);
          } else {
            selected = selected.filter(id => id !== seatId);
          }
          
          selectedRef.current = selected;
          syncToStore();
        }
      }
    }
  };

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`} id={`${inputId}-wrapper`} ref={field.ref}>
      {label && <VRLabel htmlFor={inputId} required={required}>{label}</VRLabel>}

      <div 
        ref={wrapperRef}
        className={`${styles.viewport} ${hasError ? styles.viewportError : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className={styles.controls}>
          <button type="button" className={styles.controlBtn} onClick={() => handleZoom(0.5)} aria-label="Zoom In">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          </button>
          <button type="button" className={styles.controlBtn} onClick={() => handleZoom(-0.5)} aria-label="Zoom Out">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/></svg>
          </button>
        </div>

        <div 
          ref={mapRef}
          className={styles.mapContainer}
          dangerouslySetInnerHTML={safeSVGContent ? { __html: safeSVGContent } : undefined}
        />
      </div>

      <VRFieldError name={name} />
    </div>
  );
}
