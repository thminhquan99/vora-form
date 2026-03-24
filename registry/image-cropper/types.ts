import type { PaulyFieldProps } from '@pauly/core';

export type ImageCropData = {
  originalUrl: string;
  zoom: number;
  crop: { x: number; y: number; width: number; height: number };
};

export interface PaulyImageCropperProps extends PaulyFieldProps<ImageCropData | null, HTMLDivElement> {
  label?: string;
  aspectRatio?: number;
  id?: string;
}
