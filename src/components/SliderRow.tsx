interface SliderRowProps {
  label: string;
  value: number;
  displayValue: string;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  onChange: (v: number) => void;
  onDragStart?: () => void;
}

export function SliderRow({ label, value, displayValue, min, max, step, defaultValue, onChange, onDragStart }: SliderRowProps) {
  const isModified = defaultValue !== undefined && value !== defaultValue;

  return (
    <div className="space-y-2 group">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-300">{label}</span>
        <div className="flex items-center gap-1.5">
          {defaultValue !== undefined && (
            <button
              onClick={() => onChange(defaultValue)}
              title="Reset to default"
              aria-label={`Reset ${label} to default`}
              className={`text-base leading-none text-slate-400 hover:text-violet-400 transition-opacity duration-150 opacity-0 ${
                isModified ? 'group-hover:opacity-100' : 'pointer-events-none'
              }`}
            >
              ↺
            </button>
          )}
          <span className="text-xs font-mono bg-white/10 text-violet-300 px-2 py-0.5 rounded-md min-w-[52px] text-center">
            {displayValue}
          </span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? 1}
        value={value}
        aria-label={label}
        onPointerDown={onDragStart}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
