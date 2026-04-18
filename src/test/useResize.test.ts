import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResize } from '../hooks/useResize';

describe('useResize', () => {
  it('initialises with resize disabled and no dimensions', () => {
    const { result } = renderHook(() => useResize());
    expect(result.current.enabled).toBe(false);
    expect(result.current.originalDimensions).toBeNull();
  });

  it('sets dimensions and disables resize on init', () => {
    const { result } = renderHook(() => useResize());
    act(() => result.current.init(1920, 1080));
    expect(result.current.width).toBe(1920);
    expect(result.current.height).toBe(1080);
    expect(result.current.originalDimensions).toEqual({ w: 1920, h: 1080 });
    expect(result.current.enabled).toBe(false);
  });

  it('locks aspect ratio when changing width', () => {
    const { result } = renderHook(() => useResize());
    act(() => result.current.init(1000, 500)); // 2:1
    act(() => result.current.handleWidthChange(500));
    expect(result.current.height).toBe(250);
  });

  it('locks aspect ratio when changing height', () => {
    const { result } = renderHook(() => useResize());
    act(() => result.current.init(1000, 500)); // 2:1
    act(() => result.current.handleHeightChange(250));
    expect(result.current.width).toBe(500);
  });

  it('does not lock aspect ratio when lockAspect is false', () => {
    const { result } = renderHook(() => useResize());
    act(() => result.current.init(1000, 500));
    act(() => result.current.setLockAspect(false));
    act(() => result.current.handleWidthChange(200));
    expect(result.current.height).toBe(500); // unchanged
  });

  it('switches to percentage mode and resets to 100/100', () => {
    const { result } = renderHook(() => useResize());
    act(() => result.current.init(800, 600));
    act(() => result.current.handleUnitChange('%'));
    expect(result.current.unit).toBe('%');
    expect(result.current.width).toBe(100);
    expect(result.current.height).toBe(100);
  });

  it('switches back to px mode and restores original dimensions', () => {
    const { result } = renderHook(() => useResize());
    act(() => result.current.init(800, 600));
    act(() => result.current.handleUnitChange('%'));
    act(() => result.current.handleUnitChange('px'));
    expect(result.current.width).toBe(800);
    expect(result.current.height).toBe(600);
  });

  it('getOutputDimensions returns original dims when resize is disabled', () => {
    const { result } = renderHook(() => useResize());
    act(() => result.current.init(800, 600));
    expect(result.current.getOutputDimensions(0)).toEqual({ w: 800, h: 600 });
  });

  it('getOutputDimensions swaps w/h for 90° rotation', () => {
    const { result } = renderHook(() => useResize());
    act(() => result.current.init(800, 600));
    expect(result.current.getOutputDimensions(90)).toEqual({ w: 600, h: 800 });
  });

  it('getOutputDimensions swaps w/h for 270° rotation', () => {
    const { result } = renderHook(() => useResize());
    act(() => result.current.init(800, 600));
    expect(result.current.getOutputDimensions(270)).toEqual({ w: 600, h: 800 });
  });

  it('getOutputDimensions does not swap for 180° rotation', () => {
    const { result } = renderHook(() => useResize());
    act(() => result.current.init(800, 600));
    expect(result.current.getOutputDimensions(180)).toEqual({ w: 800, h: 600 });
  });

  it('getOutputDimensions respects fit mode — scales to fit target', () => {
    const { result } = renderHook(() => useResize());
    act(() => result.current.init(1000, 500));
    act(() => result.current.setEnabled(true));
    act(() => result.current.setMode('fit'));
    act(() => result.current.setLockAspect(false));
    act(() => result.current.handleWidthChange(400));
    act(() => result.current.handleHeightChange(400));
    const dims = result.current.getOutputDimensions(0);
    // scale = min(400/1000, 400/500) = min(0.4, 0.8) = 0.4 → 400×200
    expect(dims).toEqual({ w: 400, h: 200 });
  });

  it('getOutputDimensions respects stretch mode', () => {
    const { result } = renderHook(() => useResize());
    act(() => result.current.init(1000, 500));
    act(() => result.current.setEnabled(true));
    act(() => result.current.setMode('stretch'));
    act(() => result.current.setLockAspect(false));
    act(() => result.current.handleWidthChange(300));
    act(() => result.current.handleHeightChange(700));
    expect(result.current.getOutputDimensions(0)).toEqual({ w: 300, h: 700 });
  });

  it('reset restores original dimensions and disables resize', () => {
    const { result } = renderHook(() => useResize());
    act(() => result.current.init(800, 600));
    act(() => {
      result.current.setEnabled(true);
      result.current.handleWidthChange(400);
    });
    act(() => result.current.reset());
    expect(result.current.enabled).toBe(false);
    expect(result.current.width).toBe(800);
    expect(result.current.height).toBe(600);
  });

  it('restoreResize restores the full resize state', () => {
    const { result } = renderHook(() => useResize());
    act(() => result.current.init(800, 600));
    act(() => result.current.restoreResize({
      enabled: true,
      width: 320,
      height: 240,
      unit: 'px',
      mode: 'crop',
      lockAspect: false,
    }));
    expect(result.current.enabled).toBe(true);
    expect(result.current.width).toBe(320);
    expect(result.current.height).toBe(240);
    expect(result.current.unit).toBe('px');
    expect(result.current.mode).toBe('crop');
    expect(result.current.lockAspect).toBe(false);
  });
});
