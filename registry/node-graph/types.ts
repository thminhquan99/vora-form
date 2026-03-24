import { VRFieldProps } from '@vora/core';

export interface Node {
  id: string;
  x: number;
  y: number;
  label: string;
}

export interface Edge {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

export interface VRNodeGraphProps extends VRFieldProps<GraphData, HTMLDivElement> {
  label?: string;
  required?: boolean;
  className?: string;
  id?: string;
}
