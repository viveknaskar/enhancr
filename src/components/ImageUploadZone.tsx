import React from 'react';
import { Upload } from 'lucide-react';
import type { CropRect, CropHandle } from '../types';
import type { ImageBounds } from '../hooks/useCrop';
import { CropOverlay } from './CropOverlay';
import { SplitOverlay } from './SplitOverlay';

type SplitDirection = 'vertical' | 'horizontal' | 'grid';

type AppMode = 'edit' | 'convert' | 'reduce' | 'split';

interface Props {
  selectedImage: string | null;
  isDragging: boolean;
  isProcessing: boolean;
  showOriginal: boolean;
  mode: AppMode;
  setShowOriginal: (v: boolean) => void;
  filterString: string;
  previewTransform: string | undefined;
  cropMode: boolean;
  crop: CropRect;
  originalDimensions: { w: number; h: number } | null;
  outDims: { w: number; h: number } | null;
  resizeEnabled: boolean;
  rotation: number;
  splitDirection?: SplitDirection;
  splitColumns?: number;
  splitRows?: number;
  isDraggingCrop: boolean;
  onHandlePointerDown: (handle: CropHandle, e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent, bounds: ImageBounds) => void;
  onPointerUp: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReplaceClick: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export function ImageUploadZone({
  selectedImage, isDragging, isProcessing, showOriginal, mode, setShowOriginal,
  filterString, previewTransform, cropMode, crop, originalDimensions, outDims,
  resizeEnabled, rotation, isDraggingCrop,
  splitDirection, splitColumns, splitRows,
  onHandlePointerDown, onPointerMove, onPointerUp,
  onDrop, onDragOver, onDragLeave, onFileChange, onReplaceClick, fileInputRef,
}: Props) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 mb-5">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/tiff"
        onChange={onFileChange}
      />

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => { if (!cropMode) fileInputRef.current?.click(); }}
        className={`relative h-56 sm:h-72 md:h-80 rounded-xl border-2 border-dashed flex items-center justify-center transition-colors duration-200 overflow-hidden ${
          cropMode
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
                filter: showOriginal ? 'none' : filterString,
                transform: showOriginal ? 'none' : previewTransform,
              }}
            />
            {!isProcessing && !cropMode && mode === 'edit' && (
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
            {cropMode && originalDimensions && (
              <CropOverlay
                crop={crop}
                naturalWidth={originalDimensions.w}
                naturalHeight={originalDimensions.h}
                onHandlePointerDown={onHandlePointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                isDragging={isDraggingCrop}
              />
            )}
            {mode === 'split' && originalDimensions && splitDirection !== undefined && (
              <SplitOverlay
                splitDirection={splitDirection}
                splitColumns={splitColumns ?? 2}
                splitRows={splitRows ?? 2}
                naturalWidth={originalDimensions.w}
                naturalHeight={originalDimensions.h}
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
            onClick={onReplaceClick}
            className="text-xs text-slate-400 hover:text-violet-400 transition-colors underline underline-offset-2"
          >
            Replace image
          </button>
          {outDims && (
            <span className="text-xs text-slate-500 font-mono">
              {originalDimensions?.w} × {originalDimensions?.h}
              {(resizeEnabled || rotation % 180 !== 0) && (
                <span className="text-violet-400 ml-1">→ {outDims.w} × {outDims.h}</span>
              )}
              {' '}px
            </span>
          )}
        </div>
      )}
    </div>
  );
}
