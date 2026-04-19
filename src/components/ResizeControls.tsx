import React from 'react';
import { Lock, Unlock } from 'lucide-react';
import { ResizeMode } from '../types';

interface Props {
  width: number;
  height: number;
  unit: 'px' | '%';
  mode: ResizeMode;
  lockAspect: boolean;
  outDims?: { w: number; h: number } | null;
  onWidthChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onHeightChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUnitChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onModeChange: (m: ResizeMode) => void;
  onLockAspectToggle: () => void;
}

export function ResizeControls({
  width, height, unit, mode, lockAspect, outDims,
  onWidthChange, onHeightChange, onUnitChange, onModeChange, onLockAspectToggle,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="text-xs text-slate-500 mb-1 block">Width</label>
          <input
            type="number" min={1} value={width} onChange={onWidthChange}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-violet-500/60 transition-colors"
          />
        </div>
        <button
          onClick={onLockAspectToggle}
          title={lockAspect ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
          className={`p-2 rounded-lg transition-colors ${lockAspect ? 'text-violet-400 bg-violet-500/15' : 'text-slate-500 bg-white/5 hover:bg-white/10'}`}
        >
          {lockAspect ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
        </button>
        <div className="flex-1">
          <label className="text-xs text-slate-500 mb-1 block">Height</label>
          <input
            type="number" min={1} value={height} onChange={onHeightChange}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-violet-500/60 transition-colors"
          />
        </div>
        <select
          value={unit} onChange={onUnitChange}
          className="bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm text-slate-300 outline-none focus:border-violet-500/60 transition-colors"
        >
          <option value="px">px</option>
          <option value="%">%</option>
        </select>
      </div>

      {unit === 'px' && (
        <div className="flex gap-2">
          {(['fit', 'stretch', 'crop'] as ResizeMode[]).map((m) => (
            <button
              key={m} onClick={() => onModeChange(m)}
              className={`flex-1 py-1.5 text-xs rounded-lg capitalize transition-colors ${
                mode === m ? 'bg-violet-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
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
  );
}
