import { Download } from 'lucide-react';

type AppMode = 'edit' | 'convert' | 'reduce' | 'split';

interface Props {
  mode: AppMode;
  canUndo: boolean;
  canRedo: boolean;
  hasImage: boolean;
  isProcessing: boolean;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onPrimary: () => void;
}

const PRIMARY_LABEL: Record<AppMode, string> = {
  edit:    'Download Image',
  convert: 'Convert Image',
  reduce:  'Reduce Image',
  split:   'Split Image',
};

export function ActionBar({
  mode, canUndo, canRedo, hasImage, isProcessing,
  onReset, onUndo, onRedo, onPrimary,
}: Props) {
  return (
    <div className="flex gap-3 mt-5">
      {mode === 'edit' && (
        <>
          <button
            onClick={onReset}
            className="px-5 py-3 rounded-xl text-sm font-medium border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
            className="px-4 py-3 rounded-xl text-sm font-medium border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ↩
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            aria-label="Redo"
            className="px-4 py-3 rounded-xl text-sm font-medium border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ↪
          </button>
        </>
      )}

      <button
        onClick={onPrimary}
        disabled={!hasImage || isProcessing}
        className={`flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
          hasImage && !isProcessing
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
            {PRIMARY_LABEL[mode]}
          </>
        )}
      </button>
    </div>
  );
}
