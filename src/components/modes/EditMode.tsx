import React from 'react';
import {
  RotateCcw, RotateCw, FlipHorizontal, FlipVertical,
  Crop, Maximize2, Sliders, Sparkles, ZoomIn,
} from 'lucide-react';
import { ExportFormat, ResizeMode, ResizeUnit, FILTER_DEFAULTS, FilterState } from '../../types';
import { SliderRow } from '../SliderRow';
import { SectionHeader } from '../SectionHeader';
import { IconBtn } from '../IconBtn';
import { ResizeControls } from '../ResizeControls';
import { ExportFields } from '../ExportFields';

type MobileTab = 'transform' | 'color' | 'enhancement';
type WithHistory = <T extends unknown[]>(fn: (...args: T) => void) => (...args: T) => void;

interface TransformProps {
  flipH: boolean;
  flipV: boolean;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onToggleFlipH: () => void;
  onToggleFlipV: () => void;
}

interface CropProps {
  active: boolean;
  onEnter: () => void;
  onApply: () => void;
  onCancel: () => void;
}

interface ResizeProps {
  enabled: boolean;
  width: number;
  height: number;
  unit: ResizeUnit;
  mode: ResizeMode;
  lockAspect: boolean;
  outDims: { w: number; h: number } | null;
  onToggle: () => void;
  onWidthChange: (v: number) => void;
  onHeightChange: (v: number) => void;
  onUnitChange: (u: ResizeUnit) => void;
  onModeChange: (m: ResizeMode) => void;
  onLockAspectToggle: () => void;
}

interface FiltersProps {
  values: FilterState;
  onChange: (key: keyof FilterState, v: number) => void;
  onDragStart: () => void;
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
  mobileTab: MobileTab;
  onMobileTabChange: (tab: MobileTab) => void;
  transform: TransformProps;
  crop: CropProps;
  resize: ResizeProps;
  filters: FiltersProps;
  exportSettings: ExportProps;
  withHistory: WithHistory;
}

const MOBILE_TABS: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
  { id: 'transform',   label: 'Transform',   icon: <RotateCw className="w-3.5 h-3.5" /> },
  { id: 'color',       label: 'Colors',      icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'enhancement', label: 'Enhancement', icon: <ZoomIn className="w-3.5 h-3.5" />   },
];

const EDIT_FORMATS: ExportFormat[] = ['auto', 'jpg', 'png', 'webp'];

export function EditMode({
  mobileTab, onMobileTabChange,
  transform, crop, resize, filters, exportSettings, withHistory,
}: Props) {
  return (
    <>
      {/* Mobile tab bar */}
      <div className="md:hidden flex rounded-xl bg-white/5 border border-white/10 p-1 mb-3 gap-1">
        {MOBILE_TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => onMobileTabChange(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              mobileTab === id ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">

        {/* Column 1: Transform + Resize */}
        <div className={`flex flex-col gap-5 md:flex ${mobileTab === 'transform' ? 'flex' : 'hidden'}`}>

          {/* Transform */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
            <SectionHeader icon={<RotateCw className="w-3.5 h-3.5" />} label="Transform" />
            <div className="grid grid-cols-4 gap-2">
              <IconBtn onClick={withHistory(transform.onRotateLeft)} title="Rotate 90° left">
                <RotateCcw className="w-4 h-4" /><span>Left</span>
              </IconBtn>
              <IconBtn onClick={withHistory(transform.onRotateRight)} title="Rotate 90° right">
                <RotateCw className="w-4 h-4" /><span>Right</span>
              </IconBtn>
              <IconBtn onClick={withHistory(transform.onToggleFlipH)} active={transform.flipH} title="Flip horizontal">
                <FlipHorizontal className="w-4 h-4" /><span>Flip H</span>
              </IconBtn>
              <IconBtn onClick={withHistory(transform.onToggleFlipV)} active={transform.flipV} title="Flip vertical">
                <FlipVertical className="w-4 h-4" /><span>Flip V</span>
              </IconBtn>
            </div>

            <div className="mt-2 border-t border-white/5 pt-3">
              {crop.active ? (
                <>
                  <p className="text-xs text-slate-500 mb-2 leading-relaxed">
                    Drag the box or handles to select a region.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={crop.onApply}
                      className="flex-1 py-1.5 text-xs rounded-lg font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors"
                    >
                      Apply
                    </button>
                    <button
                      onClick={crop.onCancel}
                      className="flex-1 py-1.5 text-xs rounded-lg font-semibold bg-white/10 hover:bg-white/15 text-slate-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <IconBtn onClick={crop.onEnter} title="Crop image">
                  <div className="flex items-center gap-1.5">
                    <Crop className="w-4 h-4" /><span>Crop</span>
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
                outDims={resize.outDims}
                onWidthChange={withHistory((e: React.ChangeEvent<HTMLInputElement>) => resize.onWidthChange(Number(e.target.value)))}
                onHeightChange={withHistory((e: React.ChangeEvent<HTMLInputElement>) => resize.onHeightChange(Number(e.target.value)))}
                onUnitChange={withHistory((e: React.ChangeEvent<HTMLSelectElement>) => resize.onUnitChange(e.target.value as ResizeUnit))}
                onModeChange={withHistory(resize.onModeChange)}
                onLockAspectToggle={withHistory(resize.onLockAspectToggle)}
              />
            ) : (
              <p className="text-xs text-slate-600">Enable to set custom dimensions.</p>
            )}
          </div>
        </div>

        {/* Column 2: Color Adjustments */}
        <div className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 md:block ${mobileTab === 'color' ? 'block' : 'hidden'}`}>
          <SectionHeader icon={<Sparkles className="w-3.5 h-3.5" />} label="Color Adjustments" />
          <div className="space-y-5">
            <SliderRow label="Brightness" value={filters.values.brightness} displayValue={`${filters.values.brightness}%`} min={0} max={200} defaultValue={FILTER_DEFAULTS.brightness} onChange={(v) => filters.onChange('brightness', v)} onDragStart={filters.onDragStart} />
            <SliderRow label="Contrast"   value={filters.values.contrast}   displayValue={`${filters.values.contrast}%`}   min={0} max={200} defaultValue={FILTER_DEFAULTS.contrast}   onChange={(v) => filters.onChange('contrast', v)}   onDragStart={filters.onDragStart} />
            <SliderRow label="Saturation" value={filters.values.saturation} displayValue={`${filters.values.saturation}%`} min={0} max={200} defaultValue={FILTER_DEFAULTS.saturation} onChange={(v) => filters.onChange('saturation', v)} onDragStart={filters.onDragStart} />
            <SliderRow label="Sepia"      value={filters.values.sepia}      displayValue={`${filters.values.sepia}%`}      min={0} max={100} defaultValue={FILTER_DEFAULTS.sepia}      onChange={(v) => filters.onChange('sepia', v)}      onDragStart={filters.onDragStart} />
            <SliderRow label="Grayscale"  value={filters.values.grayscale}  displayValue={`${filters.values.grayscale}%`}  min={0} max={100} defaultValue={FILTER_DEFAULTS.grayscale}  onChange={(v) => filters.onChange('grayscale', v)}  onDragStart={filters.onDragStart} />
          </div>
        </div>

        {/* Column 3: Enhancement + Export */}
        <div className={`flex-col gap-5 md:col-span-2 xl:col-span-1 md:flex ${mobileTab === 'enhancement' ? 'flex' : 'hidden'}`}>

          {/* Enhancement */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
            <SectionHeader icon={<ZoomIn className="w-3.5 h-3.5" />} label="Enhancement" />
            <div className="space-y-5">
              <SliderRow label="Sharpen"         value={filters.values.sharpen} displayValue={filters.values.sharpen.toFixed(2)} min={0} max={1}   step={0.01} defaultValue={FILTER_DEFAULTS.sharpen} onChange={(v) => filters.onChange('sharpen', v)} onDragStart={filters.onDragStart} />
              <SliderRow label="Noise Reduction" value={filters.values.denoise} displayValue={`${filters.values.denoise}%`}     min={0} max={100}            defaultValue={FILTER_DEFAULTS.denoise} onChange={(v) => filters.onChange('denoise', v)} onDragStart={filters.onDragStart} />
              <SliderRow label="Blur"            value={filters.values.blur}   displayValue={`${filters.values.blur}px`}       min={0} max={10}  step={0.1}  defaultValue={FILTER_DEFAULTS.blur}    onChange={(v) => filters.onChange('blur', v)}   onDragStart={filters.onDragStart} />
            </div>
          </div>

          {/* Export */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
            <SectionHeader icon={<Sliders className="w-3.5 h-3.5" />} label="Export" />
            <ExportFields
              formats={EDIT_FORMATS}
              format={exportSettings.format}
              onFormatChange={exportSettings.onFormatChange}
              showBgColor={exportSettings.showBgColor}
              bgColor={exportSettings.bgColor}
              bgColorId="edit-bg-color"
              onBgColorChange={exportSettings.onBgColorChange}
              showQuality={exportSettings.showQuality}
              quality={exportSettings.quality}
              onQualityChange={exportSettings.onQualityChange}
              fileName={exportSettings.fileName}
              fileNamePlaceholder="enhanced-image"
              onFileNameChange={exportSettings.onFileNameChange}
              extension={exportSettings.extension}
            />
          </div>
        </div>
      </div>
    </>
  );
}
