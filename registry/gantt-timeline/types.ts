import { VRFieldProps } from '@vora/core';

export interface GanttTask {
  id: string;
  title: string;
  start: string; // ISO date wrapper YYYY-MM-DD
  end: string;
}

export interface VRGanttTimelineProps extends VRFieldProps<GanttTask[], HTMLDivElement> {
  label?: string;
  required?: boolean;
  className?: string;
  id?: string;
  startDate: string; // timeline boundary YYYY-MM-DD
  endDate: string; // timeline boundary YYYY-MM-DD
}
