import { useEffect, useRef, useState } from 'react'

interface FontOption {
  label: string
  value: string
}

interface FontSelectProps {
  label?: string
  value: string
  options: FontOption[]
  onChange: (v: string) => void
}

export function FontSelect({ label, value, options, onChange }: FontSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value) ?? options[0]

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Scroll selected item into view when opening
  useEffect(() => {
    if (!open || !listRef.current) return
    const active = listRef.current.querySelector('[data-selected="true"]') as HTMLElement | null
    active?.scrollIntoView({ block: 'nearest' })
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      {label && <p className="label">{label}</p>}

      {/* Trigger button — shows current font rendered in itself */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="input text-sm flex items-center justify-between gap-2 cursor-pointer text-left"
        style={{ fontFamily: selected.value }}
      >
        <span className="truncate">{selected.label}</span>
        <svg
          className={`shrink-0 w-3.5 h-3.5 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown list */}
      {open && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full rounded-md border border-white/20 bg-[#16213e] shadow-xl overflow-y-auto scrollbar-thin"
          style={{ maxHeight: '260px' }}
        >
          {options.map(opt => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                data-selected={isSelected}
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  isSelected
                    ? 'bg-accent/20 text-accent'
                    : 'text-white hover:bg-white/10'
                }`}
                style={{ fontFamily: opt.value }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}