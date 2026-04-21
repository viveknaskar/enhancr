import { Crop } from 'lucide-react';
import { ExportFormat } from '../../types';
import { SectionHeader } from '../SectionHeader';
import { ExportFields } from '../ExportFields';

type SplitDirection = 'vertical' | 'horizontal' | 'grid';

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
  splitDirection: SplitDirection;
  setSplitDirection: (d: SplitDirection) => void;
  splitColumns: number;
  setSplitColumns: (v: number) => void;
  splitRows: number;
  setSplitRows: (v: number) => void;
  exportSettings: ExportProps;
}

const DIRECTIONS: { id: SplitDirection; label: string }[] = [
  { id: 'vertical',   label: 'Vertical'   },
  { id: 'horizontal', label: 'Horizontal' },
  { id: 'grid',       label: 'Grid'       },
];

const FORMATS: ExportFormat[] = ['png', 'jpg', 'webp'];

export function SplitMode({
  selectedImage, sourceFormatLabel, outputFormatLabel,
  splitDirection, setSplitDirection,
  splitColumns, setSplitColumns,
  splitRows, setSplitRows,
  exportSettings,
}: Props) {
  const pieceCount = splitDirection === 'vertical'
    ? splitColumns
    : splitDirection === 'horizontal'
      ? splitRows
      : splitColumns * splitRows;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
        <SectionHeader icon={<Crop className="w-3.5 h-3.5" />} label="Split" />
        <p className="text-sm text-slate-400 mb-4">
          Split the current processed image into equal vertical, horizontal, or grid-based pieces and download each piece separately.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs uppercase tracking-widest text-slate-500">Source</p>
            <p className="text-sm font-semibold text-slate-200">{selectedImage ? sourceFormatLabel : 'No file selected'}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs uppercase tracking-widest text-slate-500">Output Format</p>
            <p className="text-sm font-semibold text-slate-200">{outputFormatLabel}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs uppercase tracking-widest text-slate-500">Pieces</p>
            <p className="text-sm font-semibold text-slate-200">{pieceCount}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-300 mb-2">Split Direction</p>
            <div className="flex gap-2">
              {DIRECTIONS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setSplitDirection(id)}
                  className={`flex-1 py-2 text-xs rounded-lg uppercase font-medium transition-colors ${
                    splitDirection === id ? 'bg-violet-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {(splitDirection === 'vertical' || splitDirection === 'grid') && (
            <div>
              <label className="text-sm text-slate-300 mb-2 block">Columns <span className="text-slate-500">(max 12)</span></label>
              <input
                type="number" min={2} max={12} value={splitColumns}
                onChange={(e) => setSplitColumns(Math.min(12, Math.max(2, Number(e.target.value) || 2)))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-violet-500/60 transition-colors"
              />
            </div>
          )}

          {(splitDirection === 'horizontal' || splitDirection === 'grid') && (
            <div>
              <label className="text-sm text-slate-300 mb-2 block">Rows <span className="text-slate-500">(max 12)</span></label>
              <input
                type="number" min={2} max={12} value={splitRows}
                onChange={(e) => setSplitRows(Math.min(12, Math.max(2, Number(e.target.value) || 2)))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-violet-500/60 transition-colors"
              />
            </div>
          )}

          <ExportFields
            formats={FORMATS}
            format={exportSettings.format}
            onFormatChange={exportSettings.onFormatChange}
            showBgColor={exportSettings.showBgColor}
            bgColor={exportSettings.bgColor}
            bgColorId="split-bg-color"
            onBgColorChange={exportSettings.onBgColorChange}
            showQuality={exportSettings.showQuality}
            quality={exportSettings.quality}
            onQualityChange={exportSettings.onQualityChange}
            fileName={exportSettings.fileName}
            fileNamePlaceholder="split-image"
            onFileNameChange={exportSettings.onFileNameChange}
            extension={exportSettings.extension}
          />
        </div>
      </div>
    </div>
  );
}
