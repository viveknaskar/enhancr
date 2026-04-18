import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCrop } from '../hooks/useCrop';
import { DEFAULT_CROP } from '../types';

describe('useCrop', () => {
  it('initialises with crop mode off and default crop rect', () => {
    const { result } = renderHook(() => useCrop());
    expect(result.current.cropMode).toBe(false);
    expect(result.current.crop).toEqual(DEFAULT_CROP);
    expect(result.current.isDragging).toBe(false);
  });

  it('enterCropMode enables crop mode and resets selection', () => {
    const { result } = renderHook(() => useCrop());
    act(() => result.current.enterCropMode());
    expect(result.current.cropMode).toBe(true);
    expect(result.current.crop).toEqual(DEFAULT_CROP);
  });

  it('applyCrop exits crop mode while keeping the selection', () => {
    const { result } = renderHook(() => useCrop());
    act(() => result.current.enterCropMode());
    const bounds = { x: 0, y: 0, w: 500, h: 500 };
    const down = { clientX: 0, clientY: 0, preventDefault: () => {}, stopPropagation: () => {}, currentTarget: { setPointerCapture: () => {} } } as unknown as React.PointerEvent;
    act(() => result.current.onHandlePointerDown('se', down));
    act(() => result.current.onPointerMove({ clientX: 200, clientY: 200 } as unknown as React.PointerEvent, bounds));
    const selectionBeforeApply = { ...result.current.crop };
    act(() => result.current.applyCrop());
    expect(result.current.cropMode).toBe(false);
    expect(result.current.crop).toEqual(selectionBeforeApply);
  });

  it('cancelCrop exits crop mode and resets selection to default', () => {
    const { result } = renderHook(() => useCrop());
    act(() => result.current.enterCropMode());
    const bounds = { x: 0, y: 0, w: 500, h: 500 };
    const down = { clientX: 0, clientY: 0, preventDefault: () => {}, stopPropagation: () => {}, currentTarget: { setPointerCapture: () => {} } } as unknown as React.PointerEvent;
    act(() => result.current.onHandlePointerDown('se', down));
    act(() => result.current.onPointerMove({ clientX: 200, clientY: 200 } as unknown as React.PointerEvent, bounds));
    act(() => result.current.cancelCrop());
    expect(result.current.cropMode).toBe(false);
    expect(result.current.crop).toEqual(DEFAULT_CROP);
  });

  it('cancelCrop restores the crop that existed before entering crop mode', () => {
    const { result } = renderHook(() => useCrop());
    act(() => result.current.restoreCrop({ x: 0.15, y: 0.1, w: 0.7, h: 0.75 }));
    act(() => result.current.enterCropMode());
    const bounds = { x: 0, y: 0, w: 500, h: 500 };
    const down = { clientX: 0, clientY: 0, preventDefault: () => {}, stopPropagation: () => {}, currentTarget: { setPointerCapture: () => {} } } as unknown as React.PointerEvent;
    act(() => result.current.onHandlePointerDown('se', down));
    act(() => result.current.onPointerMove({ clientX: 100, clientY: 100 } as unknown as React.PointerEvent, bounds));
    act(() => result.current.cancelCrop());
    expect(result.current.crop).toEqual({ x: 0.15, y: 0.1, w: 0.7, h: 0.75 });
  });

  it('resetCrop restores default crop and exits crop mode', () => {
    const { result } = renderHook(() => useCrop());
    act(() => result.current.enterCropMode());
    act(() => result.current.resetCrop());
    expect(result.current.cropMode).toBe(false);
    expect(result.current.crop).toEqual(DEFAULT_CROP);
  });

  it('restoreCrop restores the crop and exits crop mode', () => {
    const { result } = renderHook(() => useCrop());
    act(() => result.current.enterCropMode());
    act(() => result.current.restoreCrop({ x: 0.1, y: 0.2, w: 0.6, h: 0.5 }));
    expect(result.current.cropMode).toBe(false);
    expect(result.current.crop).toEqual({ x: 0.1, y: 0.2, w: 0.6, h: 0.5 });
  });

  it('onHandlePointerDown sets isDragging to true', () => {
    const { result } = renderHook(() => useCrop());
    const event = { clientX: 0, clientY: 0, preventDefault: () => {}, stopPropagation: () => {}, currentTarget: { setPointerCapture: () => {} } } as unknown as React.PointerEvent;
    act(() => result.current.onHandlePointerDown('move', event));
    expect(result.current.isDragging).toBe(true);
  });

  it('onPointerUp clears isDragging', () => {
    const { result } = renderHook(() => useCrop());
    const event = { clientX: 0, clientY: 0, preventDefault: () => {}, stopPropagation: () => {}, currentTarget: { setPointerCapture: () => {} } } as unknown as React.PointerEvent;
    act(() => result.current.onHandlePointerDown('move', event));
    act(() => result.current.onPointerUp());
    expect(result.current.isDragging).toBe(false);
  });

  it('dragging se handle grows the crop rect', () => {
    const { result } = renderHook(() => useCrop());
    const bounds = { x: 0, y: 0, w: 1000, h: 1000 };
    // Start with default crop {x:0, y:0, w:1, h:1} — se won't grow beyond 1
    // Use a smaller initial crop by dragging nw first to shrink, then se to grow
    const downNW = { clientX: 0, clientY: 0, preventDefault: () => {}, stopPropagation: () => {}, currentTarget: { setPointerCapture: () => {} } } as unknown as React.PointerEvent;
    act(() => result.current.onHandlePointerDown('nw', downNW));
    act(() => result.current.onPointerMove({ clientX: 200, clientY: 200 } as unknown as React.PointerEvent, bounds));
    act(() => result.current.onPointerUp());

    const cropAfterNW = result.current.crop;

    const downSE = { clientX: cropAfterNW.w * 1000, clientY: cropAfterNW.h * 1000, preventDefault: () => {}, stopPropagation: () => {}, currentTarget: { setPointerCapture: () => {} } } as unknown as React.PointerEvent;
    act(() => result.current.onHandlePointerDown('se', downSE));
    act(() => result.current.onPointerMove({ clientX: cropAfterNW.w * 1000 + 100, clientY: cropAfterNW.h * 1000 + 100 } as unknown as React.PointerEvent, bounds));

    expect(result.current.crop.w).toBeGreaterThan(cropAfterNW.w);
    expect(result.current.crop.h).toBeGreaterThan(cropAfterNW.h);
  });

  it('crop rect is always clamped within [0, 1]', () => {
    const { result } = renderHook(() => useCrop());
    const bounds = { x: 0, y: 0, w: 500, h: 500 };
    const event = { clientX: 0, clientY: 0, preventDefault: () => {}, stopPropagation: () => {}, currentTarget: { setPointerCapture: () => {} } } as unknown as React.PointerEvent;
    act(() => result.current.onHandlePointerDown('se', event));
    // Drag far beyond bounds
    act(() => result.current.onPointerMove({ clientX: 9999, clientY: 9999 } as unknown as React.PointerEvent, bounds));
    const { x, y, w, h } = result.current.crop;
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(x + w).toBeLessThanOrEqual(1);
    expect(y + h).toBeLessThanOrEqual(1);
  });

  it('crop rect never shrinks below minimum size', () => {
    const { result } = renderHook(() => useCrop());
    const bounds = { x: 0, y: 0, w: 500, h: 500 };
    const event = { clientX: 500, clientY: 500, preventDefault: () => {}, stopPropagation: () => {}, currentTarget: { setPointerCapture: () => {} } } as unknown as React.PointerEvent;
    act(() => result.current.onHandlePointerDown('nw', event));
    // Drag nw past se — would collapse the rect
    act(() => result.current.onPointerMove({ clientX: 9999, clientY: 9999 } as unknown as React.PointerEvent, bounds));
    expect(result.current.crop.w).toBeGreaterThanOrEqual(0.02);
    expect(result.current.crop.h).toBeGreaterThanOrEqual(0.02);
  });
});
