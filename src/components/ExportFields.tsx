import { ExportFormat, FILTER_DEFAULTS } from '../types';
import { SliderRow } from './SliderRow';

interface Props {
  formats: ExportFormat[];
  format: ExportFormat;
  onFormatChange: (fmt: ExportFormat) => void;
  showBgColor: boolean;
  bgColor: string;
  bgColorId: string;
  onBgColorChange: (color: string) => void;
  showQuality: boolean;
  quality: number;
  onQualityChange: (v: number) => void;
  fileName: string;
  fileNamePlaceholder?: string;
  onFileNameChange: (name: string) => void;
  extension: string;
}

export function ExportFields({
  formats, format, onFormatChange,
  showBgColor, bgColor, bgColorId, onBgColorChange,
  showQuality, quality, onQualityChange,
  fileName, fileNamePlaceholder = 'image', onFileNameChange,
  extension,
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-slate-300 mb-2">Format</p>
        <div className="flex gap-2">
          {formats.map((fmt) => (
            <button
              key={fmt}
              onClick={() => onFormatChange(fmt)}
              className={`flex-1 py-2 text-xs rounded-lg uppercase font-medium transition-colors ${
                format === fmt ? 'bg-violet-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      {showBgColor && (
        <div>
          <label htmlFor={bgColorId} className="text-sm text-slate-300 mb-2 block">
            Background Color
          </label>
          <div className="flex items-center gap-3 bg-black/20 border border-white/10 rounded-xl px-3 py-2">
            <input
              id={bgColorId}
              type="color"
              value={bgColor}
              onChange={(e) => onBgColorChange(e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
            />
            <span className="text-sm text-slate-300 font-mono" aria-hidden="true">{bgColor}</span>
          </div>
        </div>
      )}

      {showQuality && (
        <SliderRow
          label="Quality"
          value={quality}
          displayValue={`${quality}%`}
          min={1}
          max={100}
          defaultValue={FILTER_DEFAULTS.quality}
          onChange={onQualityChange}
        />
      )}

      <div>
        <p className="text-sm text-slate-300 mb-2">File Name</p>
        <div className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-xl px-3 py-2 focus-within:border-violet-500/60 transition-colors">
          <input
            type="text"
            value={fileName}
            onChange={(e) => onFileNameChange(e.target.value)}
            placeholder={fileNamePlaceholder}
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
          />
          <span className="text-xs text-slate-500 shrink-0">.{extension}</span>
        </div>
      </div>
    </div>
  );
}
