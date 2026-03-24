'use client';

import React, { useState } from 'react';
import { usePaulyField } from '@pauly/core';
import { PaulyLabel } from '../label';
import { PaulyFieldError } from '../field-error';
import type { PaulyWidgetBuilderProps, WidgetNode } from './types';
import styles from './PaulyWidgetBuilder.module.css';

// ─── DnD Tree Manipulation Helpers ────────────────────────────────────────

const isDescendant = (node: WidgetNode, targetId: string): boolean => {
  if (node.id === targetId) return true;
  if (!node.children) return false;
  return node.children.some((child) => isDescendant(child, targetId));
};

const extractNode = (
  nodes: WidgetNode[],
  id: string
): { node: WidgetNode | null; tree: WidgetNode[] } => {
  let extracted: WidgetNode | null = null;
  const filterTree = (list: WidgetNode[]): WidgetNode[] => {
    const result: WidgetNode[] = [];
    for (const item of list) {
      if (item.id === id) {
        extracted = item; // Found it, don't include in output
      } else {
        const newItem = { ...item };
        if (newItem.children) {
          newItem.children = filterTree(newItem.children);
        }
        result.push(newItem);
      }
    }
    return result;
  };
  const tree = filterTree(nodes);
  return { node: extracted, tree };
};

const insertIntoTree = (
  nodes: WidgetNode[],
  targetId: string,
  nodeToInsert: WidgetNode,
  asChildOfTarget = false
): WidgetNode[] => {
  if (targetId === 'root') {
    return [...nodes, nodeToInsert];
  }

  const result: WidgetNode[] = [];
  for (const item of nodes) {
    if (item.id === targetId) {
      if (item.type === 'folder' && asChildOfTarget) {
        // Drop INSIDE the folder's empty dropzone
        const newItem = { ...item };
        newItem.children = newItem.children ? [...newItem.children, nodeToInsert] : [nodeToInsert];
        result.push(newItem);
      } else {
        // Drop ON TOP of a node -> Insert before it
        result.push(nodeToInsert);
        result.push(item);
      }
    } else {
      const newItem = { ...item };
      if (newItem.children) {
        newItem.children = insertIntoTree(newItem.children, targetId, nodeToInsert, asChildOfTarget);
      }
      result.push(newItem);
    }
  }
  return result;
};

// ─── Node Component ───────────────────────────────────────────────────────

function WidgetNodeItem({
  node,
  draggedId,
  setDraggedId,
  onDropNode,
  removeNode,
  addNode,
}: {
  node: WidgetNode;
  draggedId: string | null;
  setDraggedId: (id: string | null) => void;
  onDropNode: (draggedId: string, dropTargetId: string, asChild: boolean) => void;
  removeNode: (id: string) => void;
  addNode: (type: 'folder' | 'field', parentId: string) => void;
}) {
  const isFolder = node.type === 'folder';

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', node.id);
    setDraggedId(node.id);
    e.stopPropagation();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).classList.add(styles.dragOver);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).classList.remove(styles.dragOver);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).classList.remove(styles.dragOver);
    const droppedId = e.dataTransfer.getData('text/plain');
    if (droppedId && droppedId !== node.id) {
      // If dropping on a folder Header or Field, insert BEFORE it.
      onDropNode(droppedId, node.id, false);
    }
  };

  const handleFolderDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).classList.remove(styles.dragOver);
    const droppedId = e.dataTransfer.getData('text/plain');
    if (droppedId && droppedId !== node.id) {
      // If dropping in the folder children Dropzone, insert INSIDE it.
      onDropNode(droppedId, node.id, true);
    }
  };

  return (
    <div
      className={`${styles.node} ${isFolder ? styles.folder : styles.field} ${
        draggedId === node.id ? styles.dragging : ''
      }`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={() => setDraggedId(null)}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={styles.nodeHeader}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className={styles.nodeIcon}>
            {isFolder ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              </svg>
            )}
          </span>
          {node.title}
        </div>
        <button
          type="button"
          onClick={() => removeNode(node.id)}
          className={styles.actionButton}
          aria-label="Remove Node"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {isFolder && (
        <div
          className={styles.folderChildren}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleFolderDrop}
        >
          {node.children?.map((child) => (
            <WidgetNodeItem
              key={child.id}
              node={child}
              draggedId={draggedId}
              setDraggedId={setDraggedId}
              onDropNode={onDropNode}
              removeNode={removeNode}
              addNode={addNode}
            />
          ))}
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              type="button"
              className={styles.addBtn}
              onClick={() => addNode('field', node.id)}
            >
              + Field
            </button>
            <button
              type="button"
              className={styles.addBtn}
              onClick={() => addNode('folder', node.id)}
            >
              + Folder
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

export function PaulyWidgetBuilder({
  name,
  label,
  required = false,
  className,
  id,
}: PaulyWidgetBuilderProps): React.JSX.Element {
  const field = usePaulyField<WidgetNode[]>(name);
  const inputId = id ?? name;
  const nodes = field.value ?? [];

  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDropNode = (dragId: string, dropTargetId: string, asChild: boolean) => {
    // 1. Remove node from old position
    const { node: extracted, tree: treeWithoutNode } = extractNode(nodes, dragId);
    if (!extracted) return;

    if (isDescendant(extracted, dropTargetId)) {
      setDraggedId(null);
      return;
    }

    // 2. Insert into new position
    const newTree = insertIntoTree(treeWithoutNode, dropTargetId, extracted, asChild);

    // 3. Commit to DOM domain state
    field.setValue(newTree);
    setDraggedId(null);
  };

  const removeNode = (targetId: string) => {
    const { tree } = extractNode(nodes, targetId);
    field.setValue(tree);
  };

  const addNode = (type: 'folder' | 'field', parentId: string) => {
    const newNode: WidgetNode = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      title: `New ${type === 'folder' ? 'Folder' : 'Field'}`,
      children: type === 'folder' ? [] : undefined,
    };
    const newTree = insertIntoTree(nodes, parentId, newNode, true);
    field.setValue(newTree);
  };

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`} id={inputId}>
      {label && <PaulyLabel htmlFor={inputId} required={required}>{label}</PaulyLabel>}

      <div
        className={styles.droppableArea}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).classList.add(styles.dragOver);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).classList.remove(styles.dragOver);
        }}
        onDrop={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).classList.remove(styles.dragOver);
          const droppedId = e.dataTransfer.getData('text/plain');
          if (droppedId) {
            handleDropNode(droppedId, 'root', false);
          }
        }}
      >
        {nodes.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: '#9ca3af', border: '1px dashed #d1d5db', borderRadius: 8 }}>
            Drag elements here or add a new folder
          </div>
        ) : (
          nodes.map((node) => (
            <WidgetNodeItem
              key={node.id}
              node={node}
              draggedId={draggedId}
              setDraggedId={setDraggedId}
              onDropNode={handleDropNode}
              removeNode={removeNode}
              addNode={addNode}
            />
          ))
        )}
      </div>

      <button
        type="button"
        className={styles.globalAddBtn}
        onClick={() => addNode('folder', 'root')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          <line x1="12" y1="11" x2="12" y2="17"></line>
          <line x1="9" y1="14" x2="15" y2="14"></line>
        </svg>
        Add Root Folder
      </button>

      <PaulyFieldError name={name} />
    </div>
  );
}
