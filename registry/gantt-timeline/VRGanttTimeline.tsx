'use client';

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { useVoraField, useInitialSnapshot } from '@vora/core';
import { VRLabel } from '../label';
import { VRFieldError } from '../field-error';
import type { VRGanttTimelineProps, GanttTask } from './types';
import styles from './VRGanttTimeline.module.css';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function VRGanttTimeline({
  name,
  label,
  required = false,
  className,
  id,
  startDate,
  endDate,
}: VRGanttTimelineProps): React.JSX.Element {
  const field = useVoraField<GanttTask[]>(name);
  const inputId = id ?? name;

  const startTs = useMemo(() => new Date(startDate).getTime(), [startDate]);
  const endTs = useMemo(() => new Date(endDate).getTime(), [endDate]);
  const totalDays = Math.ceil((endTs - startTs) / MS_PER_DAY);
  
  // Enforce 30px minimum per day width for text readability
  const timelineWidth = Math.max(800, totalDays * 30); 
  const pxPerMs = timelineWidth / (endTs - startTs);

  // Snapshot Pattern
  const initialValue = useInitialSnapshot(field.value || []);
  const dataRef = useRef<GanttTask[]>(Array.isArray(initialValue) ? [...initialValue] : []);

  const stateRef = useRef({
    draggingId: null as string | null,
    dragType: null as 'move' | 'resizeLeft' | 'resizeRight' | null,
    startX: 0,
    origStartTs: 0,
    origEndTs: 0,
  });

  const timelineRef = useRef<HTMLDivElement>(null);

  const dateToX = useCallback((dateStr: string) => {
    return Math.max(0, (new Date(dateStr).getTime() - startTs) * pxPerMs);
  }, [startTs, pxPerMs]);

  const xToDateStr = useCallback((x: number) => {
    const ts = startTs + (x / pxPerMs);
    return new Date(ts).toISOString().split('T')[0];
  }, [startTs, pxPerMs]);

  const isInternalChange = useRef(false);

  const syncToStore = useCallback(() => {
    isInternalChange.current = true;
    field.setValue([...dataRef.current]);
  }, [field]);

  const updateTaskDOM = useCallback((task: GanttTask) => {
    const el = document.getElementById(`task-${inputId}-${task.id}`);
    if (el) {
      const left = dateToX(task.start);
      const right = dateToX(task.end);
      el.style.left = `${left}px`;
      el.style.width = `${Math.max(10, right - left)}px`; // min 10px wide
    }
  }, [dateToX, inputId]);

  // Initial draw and external sync mapping
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    dataRef.current = Array.isArray(field.value) ? [...field.value] : [];
    dataRef.current.forEach(updateTaskDOM);
  }, [field.value, updateTaskDOM]);

  const onPointerDown = (e: React.PointerEvent, taskId: string, type: 'move' | 'resizeLeft' | 'resizeRight') => {
    e.stopPropagation();
    const task = dataRef.current.find(t => t.id === taskId);
    if (!task) return;

    stateRef.current = {
      draggingId: taskId,
      dragType: type,
      startX: e.clientX,
      origStartTs: new Date(task.start).getTime(),
      origEndTs: new Date(task.end).getTime(),
    };

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const state = stateRef.current;
    if (!state.draggingId) return;

    const dx = e.clientX - state.startX;
    const msDelta = dx / pxPerMs;

    const task = dataRef.current.find(t => t.id === state.draggingId);
    if (!task) return;

    // Mutate and apply boundary logic natively
    if (state.dragType === 'move') {
      const newStartTs = Math.max(startTs, Math.min(endTs - (state.origEndTs - state.origStartTs), state.origStartTs + msDelta));
      const newEndTs = newStartTs + (state.origEndTs - state.origStartTs);
      task.start = new Date(newStartTs).toISOString().split('T')[0];
      task.end = new Date(newEndTs).toISOString().split('T')[0];
    } else if (state.dragType === 'resizeLeft') {
      const newStartTs = Math.max(startTs, Math.min(state.origEndTs - MS_PER_DAY, state.origStartTs + msDelta));
      task.start = new Date(newStartTs).toISOString().split('T')[0];
    } else if (state.dragType === 'resizeRight') {
      const newEndTs = Math.max(state.origStartTs + MS_PER_DAY, Math.min(endTs, state.origEndTs + msDelta));
      task.end = new Date(newEndTs).toISOString().split('T')[0];
    }

    updateTaskDOM(task);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const state = stateRef.current;
    if (state.draggingId) {
      state.draggingId = null;
      state.dragType = null;
      try { 
        (e.target as HTMLElement).releasePointerCapture(e.pointerId); 
      } catch (err) {}
      syncToStore();
    }
  };

  const addTask = () => {
    const id = `t-${Date.now()}`;
    // Add default 3 day task at start of timeline
    const end = new Date(startTs + 3 * MS_PER_DAY).toISOString().split('T')[0];
    dataRef.current.push({ id, title: `Task ${dataRef.current.length + 1}`, start: startDate, end });
    syncToStore();
  };

  const dayWidth = timelineWidth / totalDays;
  const gridTicks = Array.from({ length: totalDays }, (_, i) => i);

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`} id={`${inputId}-wrapper`} ref={field.ref}>
      {label && <VRLabel htmlFor={inputId} required={required}>{label}</VRLabel>}
      
      <div className={styles.controls}>
        <button type="button" className={styles.btn} onClick={addTask}>+ Add Task</button>
      </div>

      <div className={styles.timeline}>
        {/* Render timeline width scaled to days */}
        <div 
          className={styles.timelineInner} 
          style={{ width: `${timelineWidth}px` }}
          ref={timelineRef}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          role="application"
          aria-label={label || 'Gantt Timeline'}
        >
          {/* Background Grid */}
          <div className={styles.grid} style={{ backgroundSize: `${dayWidth}px 100%`, width: '100%' }} />
          
          {/* Axis Labels */}
          <div className={styles.axis} style={{ width: '100%' }}>
            {gridTicks.map(i => {
              const d = new Date(startTs + i * MS_PER_DAY);
              // Only label every 1 day or 7 days depending on zoom, let's just do daily for simplicity since we enforce 30px min width
              return (
                <div key={i} className={styles.axisDate} style={{ width: `${dayWidth}px` }}>
                  {d.getDate()}/{d.getMonth() + 1}
                </div>
              );
            })}
          </div>

          {/* Render Tasks - Native positions computed directly to bypass layout thrashing */}
          {dataRef.current.map((task, idx) => (
            <div
              key={task.id}
              id={`task-${inputId}-${task.id}`}
              className={styles.task}
              style={{ top: `${40 + idx * 44}px` }}
              onPointerDown={(e) => onPointerDown(e, task.id, 'move')}
              role="slider"
              tabIndex={0}
              aria-label={task.title}
              aria-valuemin={startTs}
              aria-valuemax={endTs}
              aria-valuenow={new Date(task.start).getTime()}
              aria-valuetext={`${task.start} to ${task.end}`}
            >
              <div 
                className={`${styles.resizeHandle} ${styles.resizeHandleLeft}`} 
                onPointerDown={(e) => onPointerDown(e, task.id, 'resizeLeft')} 
              />
              {task.title}
              <div 
                className={`${styles.resizeHandle} ${styles.resizeHandleRight}`} 
                onPointerDown={(e) => onPointerDown(e, task.id, 'resizeRight')} 
              />
            </div>
          ))}
        </div>
      </div>

      <VRFieldError name={name} />
    </div>
  );
}
