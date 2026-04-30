import { useEffect, useRef, useState } from 'react'
import { SEGMENT_COLORS } from '../../lib/constants'
import { addRecentColor, getRecentColors } from '../../lib/recentColors'

function normaliseHex(raw: string): string | null {
  const s = raw.trim().replace(/^#/, '')
  if (s.length === 3) return `#${s.split('').map(c => c + c).join('')}`
  if (s.length === 6 && /^[0-9a-fA-F]{6}$/.test(s)) return `#${s}`
  return null
}

interface ColorInputProps {
  label?: string
  value: string
  onChange: (v: string) => void
  className?: string
  /** Compact mode: show only the swatch, no inline hex field (hex lives inside the dropdown). */
  compact?: boolean
}

export function ColorInput({ label, value, onChange, className = '', compact = false }: ColorInputProps) {
  const [open, setOpen] = useState(false)
  const [recent, setRecent] = useState<string[]>(() => getRecentColors())
  const containerRef = useRef<HTMLDivElement>(null)
  const nativeRef = useRef<HTMLInputElement>(null)

  // Refresh recent list and register outside-click handler when dropdown opens
  useEffect(() => {
    if (!open) return
    setRecent(getRecentColors())
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const pick = (hex: string) => {
    addRecentColor(hex)
    setRecent(getRecentColors())
    onChange(hex)
    setOpen(false)
  }

  const handleHex = (raw: string) => {
    const norm = normaliseHex(raw.startsWith('#') ? raw : `#${raw}`)
    if (norm) onChange(norm)
  }

  const commitRecent = () => {
    addRecentColor(value)
    setRecent(getRecentColors())
  }

  return (
    <div className={className} ref={containerRef}>
      {label && <p className="label">{label}</p>}
      <div className="flex items-center gap-2">

        {/* Swatch — toggles palette dropdown */}
        <div className="relative shrink-0">
          <button
            type="button"
            title="Pick colour"
            style={{ backgroundColor: value }}
            className={`rounded-md border-2 border-white/25 hover:border-white/60 transition-colors shadow-sm ${
              compact ? 'w-7 h-7' : 'w-8 h-8'
            }`}
            onClick={() => setOpen(o => !o)}
          />

          {/* Palette dropdown */}
          {open && (
            <div className="absolute top-full left-0 z-30 mt-1 p-3 bg-surface-overlay rounded-lg border border-white/15 shadow-xl w-72">

              {/* Recent colours */}
              {recent.length > 0 && (
                <>
                  <p className="text-xs text-white/35 mb-1.5">Recent</p>
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {recent.map(c => (
                      <button
                        key={c}
                        type="button"
                        title={c}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                          value === c ? 'border-white' : 'border-transparent'
                        }`}
                        onClick={() => pick(c)}
                      />
                    ))}
                  </div>
                  <div className="border-t border-white/8 mb-2.5" />
                </>
              )}

              {/* Preset palette */}
              <div className="grid grid-cols-10 gap-1.5 mb-3">
                {SEGMENT_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    style={{ backgroundColor: c }}
                    className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                      value === c ? 'border-white' : 'border-transparent'
                    }`}
                    onClick={() => pick(c)}
                  />
                ))}
              </div>

              {/* System colour picker + hex input */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="Open system colour picker"
                  style={{ backgroundColor: value }}
                  className="w-6 h-6 rounded border border-white/20 shrink-0"
                  onClick={() => nativeRef.current?.click()}
                />
                <input
                  ref={nativeRef}
                  type="color"
                  value={value}
                  onChange={e => onChange(e.target.value)}
                  onBlur={commitRecent}
                  className="absolute opacity-0 w-px h-px overflow-hidden"
                  tabIndex={-1}
                />
                <input
                  type="text"
                  defaultValue={value}
                  key={`dd-${value}`}
                  onChange={e => handleHex(e.target.value)}
                  onBlur={commitRecent}
                  className="input text-xs py-1 font-mono flex-1"
                  maxLength={7}
                  placeholder="#ffffff"
                />
              </div>
            </div>
          )}
        </div>

        {/* Inline hex input — only in non-compact mode */}
        {!compact && (
          <input
            type="text"
            defaultValue={value}
            key={value}
            onChange={e => handleHex(e.target.value)}
            onBlur={commitRecent}
            className="input text-sm font-mono flex-1 py-1.5"
            maxLength={7}
            placeholder="#ffffff"
            spellCheck={false}
          />
        )}
      </div>
    </div>
  )
}
