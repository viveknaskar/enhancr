import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import toast, { Toaster } from 'react-hot-toast';

import { EditSnapshot, DEFAULT_CROP, FILTER_DEFAULTS, ResizeUnit } from './types';
import { MAX_UPLOAD_BYTES } from './constants';
import { useHistory } from './hooks/useHistory';
import { useFilters } from './hooks/useFilters';
import { useTransform } from './hooks/useTransform';
import { useResize } from './hooks/useResize';
import { useExport } from './hooks/useExport';
import { useCrop } from './hooks/useCrop';
import { ImageUploadZone } from './components/ImageUploadZone';
import { ModeTabBar } from './components/ModeTabBar';
import { ActionBar } from './components/ActionBar';
import { EditMode } from './components/modes/EditMode';
import { ConvertMode } from './components/modes/ConvertMode';
import { ReduceMode } from './components/modes/ReduceMode';
import { SplitMode } from './components/modes/SplitMode';

type AppMode = 'edit' | 'convert' | 'reduce' | 'split';

const INITIAL_SNAPSHOT: EditSnapshot = {
  filters: FILTER_DEFAULTS,
  rotation: 0,
  flipH: false,
  flipV: false,
  crop: DEFAULT_CROP,
  resize: { enabled: false, width: 0, height: 0, unit: 'px', mode: 'fit', lockAspect: true },
};

function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageType, setImageType] = useState('image/jpeg');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<AppMode>('edit');
  const [mobileTab, setMobileTab] = useState<'transform' | 'color' | 'enhancement'>('transform');
  const [showOriginal, setShowOriginal] = useState(false);
  const [splitDirection, setSplitDirection] = useState<'vertical' | 'horizontal' | 'grid'>('grid');
  const [splitColumns, setSplitColumns] = useState(2);
  const [splitRows, setSplitRows] = useState(2);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeWorkerRef = useRef<Worker | null>(null);

  useEffect(() => { return () => { activeWorkerRef.current?.terminate(); }; }, []);

  const filters = useFilters();
  const transform = useTransform();
  const resize = useResize();
  const exportSettings = useExport(imageType);
  const cropTool = useCrop();
  const history = useHistory<EditSnapshot>(INITIAL_SNAPSHOT);

  // ── Undo / Redo ────────────────────────────────────────────────────────────

  const captureSnapshot = useCallback((): EditSnapshot => ({
    filters: { ...filters.filters },
    rotation: transform.rotation,
    flipH: transform.flipH,
    flipV: transform.flipV,
    crop: { ...cropTool.crop },
    resize: {
      enabled: resize.enabled,
      width: resize.width,
      height: resize.height,
      unit: resize.unit,
      mode: resize.mode,
      lockAspect: resize.lockAspect,
    },
  }), [cropTool.crop, filters.filters, resize.enabled, resize.height, resize.lockAspect, resize.mode, resize.unit, resize.width, transform.flipH, transform.flipV, transform.rotation]);

  const applySnapshot = useCallback((snap: EditSnapshot) => {
    filters.restoreFilters(snap.filters);
    transform.restoreTransform(snap.rotation, snap.flipH, snap.flipV);
    cropTool.restoreCrop(snap.crop);
    resize.restoreResize(snap.resize);
  }, [cropTool, filters, resize, transform]);

  const handleUndo = useCallback(() => {
    const snap = history.undo();
    if (snap) applySnapshot(snap);
  }, [history, applySnapshot]);

  const handleRedo = useCallback(() => {
    const snap = history.redo();
    if (snap) applySnapshot(snap);
  }, [history, applySnapshot]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleUndo, handleRedo]);

  const withHistory = useCallback(<T extends unknown[]>(fn: (...args: T) => void) =>
    (...args: T) => { history.push(captureSnapshot()); fn(...args); },
  [history, captureSnapshot]);

  const applyCropWithHistory = useCallback(() => {
    const snap = captureSnapshot();
    snap.crop = cropTool.getCropBeforeEdit();
    history.push(snap);
    cropTool.applyCrop();
  }, [captureSnapshot, cropTool, history]);

  const resetAll = useCallback(() => {
    history.push(captureSnapshot());
    filters.reset();
    transform.reset();
    resize.reset();
    cropTool.resetCrop();
  }, [filters, transform, resize, cropTool, history, captureSnapshot]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const outDims = useMemo(() => {
    const orig = resize.originalDimensions;
    const base = orig
      ? { w: Math.round(cropTool.crop.w * orig.w), h: Math.round(cropTool.crop.h * orig.h) }
      : undefined;
    return resize.getOutputDimensions(transform.rotation, base);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resize.getOutputDimensions, resize.originalDimensions, transform.rotation, cropTool.crop]);

  const outputMime = exportSettings.getMimeType();
  const showBgColor = outputMime === 'image/jpeg';
  const showQuality = outputMime === 'image/jpeg' || outputMime === 'image/webp';
  const sourceFormatLabel = imageType.replace('image/', '').toUpperCase();
  const outputFormatLabel = outputMime.replace('image/', '').toUpperCase();

  // ── Image loading ──────────────────────────────────────────────────────────

  const loadImageFromFile = useCallback((file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(`File is too large (max ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB). Please choose a smaller image.`);
      return;
    }
    setImageType(file.type);
    transform.reset();
    filters.reset();
    cropTool.resetCrop();
    history.push(INITIAL_SNAPSHOT);

    const reader = new FileReader();
    reader.onloadend = () => {
      const src = reader.result as string;
      setSelectedImage(src);
      const img = new Image();
      img.onload = () => resize.init(img.width, img.height);
      img.onerror = () => {
        setSelectedImage(null);
        toast.error('Failed to load image. The file may be corrupted or unsupported.');
      };
      img.src = src;
    };
    reader.onerror = () => toast.error('Failed to read the file. Please try again.');
    reader.readAsDataURL(file);
  }, [cropTool, filters, history, resize, transform]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImageFromFile(file);
  }, [loadImageFromFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) loadImageFromFile(file);
  }, [loadImageFromFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  // ── Canvas rendering ───────────────────────────────────────────────────────

  const applyDenoiseInWorker = useCallback((imageData: ImageData, strength: number): Promise<ImageData> =>
    new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./denoise.worker.ts', import.meta.url), { type: 'module' });
      activeWorkerRef.current = worker;
      worker.onmessage = (e) => {
        activeWorkerRef.current = null;
        resolve(new ImageData(e.data.data, imageData.width, imageData.height));
        worker.terminate();
      };
      worker.onerror = (e) => { activeWorkerRef.current = null; worker.terminate(); reject(e); };
      const copy = new Uint8ClampedArray(imageData.data);
      worker.postMessage({ data: copy, width: imageData.width, height: imageData.height, strength }, [copy.buffer]);
    }), []);

  const renderProcessedCanvas = useCallback(async (): Promise<HTMLCanvasElement> => {
    if (!selectedImage) throw new Error('No image selected');
    const canvas = document.createElement('canvas');

    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.src = selectedImage;
      img.onerror = () => reject(new Error('Failed to process the image. Please try again.'));
      img.onload = async () => {
        try {
          const cX = Math.round(cropTool.crop.x * img.width);
          const cY = Math.round(cropTool.crop.y * img.height);
          const cW = Math.round(cropTool.crop.w * img.width);
          const cH = Math.round(cropTool.crop.h * img.height);

          let srcX = 0, srcY = 0, srcW = cW, srcH = cH;
          let outW = cW, outH = cH;

          if (resize.enabled) {
            if (resize.unit === '%') {
              outW = Math.round(cW * resize.width / 100);
              outH = Math.round(cH * resize.height / 100);
            } else {
              const tw = resize.width || cW;
              const th = resize.height || cH;
              if (resize.mode === 'stretch') { outW = tw; outH = th; }
              else if (resize.mode === 'fit') {
                const scale = Math.min(tw / cW, th / cH);
                outW = Math.round(cW * scale);
                outH = Math.round(cH * scale);
              } else {
                outW = tw; outH = th;
                const scale = Math.max(tw / cW, th / cH);
                srcW = cW / scale; srcH = cH / scale;
                srcX = (cW - srcW) / 2; srcY = (cH - srcH) / 2;
              }
            }
          }

          const isSwapped = transform.rotation === 90 || transform.rotation === 270;
          canvas.width  = isSwapped ? outH : outW;
          canvas.height = isSwapped ? outW : outH;

          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Failed to initialize canvas. Try a smaller image or refresh the page.')); return; }

          if (exportSettings.getMimeType() === 'image/jpeg') {
            ctx.fillStyle = exportSettings.bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((transform.rotation * Math.PI) / 180);
          if (transform.flipH) ctx.scale(-1, 1);
          if (transform.flipV) ctx.scale(1, -1);
          ctx.filter = filters.filterString;
          ctx.drawImage(img, cX + srcX, cY + srcY, srcW, srcH, -outW / 2, -outH / 2, outW, outH);
          ctx.filter = 'none';
          ctx.restore();

          if (filters.filters.denoise > 0) {
            const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const denoised = await applyDenoiseInWorker(id, filters.filters.denoise / 100);
            ctx.putImageData(denoised, 0, 0);
          }
          resolve();
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Failed to process the image. Please try again.'));
        }
      };
    });

    return canvas;
  }, [selectedImage, cropTool.crop, resize.enabled, resize.height, resize.mode, resize.unit, resize.width, transform.rotation, transform.flipH, transform.flipV, filters.filterString, filters.filters.denoise, exportSettings, applyDenoiseInWorker]);

  // ── Download / Split ───────────────────────────────────────────────────────

  const downloadImage = useCallback(async () => {
    if (!selectedImage) return;
    setIsProcessing(true);
    try {
      const canvas = await renderProcessedCanvas();
      const mime = exportSettings.getMimeType();
      const quality = (mime === 'image/jpeg' || mime === 'image/webp') ? filters.filters.quality / 100 : undefined;
      const link = document.createElement('a');
      link.download = `${exportSettings.fileName.trim() || 'enhanced-image'}.${exportSettings.getExtension()}`;
      link.href = canvas.toDataURL(mime, quality);
      link.click();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process the image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedImage, renderProcessedCanvas, exportSettings, filters.filters.quality]);

  const splitImage = useCallback(async () => {
    if (!selectedImage) return;
    setIsProcessing(true);
    try {
      const canvas = await renderProcessedCanvas();
      const mime = exportSettings.getMimeType();
      const ext = exportSettings.getExtension();
      const quality = (mime === 'image/jpeg' || mime === 'image/webp') ? filters.filters.quality / 100 : undefined;
      const cols = splitDirection === 'horizontal' ? 1 : Math.max(1, splitColumns);
      const rows = splitDirection === 'vertical'   ? 1 : Math.max(1, splitRows);

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const sx = Math.round((col * canvas.width) / cols);
          const sy = Math.round((row * canvas.height) / rows);
          const ex = Math.round(((col + 1) * canvas.width) / cols);
          const ey = Math.round(((row + 1) * canvas.height) / rows);
          const piece = document.createElement('canvas');
          piece.width = ex - sx; piece.height = ey - sy;
          const ctx = piece.getContext('2d');
          if (!ctx) throw new Error('Failed to initialize canvas. Try a smaller image or refresh the page.');
          ctx.drawImage(canvas, sx, sy, piece.width, piece.height, 0, 0, piece.width, piece.height);
          const suffix = rows > 1 && cols > 1 ? `r${row + 1}-c${col + 1}` : rows > 1 ? `part-${row + 1}` : `part-${col + 1}`;
          const link = document.createElement('a');
          link.download = `${exportSettings.fileName.trim() || 'split-image'}-${suffix}.${ext}`;
          link.href = piece.toDataURL(mime, quality);
          link.click();
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to split the image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedImage, renderProcessedCanvas, exportSettings, filters.filters.quality, splitDirection, splitColumns, splitRows]);

  // ── Mode switching ─────────────────────────────────────────────────────────

  const handleModeChange = useCallback((next: AppMode) => {
    setMode(next);
    if (next === 'convert' && exportSettings.format === 'auto') exportSettings.setFormat('jpg');
    if (next === 'reduce') {
      if (!resize.enabled) resize.setEnabled(true);
      if (exportSettings.format === 'auto') exportSettings.setFormat('jpg');
    }
    if (next === 'split' && exportSettings.format === 'auto') exportSettings.setFormat('png');
  }, [exportSettings, resize]);

  // ── Shared export props ────────────────────────────────────────────────────

  const sharedExportSettings = {
    format: exportSettings.format,
    bgColor: exportSettings.bgColor,
    fileName: exportSettings.fileName,
    extension: exportSettings.getExtension(),
    showBgColor,
    showQuality,
    quality: filters.filters.quality,
    onFormatChange: exportSettings.setFormat,
    onBgColorChange: exportSettings.setBgColor,
    onFileNameChange: exportSettings.setFileName,
    onQualityChange: (v: number) => filters.setFilter('quality', v),
  };

  const headerSubtitle: Record<AppMode, string> = {
    edit:    'Upload an image and enhance it with real-time filters',
    convert: 'Upload an image and convert it locally in your browser',
    reduce:  'Upload an image and reduce file size with resize and compression controls',
    split:   'Upload an image and split it into multiple pieces locally in your browser',
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#1e1b4b', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' },
          error: { duration: 5000 },
        }}
      />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-purple-700/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <header className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <img src="/enhancr/logo.svg" alt="" className="h-14" aria-hidden="true" />
          </div>
          <h1 className="sr-only">Enhancr</h1>
          <p className="text-slate-400 text-sm">{headerSubtitle[mode]}</p>
          <ModeTabBar mode={mode} onChange={handleModeChange} />
        </header>

        <ImageUploadZone
          selectedImage={selectedImage}
          isDragging={isDragging}
          isProcessing={isProcessing}
          showOriginal={showOriginal}
          mode={mode}
          setShowOriginal={setShowOriginal}
          filterString={filters.filterString}
          previewTransform={transform.previewTransform}
          cropMode={cropTool.cropMode}
          crop={cropTool.crop}
          originalDimensions={resize.originalDimensions}
          outDims={outDims}
          resizeEnabled={resize.enabled}
          rotation={transform.rotation}
          splitDirection={splitDirection}
          splitColumns={splitColumns}
          splitRows={splitRows}
          isDraggingCrop={cropTool.isDragging}
          onHandlePointerDown={cropTool.onHandlePointerDown}
          onPointerMove={cropTool.onPointerMove}
          onPointerUp={cropTool.onPointerUp}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onFileChange={handleImageUpload}
          onReplaceClick={() => fileInputRef.current?.click()}
          fileInputRef={fileInputRef}
        />

        {mode === 'edit' && (
          <EditMode
            mobileTab={mobileTab}
            onMobileTabChange={setMobileTab}
            transform={{
              flipH: transform.flipH,
              flipV: transform.flipV,
              onRotateLeft: transform.rotateLeft,
              onRotateRight: transform.rotateRight,
              onToggleFlipH: transform.toggleFlipH,
              onToggleFlipV: transform.toggleFlipV,
            }}
            crop={{
              active: cropTool.cropMode,
              onEnter: cropTool.enterCropMode,
              onApply: applyCropWithHistory,
              onCancel: cropTool.cancelCrop,
            }}
            resize={{
              enabled: resize.enabled,
              width: resize.width,
              height: resize.height,
              unit: resize.unit,
              mode: resize.mode,
              lockAspect: resize.lockAspect,
              outDims,
              onToggle: () => resize.setEnabled((v) => !v),
              onWidthChange: resize.handleWidthChange,
              onHeightChange: resize.handleHeightChange,
              onUnitChange: resize.handleUnitChange,
              onModeChange: resize.setMode,
              onLockAspectToggle: () => resize.setLockAspect((v) => !v),
            }}
            filters={{
              values: filters.filters,
              onChange: filters.setFilter,
              onDragStart: () => history.push(captureSnapshot()),
            }}
            exportSettings={{ ...sharedExportSettings }}
            withHistory={withHistory}
          />
        )}

        {mode === 'convert' && (
          <ConvertMode
            selectedImage={selectedImage}
            sourceFormatLabel={sourceFormatLabel}
            outputFormatLabel={outputFormatLabel}
            exportSettings={sharedExportSettings}
          />
        )}

        {mode === 'reduce' && (
          <ReduceMode
            selectedImage={selectedImage}
            sourceFormatLabel={sourceFormatLabel}
            outputFormatLabel={outputFormatLabel}
            originalDimensions={resize.originalDimensions}
            outDims={outDims}
            resize={{
              enabled: resize.enabled,
              width: resize.width,
              height: resize.height,
              unit: resize.unit as ResizeUnit,
              mode: resize.mode,
              lockAspect: resize.lockAspect,
              onToggle: () => resize.setEnabled((v) => !v),
              onWidthChange: resize.handleWidthChange,
              onHeightChange: resize.handleHeightChange,
              onUnitChange: resize.handleUnitChange,
              onModeChange: resize.setMode,
              onLockAspectToggle: () => resize.setLockAspect((v) => !v),
            }}
            exportSettings={sharedExportSettings}
            withHistory={withHistory}
          />
        )}

        {mode === 'split' && (
          <SplitMode
            selectedImage={selectedImage}
            sourceFormatLabel={sourceFormatLabel}
            outputFormatLabel={outputFormatLabel}
            splitDirection={splitDirection}
            setSplitDirection={setSplitDirection}
            splitColumns={splitColumns}
            setSplitColumns={setSplitColumns}
            splitRows={splitRows}
            setSplitRows={setSplitRows}
            exportSettings={sharedExportSettings}
          />
        )}

        <ActionBar
          mode={mode}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          hasImage={!!selectedImage}
          isProcessing={isProcessing}
          onReset={resetAll}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onPrimary={mode === 'split' ? splitImage : downloadImage}
        />
      </div>
    </div>
  );
}

export default App;
