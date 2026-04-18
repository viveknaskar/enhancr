import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  Upload, Sliders, Download, ZoomIn, Sparkles,
  RotateCcw, RotateCw, FlipHorizontal, FlipVertical,
  Lock, Unlock, Maximize2, Crop,
} from 'lucide-react';

import { ExportFormat, ResizeMode, FILTER_DEFAULTS, EditSnapshot, DEFAULT_CROP } from './types';
import { MAX_UPLOAD_BYTES } from './constants';
import { useHistory } from './hooks/useHistory';
import { useFilters } from './hooks/useFilters';
import { useTransform } from './hooks/useTransform';
import { useResize } from './hooks/useResize';
import { useExport } from './hooks/useExport';
import { useCrop } from './hooks/useCrop';
import { SliderRow } from './components/SliderRow';
import { SectionHeader } from './components/SectionHeader';
import { IconBtn } from './components/IconBtn';
import { CropOverlay } from './components/CropOverlay';

const INITIAL_SNAPSHOT: EditSnapshot = {
  filters: FILTER_DEFAULTS,
  rotation: 0,
  flipH: false,
  flipV: false,
  crop: DEFAULT_CROP,
  resize: {
    enabled: false,
    width: 0,
    height: 0,
    unit: 'px',
    mode: 'fit',
    lockAspect: true,
  },
};

function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageType, setImageType] = useState('image/jpeg');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<'edit' | 'convert' | 'reduce'>('edit');
  const [mobileTab, setMobileTab] = useState<'transform' | 'color' | 'enhancement'>('transform');
  const [showOriginal, setShowOriginal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeWorkerRef = useRef<Worker | null>(null);

  useEffect(() => {
    return () => { activeWorkerRef.current?.terminate(); };
  }, []);

  const filters = useFilters();
  const transform = useTransform();
  const resize = useResize();
  const exportSettings = useExport(imageType);
  const cropTool = useCrop();

  // ── Undo / Redo ────────────────────────────────────────────────────────────

  const history = useHistory<EditSnapshot>(INITIAL_SNAPSHOT);

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
  }), [
    cropTool.crop,
    filters.filters,
    resize.enabled,
    resize.height,
    resize.lockAspect,
    resize.mode,
    resize.unit,
    resize.width,
    transform.flipH,
    transform.flipV,
    transform.rotation,
  ]);

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

  // Keyboard shortcut: Ctrl/Cmd + Z → undo, Ctrl/Cmd + Shift + Z → redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleUndo, handleRedo]);

  // Wraps any action: push current state to history, then run the action.
  const withHistory = useCallback(<T extends unknown[]>(fn: (...args: T) => void) =>
    (...args: T) => { history.push(captureSnapshot()); fn(...args); },
  [history, captureSnapshot]);

  const applyCropWithHistory = useCallback(() => {
    const snap = captureSnapshot();
    snap.crop = cropTool.getCropBeforeEdit();
    history.push(snap);
    cropTool.applyCrop();
  }, [captureSnapshot, cropTool, history]);

  const outDims = useMemo(
    () => resize.getOutputDimensions(transform.rotation),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resize.getOutputDimensions, transform.rotation],
  );

  const outputMime = exportSettings.getMimeType();
  const showBgColor = outputMime === 'image/jpeg';
  const showQuality = outputMime === 'image/jpeg' || outputMime === 'image/webp';
  const sourceFormatLabel = imageType.replace('image/', '').toUpperCase();
  const outputFormatLabel = outputMime.replace('image/', '').toUpperCase();
  const isEditMode = mode === 'edit';
  const isConvertMode = mode === 'convert';
  const isReduceMode = mode === 'reduce';

  // ── Image loading ──────────────────────────────────────────────────────────

  const loadImageFromFile = useCallback((file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      const maxMb = MAX_UPLOAD_BYTES / (1024 * 1024);
      toast.error(`File is too large (max ${maxMb} MB). Please choose a smaller image.`);
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
    reader.onerror = () => {
      toast.error('Failed to read the file. Please try again.');
    };
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  // ── Denoise worker ─────────────────────────────────────────────────────────

  const applyDenoiseInWorker = useCallback((imageData: ImageData, strength: number): Promise<ImageData> =>
    new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./denoise.worker.ts', import.meta.url), { type: 'module' });
      activeWorkerRef.current = worker;
      worker.onmessage = (e) => {
        activeWorkerRef.current = null;
        resolve(new ImageData(e.data.data, imageData.width, imageData.height));
        worker.terminate();
      };
      worker.onerror = (e) => {
        activeWorkerRef.current = null;
        worker.terminate();
        reject(e);
      };
      const copy = new Uint8ClampedArray(imageData.data);
      worker.postMessage({ data: copy, width: imageData.width, height: imageData.height, strength }, [copy.buffer]);
    }), []);

  // ── Download ───────────────────────────────────────────────────────────────

  const downloadImage = useCallback(async () => {
    if (!selectedImage) return;
    setIsProcessing(true);

    const canvas = document.createElement('canvas');
    const img = new Image();
    img.src = selectedImage;

    img.onerror = () => {
      setIsProcessing(false);
      toast.error('Failed to process the image. Please try again.');
    };

    img.onload = async () => {
      // Apply the user's crop selection (fractional → native pixels).
      // When crop mode is off, crop is DEFAULT_CROP {0,0,1,1} — a no-op.
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
          if (resize.mode === 'stretch') {
            outW = tw; outH = th;
          } else if (resize.mode === 'fit') {
            const scale = Math.min(tw / cW, th / cH);
            outW = Math.round(cW * scale);
            outH = Math.round(cH * scale);
          } else {
            // resize crop: scale to fill, then center-crop within the user-cropped region
            outW = tw; outH = th;
            const scale = Math.max(tw / cW, th / cH);
            srcW = cW / scale;
            srcH = cH / scale;
            srcX = (cW - srcW) / 2;
            srcY = (cH - srcH) / 2;
          }
        }
      }

      const isSwapped = transform.rotation === 90 || transform.rotation === 270;
      canvas.width = isSwapped ? outH : outW;
      canvas.height = isSwapped ? outW : outH;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsProcessing(false);
        toast.error('Failed to initialize canvas. Try a smaller image or refresh the page.');
        return;
      }

      const mime = exportSettings.getMimeType();
      if (mime === 'image/jpeg') {
        ctx.fillStyle = exportSettings.bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((transform.rotation * Math.PI) / 180);
      if (transform.flipH) ctx.scale(-1, 1);
      if (transform.flipV) ctx.scale(1, -1);
      ctx.filter = filters.filterString;
      ctx.drawImage(img, cX + srcX, cY + srcY, srcW, srcH, -outW / 2, -outH / 2, outW, outH);
      ctx.filter = 'none';
      ctx.restore();

      if (filters.filters.denoise > 0) {
        try {
          const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const denoised = await applyDenoiseInWorker(id, filters.filters.denoise / 100);
          ctx.putImageData(denoised, 0, 0);
        } catch {
          setIsProcessing(false);
          toast.error('Noise reduction failed. The image will be exported without it.');
          return;
        }
      }

      const ext = exportSettings.getExtension();
      const quality = (mime === 'image/jpeg' || mime === 'image/webp')
        ? filters.filters.quality / 100
        : undefined;
      const link = document.createElement('a');
      link.download = `${exportSettings.fileName.trim() || 'enhanced-image'}.${ext}`;
      link.href = canvas.toDataURL(mime, quality);
      link.click();
      setIsProcessing(false);
    };
  }, [selectedImage, resize, transform, filters, exportSettings, applyDenoiseInWorker, cropTool]);

  // ── Reset all ──────────────────────────────────────────────────────────────

  const resetAll = useCallback(() => {
    history.push(captureSnapshot());
    filters.reset();
    transform.reset();
    resize.reset();
    cropTool.resetCrop();
  }, [filters, transform, resize, cropTool, history, captureSnapshot]);

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
      {/* Ambient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-purple-700/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <img src="/enhancr/logo.svg" alt="" className="h-14" aria-hidden="true" />
          </div>
          <h1 className="sr-only">Enhancr</h1>
          <p className="text-slate-400 text-sm">
            {isEditMode
              ? 'Upload an image and enhance it with real-time filters'
              : isConvertMode
                ? 'Upload an image and convert it locally in your browser'
                : 'Upload an image and reduce file size with resize and compression controls'}
          </p>
          <div className="mt-4 inline-flex rounded-xl bg-white/5 border border-white/10 p-1 gap-1">
            <button
              onClick={() => setMode('edit')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isEditMode ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Edit
            </button>
            <button
              onClick={() => {
                setMode('convert');
                if (exportSettings.format === 'auto') exportSettings.setFormat('jpg');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isConvertMode ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Convert
            </button>
            <button
              onClick={() => {
                setMode('reduce');
                if (!resize.enabled) resize.setEnabled(true);
                if (exportSettings.format === 'auto') exportSettings.setFormat('jpg');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isReduceMode ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Reduce
            </button>
          </div>
        </header>

        {/* ── Upload / Preview ── */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 mb-5">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/tiff"
            onChange={handleImageUpload}
          />

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => { if (!cropTool.cropMode) fileInputRef.current?.click(); }}
            className={`relative h-56 sm:h-72 md:h-80 rounded-xl border-2 border-dashed flex items-center justify-center transition-colors duration-200 overflow-hidden ${
              cropTool.cropMode
                ? 'border-violet-500 cursor-default'
                : `cursor-pointer ${isDragging ? 'border-violet-500 bg-violet-500/10' : 'border-white/10 bg-black/20 hover:border-violet-500/50 hover:bg-violet-500/5'}`
            }`}
          >
            {selectedImage ? (
              <>
                <img
                  src={selectedImage}
                  alt="Preview"
                  className="w-full h-full object-contain"
                  style={{
                    filter: showOriginal ? 'none' : filters.filterString,
                    transform: showOriginal ? 'none' : transform.previewTransform,
                  }}
                />
                {!isProcessing && !cropTool.cropMode && isEditMode && (
                  <button
                    onPointerDown={() => setShowOriginal(true)}
                    onPointerUp={() => setShowOriginal(false)}
                    onPointerLeave={() => setShowOriginal(false)}
                    className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg text-xs font-medium bg-black/60 text-slate-300 border border-white/10 hover:bg-black/80 select-none"
                    aria-label={showOriginal ? 'Showing original' : 'Hold to compare original'}
                  >
                    {showOriginal ? 'Original' : 'Compare'}
                  </button>
                )}
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3 rounded-xl">
                    <svg className="w-8 h-8 animate-spin text-violet-400" viewBox="0 0 24 24" fill="none" aria-label="Processing">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span className="text-sm text-slate-300">Processing…</span>
                  </div>
                )}
                {cropTool.cropMode && resize.originalDimensions && (
                  <CropOverlay
                    crop={cropTool.crop}
                    naturalWidth={resize.originalDimensions.w}
                    naturalHeight={resize.originalDimensions.h}
                    onHandlePointerDown={cropTool.onHandlePointerDown}
                    onPointerMove={cropTool.onPointerMove}
                    onPointerUp={cropTool.onPointerUp}
                    isDragging={cropTool.isDragging}
                  />
                )}
              </>
            ) : (
              <div className="text-center pointer-events-none">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-4">
                  <Upload className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-slate-300 font-medium mb-1">Drop your image here</p>
                <p className="text-slate-500 text-sm mb-5">PNG, JPG, WebP, GIF, AVIF, TIFF supported</p>
                <span className="inline-block bg-violet-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg">
                  Choose File
                </span>
              </div>
            )}
          </div>

          {selectedImage && (
            <div className="flex items-center justify-between mt-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-slate-400 hover:text-violet-400 transition-colors underline underline-offset-2"
              >
                Replace image
              </button>
              {outDims && (
                <span className="text-xs text-slate-500 font-mono">
                  {resize.originalDimensions?.w} × {resize.originalDimensions?.h}
                  {(resize.enabled || transform.rotation % 180 !== 0) && (
                    <span className="text-violet-400 ml-1">→ {outDims.w} × {outDims.h}</span>
                  )}
                  {' '}px
                </span>
              )}
            </div>
          )}
        </div>

        {isEditMode ? (
          <>
            {/* ── Mobile tab bar (hidden on md+) ── */}
            <div className="md:hidden flex rounded-xl bg-white/5 border border-white/10 p-1 mb-3 gap-1">
              {([
                { id: 'transform',   label: 'Transform',   icon: <RotateCw className="w-3.5 h-3.5" /> },
                { id: 'color',       label: 'Colors',      icon: <Sparkles className="w-3.5 h-3.5" /> },
                { id: 'enhancement', label: 'Enhancement', icon: <ZoomIn className="w-3.5 h-3.5" /> },
              ] as const).map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => setMobileTab(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    mobileTab === id
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            {/* ── Feature cards grid ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">

          {/* Column 1: Transform + Resize */}
          <div className={`flex flex-col gap-5 md:flex ${mobileTab === 'transform' ? 'flex' : 'hidden'}`}>

            {/* Transform */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
              <SectionHeader icon={<RotateCw className="w-3.5 h-3.5" />} label="Transform" />
              <div className="grid grid-cols-4 gap-2">
                <IconBtn onClick={withHistory(transform.rotateLeft)} title="Rotate 90° left">
                  <RotateCcw className="w-4 h-4" />
                  <span>Left</span>
                </IconBtn>
                <IconBtn onClick={withHistory(transform.rotateRight)} title="Rotate 90° right">
                  <RotateCw className="w-4 h-4" />
                  <span>Right</span>
                </IconBtn>
                <IconBtn onClick={withHistory(transform.toggleFlipH)} active={transform.flipH} title="Flip horizontal">
                  <FlipHorizontal className="w-4 h-4" />
                  <span>Flip H</span>
                </IconBtn>
                <IconBtn onClick={withHistory(transform.toggleFlipV)} active={transform.flipV} title="Flip vertical">
                  <FlipVertical className="w-4 h-4" />
                  <span>Flip V</span>
                </IconBtn>
              </div>

              {/* Crop */}
              <div className="mt-2 border-t border-white/5 pt-3">
                {cropTool.cropMode ? (
                  <>
                    <p className="text-xs text-slate-500 mb-2 leading-relaxed">
                      Drag the box or handles to select a region.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={applyCropWithHistory}
                        className="flex-1 py-1.5 text-xs rounded-lg font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors"
                      >
                        Apply
                      </button>
                      <button
                        onClick={cropTool.cancelCrop}
                        className="flex-1 py-1.5 text-xs rounded-lg font-semibold bg-white/10 hover:bg-white/15 text-slate-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <IconBtn onClick={cropTool.enterCropMode} title="Crop image">
                    <div className="flex items-center gap-1.5">
                      <Crop className="w-4 h-4" />
                      <span>Crop</span>
                    </div>
                  </IconBtn>
                )}
              </div>
            </div>

            {/* Resize */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="text-violet-400"><Maximize2 className="w-3.5 h-3.5" /></div>
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Resize</span>
                <div className="flex-1 h-px bg-white/5" />
                  <button
                    onClick={withHistory(() => resize.setEnabled((v) => !v))}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      resize.enabled ? 'bg-violet-600 text-white' : 'bg-white/10 text-slate-400 hover:bg-white/15'
                    }`}
                >
                  {resize.enabled ? 'On' : 'Off'}
                </button>
              </div>

              {resize.enabled ? (
                <div className="space-y-3">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-slate-500 mb-1 block">Width</label>
                      <input
                        type="number" min={1} value={resize.width}
                        onChange={withHistory((e: React.ChangeEvent<HTMLInputElement>) => resize.handleWidthChange(Number(e.target.value)))}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-violet-500/60 transition-colors"
                      />
                    </div>
                    <button
                      onClick={withHistory(() => resize.setLockAspect((v) => !v))}
                      title={resize.lockAspect ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                      className={`p-2 rounded-lg transition-colors ${resize.lockAspect ? 'text-violet-400 bg-violet-500/15' : 'text-slate-500 bg-white/5 hover:bg-white/10'}`}
                    >
                      {resize.lockAspect ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                    <div className="flex-1">
                      <label className="text-xs text-slate-500 mb-1 block">Height</label>
                      <input
                        type="number" min={1} value={resize.height}
                        onChange={withHistory((e: React.ChangeEvent<HTMLInputElement>) => resize.handleHeightChange(Number(e.target.value)))}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-violet-500/60 transition-colors"
                      />
                    </div>
                    <select
                      value={resize.unit}
                      onChange={withHistory((e: React.ChangeEvent<HTMLSelectElement>) => resize.handleUnitChange(e.target.value as typeof resize.unit))}
                      className="bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm text-slate-300 outline-none focus:border-violet-500/60 transition-colors"
                    >
                      <option value="px">px</option>
                      <option value="%">%</option>
                    </select>
                  </div>

                  {resize.unit === 'px' && (
                    <div className="flex gap-2">
                      {(['fit', 'stretch', 'crop'] as ResizeMode[]).map((m) => (
                        <button
                          key={m} onClick={withHistory(() => resize.setMode(m))}
                          className={`flex-1 py-1.5 text-xs rounded-lg capitalize transition-colors ${resize.mode === m ? 'bg-violet-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  )}

                  {outDims && (
                    <p className="text-xs text-slate-500">
                      Output: <span className="text-violet-300 font-mono">{outDims.w} × {outDims.h} px</span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-600">Enable to set custom dimensions.</p>
              )}
            </div>
          </div>

          {/* Column 2: Color Adjustments */}
          <div className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 md:block ${mobileTab === 'color' ? 'block' : 'hidden'}`}>
            <SectionHeader icon={<Sparkles className="w-3.5 h-3.5" />} label="Color Adjustments" />
            <div className="space-y-5">
              <SliderRow label="Brightness" value={filters.filters.brightness} displayValue={`${filters.filters.brightness}%`} min={0} max={200} defaultValue={FILTER_DEFAULTS.brightness} onChange={(v) => filters.setFilter('brightness', v)} onDragStart={withHistory(() => {})} />
              <SliderRow label="Contrast"   value={filters.filters.contrast}   displayValue={`${filters.filters.contrast}%`}   min={0} max={200} defaultValue={FILTER_DEFAULTS.contrast}   onChange={(v) => filters.setFilter('contrast', v)} onDragStart={withHistory(() => {})} />
              <SliderRow label="Saturation" value={filters.filters.saturation} displayValue={`${filters.filters.saturation}%`} min={0} max={200} defaultValue={FILTER_DEFAULTS.saturation} onChange={(v) => filters.setFilter('saturation', v)} onDragStart={withHistory(() => {})} />
              <SliderRow label="Sepia"      value={filters.filters.sepia}      displayValue={`${filters.filters.sepia}%`}      min={0} max={100} defaultValue={FILTER_DEFAULTS.sepia}      onChange={(v) => filters.setFilter('sepia', v)} onDragStart={withHistory(() => {})} />
              <SliderRow label="Grayscale"  value={filters.filters.grayscale}  displayValue={`${filters.filters.grayscale}%`}  min={0} max={100} defaultValue={FILTER_DEFAULTS.grayscale}  onChange={(v) => filters.setFilter('grayscale', v)} onDragStart={withHistory(() => {})} />
            </div>
          </div>

          {/* Column 3: Enhancement + Export */}
          <div className={`flex-col gap-5 md:col-span-2 xl:col-span-1 md:flex ${mobileTab === 'enhancement' ? 'flex' : 'hidden'}`}>

            {/* Enhancement */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
              <SectionHeader icon={<ZoomIn className="w-3.5 h-3.5" />} label="Enhancement" />
              <div className="space-y-5">
                <SliderRow label="Sharpen"         value={filters.filters.sharpen} displayValue={filters.filters.sharpen.toFixed(2)} min={0} max={1}   step={0.01} defaultValue={FILTER_DEFAULTS.sharpen} onChange={(v) => filters.setFilter('sharpen', v)} onDragStart={withHistory(() => {})} />
                <SliderRow label="Noise Reduction" value={filters.filters.denoise} displayValue={`${filters.filters.denoise}%`}     min={0} max={100}            defaultValue={FILTER_DEFAULTS.denoise} onChange={(v) => filters.setFilter('denoise', v)} onDragStart={withHistory(() => {})} />
                <SliderRow label="Blur"            value={filters.filters.blur}   displayValue={`${filters.filters.blur}px`}       min={0} max={10}  step={0.1}  defaultValue={FILTER_DEFAULTS.blur}    onChange={(v) => filters.setFilter('blur', v)} onDragStart={withHistory(() => {})} />
              </div>
            </div>

            {/* Export */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
              <SectionHeader icon={<Sliders className="w-3.5 h-3.5" />} label="Export" />
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-300 mb-2">Format</p>
                  <div className="flex gap-2">
                    {(['auto', 'jpg', 'png', 'webp'] as ExportFormat[]).map((fmt) => (
                      <button
                        key={fmt} onClick={() => exportSettings.setFormat(fmt)}
                        className={`flex-1 py-1.5 text-xs rounded-lg uppercase font-medium transition-colors ${exportSettings.format === fmt ? 'bg-violet-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {showBgColor && (
                  <div>
                    <label htmlFor="bg-color-picker" className="text-sm text-slate-300 mb-2 block">Background Color</label>
                    <div className="flex items-center gap-3 bg-black/20 border border-white/10 rounded-xl px-3 py-2">
                      <input
                        id="bg-color-picker"
                        type="color"
                        value={exportSettings.bgColor}
                        onChange={(e) => exportSettings.setBgColor(e.target.value)}
                        className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
                      />
                      <span className="text-sm text-slate-300 font-mono" aria-hidden="true">{exportSettings.bgColor}</span>
                    </div>
                  </div>
                )}

                {showQuality && (
                  <SliderRow label="Quality" value={filters.filters.quality} displayValue={`${filters.filters.quality}%`} min={1} max={100} defaultValue={FILTER_DEFAULTS.quality} onChange={(v) => filters.setFilter('quality', v)} />
                )}

                <div>
                  <p className="text-sm text-slate-300 mb-2">File Name</p>
                  <div className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-xl px-3 py-2 focus-within:border-violet-500/60 transition-colors">
                    <input
                      type="text"
                      value={exportSettings.fileName}
                      onChange={(e) => exportSettings.setFileName(e.target.value)}
                      placeholder="enhanced-image"
                      className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
                    />
                    <span className="text-xs text-slate-500 shrink-0">.{exportSettings.getExtension()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
            </div>
          </>
        ) : isConvertMode ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
              <SectionHeader icon={<Sliders className="w-3.5 h-3.5" />} label="Convert" />
              <p className="text-sm text-slate-400 mb-4">
                Choose a target format and download a converted copy without using the editing tools.
              </p>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 mb-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500">Source</p>
                  <p className="text-sm font-semibold text-slate-200">{selectedImage ? sourceFormatLabel : 'No file selected'}</p>
                </div>
                <div className="text-violet-400 text-lg">→</div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-widest text-slate-500">Target</p>
                  <p className="text-sm font-semibold text-slate-200">{outputFormatLabel}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-300 mb-2">Format</p>
                  <div className="flex gap-2">
                    {(['jpg', 'png', 'webp'] as ExportFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => exportSettings.setFormat(fmt)}
                        className={`flex-1 py-2 text-xs rounded-lg uppercase font-medium transition-colors ${exportSettings.format === fmt ? 'bg-violet-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {showBgColor && (
                  <div>
                    <label htmlFor="bg-color-picker" className="text-sm text-slate-300 mb-2 block">Background Color</label>
                    <div className="flex items-center gap-3 bg-black/20 border border-white/10 rounded-xl px-3 py-2">
                      <input
                        id="bg-color-picker"
                        type="color"
                        value={exportSettings.bgColor}
                        onChange={(e) => exportSettings.setBgColor(e.target.value)}
                        className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
                      />
                      <span className="text-sm text-slate-300 font-mono" aria-hidden="true">{exportSettings.bgColor}</span>
                    </div>
                  </div>
                )}

                {showQuality && (
                  <SliderRow label="Quality" value={filters.filters.quality} displayValue={`${filters.filters.quality}%`} min={1} max={100} defaultValue={FILTER_DEFAULTS.quality} onChange={(v) => filters.setFilter('quality', v)} />
                )}

                <div>
                  <p className="text-sm text-slate-300 mb-2">File Name</p>
                  <div className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-xl px-3 py-2 focus-within:border-violet-500/60 transition-colors">
                    <input
                      type="text"
                      value={exportSettings.fileName}
                      onChange={(e) => exportSettings.setFileName(e.target.value)}
                      placeholder="converted-image"
                      className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
                    />
                    <span className="text-xs text-slate-500 shrink-0">.{exportSettings.getExtension()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
              <SectionHeader icon={<Maximize2 className="w-3.5 h-3.5" />} label="Reduce" />
              <p className="text-sm text-slate-400 mb-4">
                Reduce file size by resizing the image, lowering quality, or exporting to a more compact format.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-xs uppercase tracking-widest text-slate-500">Source</p>
                  <p className="text-sm font-semibold text-slate-200">{selectedImage ? sourceFormatLabel : 'No file selected'}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-xs uppercase tracking-widest text-slate-500">Original Size</p>
                  <p className="text-sm font-semibold text-slate-200">
                    {resize.originalDimensions ? `${resize.originalDimensions.w} × ${resize.originalDimensions.h}` : 'Unknown'}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-xs uppercase tracking-widest text-slate-500">Output</p>
                  <p className="text-sm font-semibold text-slate-200">
                    {outDims ? `${outDims.w} × ${outDims.h} ${outputFormatLabel}` : outputFormatLabel}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm text-slate-300">Resize</span>
                    <button
                      onClick={withHistory(() => resize.setEnabled((v) => !v))}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        resize.enabled ? 'bg-violet-600 text-white' : 'bg-white/10 text-slate-400 hover:bg-white/15'
                      }`}
                    >
                      {resize.enabled ? 'On' : 'Off'}
                    </button>
                  </div>

                  {resize.enabled ? (
                    <div className="space-y-3">
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-slate-500 mb-1 block">Width</label>
                          <input
                            type="number"
                            min={1}
                            value={resize.width}
                            onChange={withHistory((e: React.ChangeEvent<HTMLInputElement>) => resize.handleWidthChange(Number(e.target.value)))}
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-violet-500/60 transition-colors"
                          />
                        </div>
                        <button
                          onClick={withHistory(() => resize.setLockAspect((v) => !v))}
                          title={resize.lockAspect ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                          className={`p-2 rounded-lg transition-colors ${resize.lockAspect ? 'text-violet-400 bg-violet-500/15' : 'text-slate-500 bg-white/5 hover:bg-white/10'}`}
                        >
                          {resize.lockAspect ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                        <div className="flex-1">
                          <label className="text-xs text-slate-500 mb-1 block">Height</label>
                          <input
                            type="number"
                            min={1}
                            value={resize.height}
                            onChange={withHistory((e: React.ChangeEvent<HTMLInputElement>) => resize.handleHeightChange(Number(e.target.value)))}
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-violet-500/60 transition-colors"
                          />
                        </div>
                        <select
                          value={resize.unit}
                          onChange={withHistory((e: React.ChangeEvent<HTMLSelectElement>) => resize.handleUnitChange(e.target.value as typeof resize.unit))}
                          className="bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm text-slate-300 outline-none focus:border-violet-500/60 transition-colors"
                        >
                          <option value="px">px</option>
                          <option value="%">%</option>
                        </select>
                      </div>

                      {resize.unit === 'px' && (
                        <div className="flex gap-2">
                          {(['fit', 'stretch', 'crop'] as ResizeMode[]).map((m) => (
                            <button
                              key={m}
                              onClick={withHistory(() => resize.setMode(m))}
                              className={`flex-1 py-1.5 text-xs rounded-lg capitalize transition-colors ${resize.mode === m ? 'bg-violet-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Leave resize off to keep the original dimensions and only reduce by format or quality.</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-slate-300 mb-2">Format</p>
                  <div className="flex gap-2">
                    {(['jpg', 'png', 'webp'] as ExportFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => exportSettings.setFormat(fmt)}
                        className={`flex-1 py-2 text-xs rounded-lg uppercase font-medium transition-colors ${exportSettings.format === fmt ? 'bg-violet-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {showQuality && (
                  <SliderRow label="Quality" value={filters.filters.quality} displayValue={`${filters.filters.quality}%`} min={1} max={100} defaultValue={FILTER_DEFAULTS.quality} onChange={(v) => filters.setFilter('quality', v)} />
                )}

                {showBgColor && (
                  <div>
                    <label htmlFor="bg-color-picker" className="text-sm text-slate-300 mb-2 block">Background Color</label>
                    <div className="flex items-center gap-3 bg-black/20 border border-white/10 rounded-xl px-3 py-2">
                      <input
                        id="bg-color-picker"
                        type="color"
                        value={exportSettings.bgColor}
                        onChange={(e) => exportSettings.setBgColor(e.target.value)}
                        className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
                      />
                      <span className="text-sm text-slate-300 font-mono" aria-hidden="true">{exportSettings.bgColor}</span>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm text-slate-300 mb-2">File Name</p>
                  <div className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-xl px-3 py-2 focus-within:border-violet-500/60 transition-colors">
                    <input
                      type="text"
                      value={exportSettings.fileName}
                      onChange={(e) => exportSettings.setFileName(e.target.value)}
                      placeholder="reduced-image"
                      className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
                    />
                    <span className="text-xs text-slate-500 shrink-0">.{exportSettings.getExtension()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="flex gap-3 mt-5">
          {isEditMode && (
            <>
              <button
                onClick={resetAll}
                className="px-5 py-3 rounded-xl text-sm font-medium border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors"
              >
                Reset
              </button>
              <button
                onClick={handleUndo}
                disabled={!history.canUndo}
                title="Undo (Ctrl+Z)"
                aria-label="Undo"
                className="px-4 py-3 rounded-xl text-sm font-medium border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ↩
              </button>
              <button
                onClick={handleRedo}
                disabled={!history.canRedo}
                title="Redo (Ctrl+Shift+Z)"
                aria-label="Redo"
                className="px-4 py-3 rounded-xl text-sm font-medium border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ↪
              </button>
            </>
          )}

          <button
            onClick={downloadImage}
            disabled={!selectedImage || isProcessing}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              selectedImage && !isProcessing
                ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40'
                : 'bg-white/5 text-slate-600 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" role="status" aria-label="Processing">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Processing…
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                {isConvertMode ? 'Convert Image' : isReduceMode ? 'Reduce Image' : 'Download Image'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
