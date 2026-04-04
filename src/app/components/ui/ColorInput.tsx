import { useRef } from 'react'

interface ColorInputProps {
  label?: string
  value: string
  onChange: (v: string) => void
  className?: string
}

export function ColorInput({ label, value, onChange, className = '' }: ColorInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && <span className="label mb-0 flex-1">{label}</span>}
      <button
        type="button"
        title={value}
        className="w-8 h-8 rounded-md border-2 border-white/20 hover:border-white/50 transition-colors shrink-0 shadow-sm"
        style={{ backgroundColor: value }}
        onClick={() => inputRef.current?.click()}
      />
      <input
        ref={inputRef}
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  )
}
