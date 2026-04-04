interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  decimals?: number
  onChange: (v: number) => void
}

export function Slider({ label, value, min, max, step = 1, unit = '', decimals = 0, onChange }: SliderProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="label mb-0">{label}</span>
        <span className="text-xs text-white/50 tabular-nums font-mono">
          {value.toFixed(decimals)}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/15"
        style={{ accentColor: '#e94560' }}
      />
    </div>
  )
}
