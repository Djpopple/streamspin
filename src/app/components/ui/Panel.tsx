import { useState } from 'react'

interface PanelProps {
  title: string
  badge?: string | number
  defaultOpen?: boolean
  children: React.ReactNode
}

export function Panel({ title, badge, defaultOpen = true, children }: PanelProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="panel">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white/90">{title}</span>
          {badge !== undefined && (
            <span className="text-xs text-white/40 bg-white/10 px-1.5 py-0.5 rounded">
              {badge}
            </span>
          )}
        </div>
        <span className="text-white/40 text-sm leading-none">{open ? '▾' : '▸'}</span>
      </button>

      {open && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  )
}
