import { useRef } from 'react'

interface ColorInputProps {
  label?: string
  value: string
  onChange: (v: string) => void
  className?: string
}

// Accepts 3-char shorthand and normalises to 6-char hex
function normaliseHex(raw: string): string | null {
  const s = raw.trim().replace(/^#/, '')
  if (s.length === 3) {
    const expanded = s.split('').map(c => c + c).join('')
    return `#${expanded}`
  }
  if (s.length === 6 && /^[0-9a-fA-F]{6}$/.test(s)) return `#${s}`
  return null
}

export function ColorInput({ label, value, onChange, className = '' }: ColorInputProps) {
  const nativeRef = useRef<HTMLInputElement>(null)

  const handleText = (raw: string) => {
    // Allow free-typing; only fire onChange when it becomes a valid hex
    const normalised = normaliseHex(raw.startsWith('#') ? raw : `#${raw}`)
    if (normalised) onChange(normalised)
  }

  return (
    <div className={className}>
      {label && <p className="label">{label}</p>}
      <div className="flex items-center gap-2">
        {/* Swatch — opens native colour picker */}
        <button
          type="button"
          title="Pick colour"
          className="w-8 h-8 rounded-md border-2 border-white/25 hover:border-white/60 transition-colors shrink-0 shadow-sm"
          style={{ backgroundColor: value }}
          onClick={() => nativeRef.current?.click()}
        />
        {/* Hidden native picker */}
        <input
          ref={nativeRef}
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="absolute opacity-0 w-px h-px overflow-hidden"
          tabIndex={-1}
        />
        {/* Inline hex text field */}
        <input
          type="text"
          defaultValue={value}
          key={value}              // reset when value changes externally
          onChange={e => handleText(e.target.value)}
          className="input text-sm font-mono flex-1 py-1.5"
          maxLength={7}
          placeholder="#ffffff"
          spellCheck={false}
        />
      </div>
    </div>
  )
}
