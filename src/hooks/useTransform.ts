import { useState, useCallback, useMemo } from 'react';

export function useTransform() {
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  const rotateLeft = useCallback(() => setRotation((r) => (r - 90 + 360) % 360), []);
  const rotateRight = useCallback(() => setRotation((r) => (r + 90) % 360), []);
  const toggleFlipH = useCallback(() => setFlipH((v) => !v), []);
  const toggleFlipV = useCallback(() => setFlipV((v) => !v), []);

  const previewTransform = useMemo(() => {
    const parts: string[] = [];
    if (rotation) parts.push(`rotate(${rotation}deg)`);
    if (flipH) parts.push('scaleX(-1)');
    if (flipV) parts.push('scaleY(-1)');
    return parts.join(' ') || undefined;
  }, [rotation, flipH, flipV]);

  const reset = useCallback(() => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
  }, []);

  const restoreTransform = useCallback((rotation: number, flipH: boolean, flipV: boolean) => {
    setRotation(rotation);
    setFlipH(flipH);
    setFlipV(flipV);
  }, []);

  return { rotation, flipH, flipV, rotateLeft, rotateRight, toggleFlipH, toggleFlipV, previewTransform, reset, restoreTransform };
}
