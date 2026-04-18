export type ResizeMode = 'fit' | 'stretch' | 'crop';
export type ResizeUnit = 'px' | '%';
export type ExportFormat = 'auto' | 'jpg' | 'png' | 'webp';

export interface FilterState {
  brightness: number;
  contrast: number;
  saturation: number;
  sepia: number;
  grayscale: number;
  blur: number;
  sharpen: number;
  denoise: number;
  quality: number;
}

export const FILTER_DEFAULTS: FilterState = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  sepia: 0,
  grayscale: 0,
  blur: 0,
  sharpen: 0,
  denoise: 0,
  quality: 90,
};

/** MIME types that support transparency — exported as PNG in auto mode */
export const TRANSPARENT_MIME_TYPES = new Set([
  'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/tiff',
]);

/** Crop region stored as fractions (0–1) of the image's natural dimensions. */
export interface CropRect {
  x: number; // left edge  [0, 1)
  y: number; // top edge   [0, 1)
  w: number; // width      (0, 1]
  h: number; // height     (0, 1]
}

export const DEFAULT_CROP: CropRect = { x: 0, y: 0, w: 1, h: 1 };

export interface ResizeState {
  enabled: boolean;
  width: number;
  height: number;
  unit: ResizeUnit;
  mode: ResizeMode;
  lockAspect: boolean;
}

/** Snapshot of all user-editable filter + transform state for undo/redo. */
export interface EditSnapshot {
  filters: FilterState;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  crop: CropRect;
  resize: ResizeState;
}

/** The 8 resize handles plus 'move' for the crop-box body drag. */
export type CropHandle =
  | 'nw' | 'n' | 'ne'
  | 'w'          | 'e'
  | 'sw' | 's' | 'se'
  | 'move';
