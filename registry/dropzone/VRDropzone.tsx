'use client';

import React, { useRef, useCallback, useMemo } from 'react';
import { useVoraField } from '@vora/core';
import { VRLabel } from '../label';
import { VRFieldError } from '../field-error';
import type { VRDropzoneProps } from './types';
import styles from './VRDropzone.module.css';

/**
 * Drag-and-drop file uploader integrated with VoraForm.
 *
 * ### Composite Widget Architecture
 *
 * This is a **composite widget** — it uses `field.setValue(files)` to
 * commit the `File[]` array on drop/select, triggering a re-render
 * of this component only so it can display the file list + thumbnails.
 *
 * ### Drag Performance
 *
 * `dragover` fires on every mouse move while dragging. To avoid React
 * re-renders during drag, we toggle a CSS class on the drop zone
 * **directly via the DOM ref** — no `useState` for drag state.
 *
 * ### Thumbnail Previews
 *
 * For image files, `URL.createObjectURL(file)` generates a temporary
 * blob URL rendered in an `<img>`. These URLs are revoked on unmount
 * or when the file is removed, preventing memory leaks.
 *
 * ### Re-render Contract
 *
 * | Action             | This component | Sibling fields |
 * |--------------------|---------------|----------------|
 * | Drag over          | 0 (DOM class) | 0              |
 * | Drop/select files  | 1             | 0              |
 * | Remove a file      | 1             | 0              |
 */
export function VRDropzone({
  name,
  label,
  accept,
  maxFiles,
  maxSize,
  disabled = false,
  required = false,
  className,
  id,
}: VRDropzoneProps): React.JSX.Element {
  const field = useVoraField<File[]>(name);

  const dropzoneRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const inputId = id ?? name;
  const errorId = `${name}-error`;
  const hasError = !!field.error;
  const files: File[] = field.value ?? [];

  // ── Merge field.ref + wrapper ref ──────────────────────────────────
  // CRITICAL: field.ref MUST be passed directly (not via useEffect)
  // because unregisterField() deletes ALL listeners, which would
  // destroy useSyncExternalStore's subscription in StrictMode.
  const wrapperRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (typeof field.ref === 'function') {
        field.ref(el as HTMLElement | null);
      }
    },
    [field.ref]
  );

  // ── File validation & commit ───────────────────────────────────────
  const commitFiles = useCallback(
    (incoming: File[]) => {
      let accepted = incoming;

      // Filter by maxSize
      if (maxSize) {
        accepted = accepted.filter((f) => f.size <= maxSize);
      }

      // Merge with existing and enforce maxFiles
      let merged = [...files, ...accepted];
      if (maxFiles && merged.length > maxFiles) {
        merged = merged.slice(0, maxFiles);
      }

      field.setValue(merged);
    },
    [files, maxFiles, maxSize, field]
  );

  // ── Drag handlers (DOM-only, zero React re-renders) ────────────────
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    dropzoneRef.current?.classList.add(styles.dragging);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      dropzoneRef.current?.classList.remove(styles.dragging);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      dropzoneRef.current?.classList.remove(styles.dragging);

      if (disabled) return;
      const droppedFiles = Array.from(e.dataTransfer.files);
      commitFiles(droppedFiles);
    },
    [disabled, commitFiles]
  );

  // ── Click-to-browse ────────────────────────────────────────────────
  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      commitFiles(selected);
      // Reset input so the same file can be re-selected
      e.target.value = '';
    },
    [commitFiles]
  );

  // ── Remove a file ──────────────────────────────────────────────────
  const handleRemove = useCallback(
    (index: number) => {
      const newFiles = files.filter((_, i) => i !== index);
      field.setValue(newFiles);
    },
    [files, field]
  );

  // ── Thumbnail URLs (memoized, revoked on change) ───────────────────
  const previews = useMemo(() => {
    return files.map((file) => {
      const isImage = file.type.startsWith('image/');
      return {
        name: file.name,
        size: file.size,
        isImage,
        url: isImage ? URL.createObjectURL(file) : undefined,
      };
    });
  }, [files]);

  // Revoke old blob URLs on unmount or file change
  React.useEffect(() => {
    return () => {
      previews.forEach((p) => {
        if (p.url) URL.revokeObjectURL(p.url);
      });
    };
  }, [previews]);

  // ── Helper: format file size ───────────────────────────────────────
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div
      ref={wrapperRef}
      id={inputId}
      className={`${styles.wrapper} ${className ?? ''}`}
    >
      <VRLabel htmlFor={inputId} required={required}>
        {label}
      </VRLabel>

      {/* Hidden native file input */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        onChange={handleInputChange}
        className={styles.hiddenInput}
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Drop zone */}
      <div
        ref={dropzoneRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : undefined}
        className={`${styles.dropzone} ${hasError ? styles.dropzoneError : ''} ${disabled ? styles.dropzoneDisabled : ''
          }`}
      >
        <span className={styles.icon}>📁</span>
        <span className={styles.prompt}>
          Drag & drop files here, or <span className={styles.browse}>browse</span>
        </span>
        {(accept || maxFiles || maxSize) && (
          <span className={styles.hints}>
            {accept && `Accepts: ${accept}`}
            {maxFiles && ` · Max ${maxFiles} files`}
            {maxSize && ` · Max ${formatSize(maxSize)}`}
          </span>
        )}
      </div>

      {/* File previews */}
      {files.length > 0 && (
        <ul className={styles.fileList}>
          {previews.map((preview, i) => (
            <li key={`${preview.name}-${i}`} className={styles.fileItem}>
              {preview.isImage && preview.url ? (
                <img
                  src={preview.url}
                  alt={preview.name}
                  className={styles.thumbnail}
                />
              ) : (
                <span className={styles.fileIcon}>📄</span>
              )}
              <div className={styles.fileMeta}>
                <span className={styles.fileName}>{preview.name}</span>
                <span className={styles.fileSize}>
                  {formatSize(preview.size)}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(i);
                }}
                className={styles.removeBtn}
                aria-label={`Remove ${preview.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <VRFieldError name={name} />
    </div>
  );
}
