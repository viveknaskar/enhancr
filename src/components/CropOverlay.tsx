import { useRef, useState, useLayoutEffect, useCallback } from 'react';
import type { PointerEvent } from 'react';
import { CropRect, CropHandle } from '../types';
import { ImageBounds } from '../hooks/useCrop';
import { CROP_SHADOW_SPREAD, CROP_OVERLAY_OPACITY, CROP_GRID_OPACITY } from '../constants';

interface CropOverlayProps {
  crop: CropRect;
  naturalWidth: number;
  naturalHeight: number;
  onHandlePointerDown: (handle: CropHandle, e: PointerEvent) => void;
  onPointerMove: (e: PointerEvent, bounds: ImageBounds) => void;
  onPointerUp: () => void;
  isDragging: boolean;
}

const HANDLES: CropHandle[] = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];

const HANDLE_POS: Record<string, { left: string; top: string }> = {
  nw: { left: '0%',   top: '0%'   },
  n:  { left: '50%',  top: '0%'   },
  ne: { left: '100%', top: '0%'   },
  w:  { left: '0%',   top: '50%'  },
  e:  { left: '100%', top: '50%'  },
  sw: { left: '0%',   top: '100%' },
  s:  { left: '50%',  top: '100%' },
  se: { left: '100%', top: '100%' },
};

const HANDLE_CURSOR: Record<string, string> = {
  nw: 'nwse-resize', n: 'ns-resize',  ne: 'nesw-resize',
  w:  'ew-resize',                    e:  'ew-resize',
  sw: 'nesw-resize', s: 'ns-resize',  se: 'nwse-resize',
};

function getImageBounds(container: HTMLDivElement, natW: number, natH: number): ImageBounds {
  const cW = container.clientWidth;
  const cH = container.clientHeight;
  if (natW === 0 || natH === 0) return { x: 0, y: 0, w: cW, h: cH };
  const scale = Math.min(cW / natW, cH / natH);
  const rW = natW * scale;
  const rH = natH * scale;
  return { x: (cW - rW) / 2, y: (cH - rH) / 2, w: rW, h: rH };
}

export function CropOverlay({
  crop, naturalWidth, naturalHeight,
  onHandlePointerDown, onPointerMove, onPointerUp, isDragging,
}: CropOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<ImageBounds>({ x: 0, y: 0, w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setBounds(getImageBounds(el, naturalWidth, naturalHeight));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [naturalWidth, naturalHeight]);

  const handlePointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    onPointerMove(e, bounds);
  }, [onPointerMove, bounds]);

  // Crop box position/size in px within the container
  const boxLeft   = bounds.x + crop.x * bounds.w;
  const boxTop    = bounds.y + crop.y * bounds.h;
  const boxWidth  = crop.w * bounds.w;
  const boxHeight = crop.h * bounds.h;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 select-none"
      style={{ cursor: isDragging ? 'crosshair' : 'default', touchAction: 'none' }}
      onPointerMove={handlePointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* Dark overlay outside the crop box via box-shadow */}
      <div
        style={{
          position: 'absolute',
          left: boxLeft,
          top: boxTop,
          width: boxWidth,
          height: boxHeight,
          boxShadow: `0 0 0 ${CROP_SHADOW_SPREAD} rgba(0,0,0,${CROP_OVERLAY_OPACITY})`,
          border: '1.5px solid rgba(255,255,255,0.85)',
          boxSizing: 'content-box',
          cursor: 'move',
          touchAction: 'none',
        }}
        onPointerDown={(e) => onHandlePointerDown('move', e)}
      >
        {/* Rule-of-thirds grid */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: '33.33%', height: 1, background: `rgba(255,255,255,${CROP_GRID_OPACITY})` }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: '66.66%', height: 1, background: `rgba(255,255,255,${CROP_GRID_OPACITY})` }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '33.33%', width: 1, background: `rgba(255,255,255,${CROP_GRID_OPACITY})` }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '66.66%', width: 1, background: `rgba(255,255,255,${CROP_GRID_OPACITY})` }} />
        </div>

        {/* 8 resize handles */}
        {HANDLES.map((handle) => (
          <div
            key={handle}
            onPointerDown={(e) => { e.stopPropagation(); onHandlePointerDown(handle, e); }}
            style={{
              position: 'absolute',
              left: HANDLE_POS[handle].left,
              top: HANDLE_POS[handle].top,
              transform: 'translate(-50%, -50%)',
              width: 20,
              height: 20,
              background: 'white',
              border: '2px solid #7c3aed',
              borderRadius: 2,
              cursor: HANDLE_CURSOR[handle],
            }}
          />
        ))}
      </div>

      {/* Dimension label */}
      {(() => {
        const w = Math.round(crop.w * naturalWidth);
        const h = Math.round(crop.h * naturalHeight);
        return (
          <>
            <div
              style={{
                position: 'absolute',
                left: boxLeft,
                top: Math.max(0, boxTop - 26),
                pointerEvents: 'none',
              }}
              className="text-xs font-mono text-white bg-black/60 px-2 py-0.5 rounded"
              aria-hidden="true"
            >
              {w} × {h} px
            </div>
            <span className="sr-only" role="status" aria-live="polite">
              Crop selection: {w} by {h} pixels
            </span>
          </>
        );
      })()}
    </div>
  );
}
