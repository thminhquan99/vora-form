'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { useVoraField, useInitialSnapshot } from '@vora/core';
import { VRLabel } from '../label';
import { VRFieldError } from '../field-error';
import type { VRNodeGraphProps, GraphData, Node as GraphNode } from './types';
import styles from './VRNodeGraph.module.css';

function getBezierPath(startX: number, startY: number, endX: number, endY: number) {
  const dx = Math.abs(endX - startX);
  const controlOffset = Math.max(dx * 0.5, 50);
  return `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`;
}

const DEFAULT_DATA: GraphData = { nodes: [], edges: [] };

export function VRNodeGraph({
  name,
  label,
  required = false,
  className,
  id,
}: VRNodeGraphProps): React.JSX.Element {
  const field = useVoraField<GraphData>(name);
  const inputId = id ?? name;

  // Validate initialization
  const fallbackValues = typeof field.value === 'object' && field.value !== null && 'nodes' in field.value ? field.value : DEFAULT_DATA;
  const initialValue = useInitialSnapshot<GraphData>(fallbackValues);

  // Local mutable domain state bridging bypasses React rendering entirely
  const dataRef = useRef<GraphData>({
    nodes: [...initialValue.nodes],
    edges: [...initialValue.edges]
  });

  const stateRef = useRef({
    draggingNode: null as string | null,
    draggingEdgeSource: null as string | null, // source node ID
    startX: 0,
    startY: 0,
    nodeOrigX: 0,
    nodeOrigY: 0,
    mouseX: 0,
    mouseY: 0,
  });

  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const drawEdges = useCallback(() => {
    const data = dataRef.current;
    if (!svgRef.current) return;
    
    data.edges.forEach(edge => {
      const source = data.nodes.find(n => n.id === edge.sourceId);
      const target = data.nodes.find(n => n.id === edge.targetId);
      if (source && target) {
        const sx = source.x + 120; // Node width
        const sy = source.y + 30;  // Node height / 2
        const tx = target.x;
        const ty = target.y + 30;
        const pathEL = svgRef.current!.querySelector(`#edge-${inputId}-${edge.id}`);
        if(pathEL) pathEL.setAttribute('d', getBezierPath(sx, sy, tx, ty));
      }
    });

    // Handle dragging edge dynamically
    const state = stateRef.current;
    const dEdge = svgRef.current.querySelector(`#dragging-${inputId}`);
    if (state.draggingEdgeSource && dEdge) {
      const source = data.nodes.find(n => n.id === state.draggingEdgeSource);
      if (source) {
         const sx = source.x + 120;
         const sy = source.y + 30;
         dEdge.setAttribute('d', getBezierPath(sx, sy, state.mouseX, state.mouseY));
         dEdge.setAttribute('visibility', 'visible');
      }
    } else if (dEdge) {
      dEdge.setAttribute('visibility', 'hidden');
    }
  }, [inputId]);

  const isInternalChange = useRef(false);

  // Synchronize completely mutably across DOM and FormStore
  const syncToStore = useCallback(() => {
    isInternalChange.current = true;
    field.setValue({
      nodes: [...dataRef.current.nodes],
      edges: [...dataRef.current.edges]
    });
  }, [field]);

  // Handle external FormStore reset/sync seamlessly
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    const safeValue = typeof field.value === 'object' && field.value !== null && 'nodes' in field.value ? field.value : DEFAULT_DATA;
    dataRef.current = {
      nodes: [...safeValue.nodes],
      edges: [...safeValue.edges]
    };

    // Fast-path native style override
    dataRef.current.nodes.forEach(node => {
      const domNode = document.getElementById(`node-${inputId}-${node.id}`);
      if (domNode) {
        domNode.style.transform = `translate(${node.x}px, ${node.y}px)`;
      }
    });

    drawEdges();
  }, [field.value, drawEdges, inputId]);

  useEffect(() => {
    drawEdges();
  }, [drawEdges, dataRef.current.nodes.length, dataRef.current.edges.length]);

  const onPointerDown = (e: React.PointerEvent, targetId?: string, type?: 'node' | 'portOutput') => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Use currentTarget specifically for strict Pointer Capture constraints
    const targetElement = e.currentTarget as HTMLElement;

    if (type === 'node' && targetId) {
      e.stopPropagation();
      const node = dataRef.current.nodes.find(n => n.id === targetId);
      if (node) {
        stateRef.current.draggingNode = targetId;
        stateRef.current.startX = e.clientX;
        stateRef.current.startY = e.clientY;
        stateRef.current.nodeOrigX = node.x;
        stateRef.current.nodeOrigY = node.y;
        targetElement.setPointerCapture(e.pointerId);
      }
    } else if (type === 'portOutput' && targetId) {
      e.stopPropagation();
      stateRef.current.draggingEdgeSource = targetId;
      stateRef.current.mouseX = e.clientX - rect.left;
      stateRef.current.mouseY = e.clientY - rect.top;
      targetElement.setPointerCapture(e.pointerId);
      drawEdges();
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const state = stateRef.current;
    if (!state.draggingNode && !state.draggingEdgeSource) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (state.draggingNode) {
      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      const node = dataRef.current.nodes.find(n => n.id === state.draggingNode);
      if (node) {
        node.x = state.nodeOrigX + dx;
        node.y = state.nodeOrigY + dy;
        const domNode = document.getElementById(`node-${inputId}-${node.id}`);
        if(domNode) {
           domNode.style.transform = `translate(${node.x}px, ${node.y}px)`;
        }
        drawEdges();
      }
    } else if (state.draggingEdgeSource) {
      state.mouseX = e.clientX - rect.left;
      state.mouseY = e.clientY - rect.top;
      drawEdges();
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const state = stateRef.current;
    let didUpdate = false;

    if (state.draggingNode) {
      state.draggingNode = null;
      didUpdate = true;
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch(err) {}
    }

    if (state.draggingEdgeSource) {
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch(err) {}
      // Check if dropped on an input port natively
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
      if (target && target.classList.contains(styles.portInput)) {
        const targetNodeId = target.getAttribute('data-node-id');
        if (targetNodeId && targetNodeId !== state.draggingEdgeSource) {
          // Avoid duplicate edges bridging
          const exists = dataRef.current.edges.some(eg => eg.sourceId === state.draggingEdgeSource && eg.targetId === targetNodeId);
          if (!exists) {
            dataRef.current.edges.push({
              id: `edge-${Date.now()}`,
              sourceId: state.draggingEdgeSource,
              targetId: targetNodeId
            });
            didUpdate = true;
          }
        }
      }
      state.draggingEdgeSource = null;
      drawEdges();
      // Even if dropped nowhere, we need forced redraw to hide line
      if(!didUpdate) didUpdate = true; 
    }

    if (didUpdate) {
      syncToStore();
    }
  };

  const addNode = () => {
    const id = `node-${Date.now()}`;
    const x = Math.floor(Math.random() * 200) + 50;
    const y = Math.floor(Math.random() * 200) + 50;
    dataRef.current.nodes.push({ id, x, y, label: `Node ${dataRef.current.nodes.length + 1}` });
    syncToStore();
  };

  // Natively bind to avoid passive React event quirks occasionally
  useEffect(() => {
    const handleUp = (e: PointerEvent) => {
        if(stateRef.current.draggingNode || stateRef.current.draggingEdgeSource) {
            // Because pointer capture attaches purely to our exact elements, 
            // the pointerup bubbled event has e.target pointing to it perfectly
            onPointerUp(e as unknown as React.PointerEvent);
        }
    };
    window.addEventListener('pointerup', handleUp);
    return () => window.removeEventListener('pointerup', handleUp);
  }, []);

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`} id={`${inputId}-wrapper`} ref={field.ref}>
      {label && <VRLabel htmlFor={inputId} required={required}>{label}</VRLabel>}

      <div className={styles.controls}>
        <button type="button" className={styles.addBtn} onClick={addNode}>+ Add Node</button>
      </div>

      <div 
        className={styles.canvas} 
        ref={canvasRef}
        onPointerMove={onPointerMove}
      >
        <svg className={styles.svgOverlay} ref={svgRef}>
          {dataRef.current.edges.map(edge => (
             <path key={edge.id} id={`edge-${inputId}-${edge.id}`} className={styles.edge} />
          ))}
          <path id={`dragging-${inputId}`} className={styles.edgeDragging} visibility="hidden" />
        </svg>

        {dataRef.current.nodes.map((node) => (
          <div
            key={node.id}
            id={`node-${inputId}-${node.id}`}
            className={styles.node}
            style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
            onPointerDown={(e) => onPointerDown(e, node.id, 'node')}
          >
            <div className={`${styles.port} ${styles.portInput}`} data-node-id={node.id} />
            {node.label}
            <div 
               className={`${styles.port} ${styles.portOutput}`} 
               onPointerDown={(e) => onPointerDown(e, node.id, 'portOutput')} 
            />
          </div>
        ))}
      </div>

      <VRFieldError name={name} />
    </div>
  );
}
