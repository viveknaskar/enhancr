type AppMode = 'edit' | 'convert' | 'reduce' | 'split';

interface Props {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
}

const TABS: { id: AppMode; label: string }[] = [
  { id: 'edit',    label: 'Edit'    },
  { id: 'convert', label: 'Convert' },
  { id: 'reduce',  label: 'Reduce'  },
  { id: 'split',   label: 'Split'   },
];

export function ModeTabBar({ mode, onChange }: Props) {
  return (
    <div className="mt-4 inline-flex rounded-xl bg-white/5 border border-white/10 p-1 gap-1">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === id ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
