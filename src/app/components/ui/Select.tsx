interface SelectOption {
  label: string
  value: string
}

interface SelectProps {
  label?: string
  value: string
  options: SelectOption[]
  onChange: (v: string) => void
}

export function Select({ label, value, options, onChange }: SelectProps) {
  return (
    <div>
      {label && <p className="label">{label}</p>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input text-sm"
        style={{ fontFamily: value }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value} style={{ fontFamily: o.value }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
