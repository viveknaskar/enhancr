import { Sliders } from 'lucide-react';
import { ExportFormat } from '../../types';
import { SectionHeader } from '../SectionHeader';
import { ExportFields } from '../ExportFields';

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
  exportSettings: ExportProps;
}

const FORMATS: ExportFormat[] = ['jpg', 'png', 'webp'];

export function ConvertMode({ selectedImage, sourceFormatLabel, outputFormatLabel, exportSettings }: Props) {
  return (
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

        <ExportFields
          formats={FORMATS}
          format={exportSettings.format}
          onFormatChange={exportSettings.onFormatChange}
          showBgColor={exportSettings.showBgColor}
          bgColor={exportSettings.bgColor}
          bgColorId="convert-bg-color"
          onBgColorChange={exportSettings.onBgColorChange}
          showQuality={exportSettings.showQuality}
          quality={exportSettings.quality}
          onQualityChange={exportSettings.onQualityChange}
          fileName={exportSettings.fileName}
          fileNamePlaceholder="converted-image"
          onFileNameChange={exportSettings.onFileNameChange}
          extension={exportSettings.extension}
        />
      </div>
    </div>
  );
}
