import React from 'react';
import { Maximize2 } from 'lucide-react';
import { ExportFormat, ResizeMode, ResizeUnit } from '../../types';
import { SectionHeader } from '../SectionHeader';
import { ResizeControls } from '../ResizeControls';
import { ExportFields } from '../ExportFields';

type WithHistory = <T extends unknown[]>(fn: (...args: T) => void) => (...args: T) => void;

interface ResizeProps {
  enabled: boolean;
  width: number;
  height: number;
  unit: ResizeUnit;
  mode: ResizeMode;
  lockAspect: boolean;
  onToggle: () => void;
  onWidthChange: (v: number) => void;
  onHeightChange: (v: number) => void;
  onUnitChange: (u: ResizeUnit) => void;
  onModeChange: (m: ResizeMode) => void;
  onLockAspectToggle: () => void;
}

interface ExportProps {
  format: ExportFormat;
  bgColor: string;
  fileName: string;
  extension: string;
  showBgColor: boolean;
  showQuality: boolean;
  quality: number;
  onFormatChange: (fmt: ExportFormat) => void;
  onBgColorChange: (color: string) => void;
  onFileNameChange: (name: string) => void;
  onQualityChange: (v: number) => void;
}

interface Props {
  selectedImage: string | null;
  sourceFormatLabel: string;
  outputFormatLabel: string;
  originalDimensions: { w: number; h: number } | null;
  outDims: { w: number; h: number } | null;
  resize: ResizeProps;
  exportSettings: ExportProps;
  withHistory: WithHistory;
}

const FORMATS: ExportFormat[] = ['jpg', 'png', 'webp'];

export function ReduceMode({
  selectedImage, sourceFormatLabel, outputFormatLabel,
  originalDimensions, outDims, resize, exportSettings, withHistory,
}: Props) {
  return (
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
              {originalDimensions ? `${originalDimensions.w} × ${originalDimensions.h}` : 'Unknown'}
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
                onClick={withHistory(resize.onToggle)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  resize.enabled ? 'bg-violet-600 text-white' : 'bg-white/10 text-slate-400 hover:bg-white/15'
                }`}
              >
                {resize.enabled ? 'On' : 'Off'}
              </button>
            </div>

            {resize.enabled ? (
              <ResizeControls
                width={resize.width}
                height={resize.height}
                unit={resize.unit}
                mode={resize.mode}
                lockAspect={resize.lockAspect}
                onWidthChange={withHistory((e: React.ChangeEvent<HTMLInputElement>) => resize.onWidthChange(Number(e.target.value)))}
                onHeightChange={withHistory((e: React.ChangeEvent<HTMLInputElement>) => resize.onHeightChange(Number(e.target.value)))}
                onUnitChange={withHistory((e: React.ChangeEvent<HTMLSelectElement>) => resize.onUnitChange(e.target.value as ResizeUnit))}
                onModeChange={withHistory(resize.onModeChange)}
                onLockAspectToggle={withHistory(resize.onLockAspectToggle)}
              />
            ) : (
              <p className="text-xs text-slate-500">
                Leave resize off to keep the original dimensions and only reduce by format or quality.
              </p>
            )}
          </div>

          <ExportFields
            formats={FORMATS}
            format={exportSettings.format}
            onFormatChange={exportSettings.onFormatChange}
            showBgColor={exportSettings.showBgColor}
            bgColor={exportSettings.bgColor}
            bgColorId="reduce-bg-color"
            onBgColorChange={exportSettings.onBgColorChange}
            showQuality={exportSettings.showQuality}
            quality={exportSettings.quality}
            onQualityChange={exportSettings.onQualityChange}
            fileName={exportSettings.fileName}
            fileNamePlaceholder="reduced-image"
            onFileNameChange={exportSettings.onFileNameChange}
            extension={exportSettings.extension}
          />
        </div>
      </div>
    </div>
  );
}
