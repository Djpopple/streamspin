interface NumberInputProps {
  label?: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (v: number) => void
}

export function NumberInput({ label, value, min = 0, max, step = 1, onChange }: NumberInputProps) {
  const clamp = (v: number) => {
    let n = v
    if (min !== undefined) n = Math.max(min, n)
    if (max !== undefined) n = Math.min(max, n)
    return n
  }

  return (
    <div>
      {label && <p className="label">{label}</p>}
      <div className="flex items-center">
        <button
          type="button"
          className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-l-md text-sm border border-white/10 border-r-0 transition-colors"
          onClick={() => onChange(clamp(value - step))}
        >
          −
        </button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={e => onChange(clamp(parseFloat(e.target.value) || min))}
          className="input rounded-none text-center text-sm py-1.5 w-16 border-x-0"
        />
        <button
          type="button"
          className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-r-md text-sm border border-white/10 border-l-0 transition-colors"
          onClick={() => onChange(clamp(value + step))}
        >
          +
        </button>
      </div>
    </div>
  )
}
