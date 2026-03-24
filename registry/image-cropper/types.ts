import type { VRFieldProps } from '@vora/core';

export type ImageCropData = {
  originalUrl: string;
  zoom: number;
  crop: { x: number; y: number; width: number; height: number };
};

export interface VRImageCropperProps extends VRFieldProps<ImageCropData | null, HTMLDivElement> {
  label?: string;
  aspectRatio?: number;
  id?: string;
}
