import { useState, useRef, useCallback } from 'react';
import type { PointerEvent } from 'react';
import { CropRect, CropHandle, DEFAULT_CROP } from '../types';
import { CROP_MIN_SIZE } from '../constants';

export interface ImageBounds { x: number; y: number; w: number; h: number; }

interface DragState { mx: number; my: number; crop: CropRect; }

export function useCrop() {
  const [cropMode, setCropMode] = useState(false);
  const [crop, setCropState] = useState<CropRect>(DEFAULT_CROP);
  const [isDragging, setIsDragging] = useState(false);

  // Mirror of crop state in a ref so event handlers always see the latest value
  // without needing it as a useCallback dependency.
  const cropRef = useRef<CropRect>(DEFAULT_CROP);
  const cropBeforeEditRef = useRef<CropRect>(DEFAULT_CROP);
  const dragging = useRef<CropHandle | null>(null);
  const dragStart = useRef<DragState | null>(null);

  const setCrop = useCallback((next: CropRect) => {
    cropRef.current = next;
    setCropState(next);
  }, []);

  const enterCropMode = useCallback(() => {
    cropBeforeEditRef.current = cropRef.current;
    setCrop(DEFAULT_CROP);
    setCropMode(true);
  }, [setCrop]);

  /** Keep the current selection and exit crop mode. */
  const applyCrop = useCallback(() => {
    setCropMode(false);
  }, []);

  /** Discard the selection and exit crop mode. */
  const cancelCrop = useCallback(() => {
    setCrop(cropBeforeEditRef.current);
    setCropMode(false);
  }, [setCrop]);

  /** Reset crop selection and exit crop mode. Call on new image load and global reset. */
  const resetCrop = useCallback(() => {
    setCrop(DEFAULT_CROP);
    setCropMode(false);
  }, [setCrop]);

  const restoreCrop = useCallback((next: CropRect) => {
    cropBeforeEditRef.current = next;
    setCrop(next);
    setCropMode(false);
  }, [setCrop]);

  const getCropBeforeEdit = useCallback(() => cropBeforeEditRef.current, []);

  const onHandlePointerDown = useCallback((handle: CropHandle, e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = handle;
    dragStart.current = { mx: e.clientX, my: e.clientY, crop: { ...cropRef.current } };
    setIsDragging(true);
  }, []);

  const onPointerMove = useCallback((e: PointerEvent, imageBounds: ImageBounds) => {
    if (!dragging.current || !dragStart.current || imageBounds.w === 0 || imageBounds.h === 0) return;

    const fdx = (e.clientX - dragStart.current.mx) / imageBounds.w;
    const fdy = (e.clientY - dragStart.current.my) / imageBounds.h;

    const s = dragStart.current.crop;
    let x = s.x, y = s.y, w = s.w, h = s.h;

    switch (dragging.current) {
      case 'move': x += fdx; y += fdy; break;
      case 'n':    y += fdy; h -= fdy; break;
      case 's':    h += fdy; break;
      case 'w':    x += fdx; w -= fdx; break;
      case 'e':    w += fdx; break;
      case 'nw':   x += fdx; y += fdy; w -= fdx; h -= fdy; break;
      case 'ne':   y += fdy; w += fdx; h -= fdy; break;
      case 'sw':   x += fdx; w -= fdx; h += fdy; break;
      case 'se':   w += fdx; h += fdy; break;
    }

    // Enforce minimum size
    if (w < CROP_MIN_SIZE) w = CROP_MIN_SIZE;
    if (h < CROP_MIN_SIZE) h = CROP_MIN_SIZE;

    // Clamp to image bounds [0, 1]
    x = Math.max(0, Math.min(x, 1 - w));
    y = Math.max(0, Math.min(y, 1 - h));
    w = Math.min(w, 1 - x);
    h = Math.min(h, 1 - y);

    setCrop({ x, y, w, h });
  }, [setCrop]);

  const onPointerUp = useCallback(() => {
    dragging.current = null;
    dragStart.current = null;
    setIsDragging(false);
  }, []);

  return { cropMode, enterCropMode, applyCrop, cancelCrop, crop, resetCrop, restoreCrop, getCropBeforeEdit, onHandlePointerDown, onPointerMove, onPointerUp, isDragging };
}
