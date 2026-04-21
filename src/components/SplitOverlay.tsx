import { useRef, useState, useLayoutEffect } from 'react';

type SplitDirection = 'vertical' | 'horizontal' | 'grid';

interface Props {
  splitDirection: SplitDirection;
  splitColumns: number;
  splitRows: number;
  naturalWidth: number;
  naturalHeight: number;
}

function getImageBounds(container: HTMLDivElement, natW: number, natH: number) {
  const cW = container.clientWidth;
  const cH = container.clientHeight;
  if (natW === 0 || natH === 0) return { x: 0, y: 0, w: cW, h: cH };
  const scale = Math.min(cW / natW, cH / natH);
  return { x: (cW - natW * scale) / 2, y: (cH - natH * scale) / 2, w: natW * scale, h: natH * scale };
}

export function SplitOverlay({ splitDirection, splitColumns, splitRows, naturalWidth, naturalHeight }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ x: 0, y: 0, w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setBounds(getImageBounds(el, naturalWidth, naturalHeight));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [naturalWidth, naturalHeight]);

  const cols = splitDirection === 'horizontal' ? 1 : Math.max(1, splitColumns);
  const rows = splitDirection === 'vertical'   ? 1 : Math.max(1, splitRows);

  const vLines = cols > 1 ? Array.from({ length: cols - 1 }, (_, i) => (i + 1) / cols) : [];
  const hLines = rows > 1 ? Array.from({ length: rows - 1 }, (_, i) => (i + 1) / rows) : [];

  const pieceCount = cols * rows;

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <div
        style={{
          position: 'absolute',
          left: bounds.x,
          top: bounds.y,
          width: bounds.w,
          height: bounds.h,
        }}
      >
        <div className="absolute inset-0 border border-white/40" />

        {vLines.map((frac) => (
          <div
            key={`v-${frac}`}
            style={{
              position: 'absolute',
              left: `${frac * 100}%`,
              top: 0,
              bottom: 0,
              width: 1,
              background: 'rgba(255,255,255,0.75)',
              boxShadow: '1px 0 3px rgba(0,0,0,0.4)',
            }}
          />
        ))}

        {hLines.map((frac) => (
          <div
            key={`h-${frac}`}
            style={{
              position: 'absolute',
              top: `${frac * 100}%`,
              left: 0,
              right: 0,
              height: 1,
              background: 'rgba(255,255,255,0.75)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
            }}
          />
        ))}

        <div className="absolute top-2 right-2 text-xs font-mono text-white bg-black/60 px-2 py-0.5 rounded">
          {pieceCount} {pieceCount === 1 ? 'piece' : 'pieces'}
        </div>
      </div>
    </div>
  );
}
