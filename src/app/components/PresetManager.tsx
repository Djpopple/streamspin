// Preset manager — save, load, and switch between named wheel configurations.
// Lives at the top of the sidebar. Preset saves are explicit (button click).
// Auto-save to config.json is separate and always runs in App.tsx.

import { useEffect, useRef, useState } from 'react'
import type { WheelConfig } from '@shared/config'

interface PresetSummary {
  id: string
  name: string
  savedAt: string
}

interface Props {
  config: WheelConfig
  onLoad: (config: WheelConfig, name: string, id: string) => void
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function PresetManager({ config, onLoad }: Props) {
  const [presets, setPresets] = useState<PresetSummary[]>([])
  const [activeName, setActiveName] = useState('My Wheel')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/presets')
      .then(r => r.json())
      .then((d: { presets: PresetSummary[] }) => setPresets(d.presets))
      .catch(() => {/* server cold start — ignore */})
  }, [])

  const handleSave = async () => {
    if (!activeName.trim()) { nameInputRef.current?.focus(); return }
    setSaving(true)
    try {
      if (activeId) {
        // Update existing preset
        const res = await fetch(`/api/presets/${activeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: activeName.trim(), config }),
        })
        const data = await res.json() as { savedAt: string }
        setPresets(prev => prev.map(p =>
          p.id === activeId ? { ...p, name: activeName.trim(), savedAt: data.savedAt } : p
        ))
      } else {
        // Create new preset
        const res = await fetch('/api/presets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: activeName.trim(), config }),
        })
        const data = await res.json() as { id: string; savedAt: string }
        setPresets(prev => [...prev, { id: data.id, name: activeName.trim(), savedAt: data.savedAt }])
        setActiveId(data.id)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleLoad = async (id: string) => {
    const res = await fetch(`/api/presets/${id}/load`, { method: 'POST' })
    const data = await res.json() as { config: WheelConfig }
    const preset = presets.find(p => p.id === id)
    onLoad(data.config, preset?.name ?? '', id)
    setActiveId(id)
    setActiveName(preset?.name ?? '')
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this saved wheel?')) return
    await fetch(`/api/presets/${id}`, { method: 'DELETE' })
    setPresets(prev => prev.filter(p => p.id !== id))
    if (activeId === id) {
      setActiveId(null)
      setActiveName('My Wheel')
    }
  }

  const handleNew = () => {
    setActiveId(null)
    setActiveName('My Wheel')
    nameInputRef.current?.focus()
  }

  const saveLabel = activeId ? 'Update' : 'Save'

  return (
    <div className="bg-surface-overlay/30 border border-white/10 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(o => !o)}
        className="flex items-center justify-between w-full px-3 py-2.5 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Wheels</span>
          {presets.length > 0 && (
            <span className="text-xs text-white/30 bg-white/10 px-1.5 py-0.5 rounded">
              {presets.length}
            </span>
          )}
        </div>
        <span className="text-white/30 text-xs">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-white/5 pt-2.5">
          {/* Name + save row */}
          <div className="flex items-center gap-1.5">
            <input
              ref={nameInputRef}
              type="text"
              value={activeName}
              onChange={e => setActiveName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              placeholder="Wheel name"
              className="input text-sm py-1.5 flex-1 min-w-0"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-xs px-3 py-1.5 shrink-0 min-w-[60px]"
            >
              {saving ? '…' : saveLabel}
            </button>
            <button
              type="button"
              onClick={handleNew}
              title="New wheel (keeps current design, clears preset link)"
              className="btn-secondary text-xs px-2.5 py-1.5 shrink-0"
            >
              +
            </button>
          </div>

          {/* Preset list */}
          {presets.length > 0 ? (
            <div className="space-y-1 max-h-52 overflow-y-auto -mx-1 px-1">
              {presets.map(p => (
                <div
                  key={p.id}
                  className={`group flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer transition-colors ${
                    p.id === activeId
                      ? 'bg-accent/20 border border-accent/25'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                  onClick={() => handleLoad(p.id)}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.id === activeId ? 'bg-accent' : 'bg-white/20'}`} />
                  <span className="text-sm text-white/80 truncate flex-1">{p.name}</span>
                  <span className="text-xs text-white/25 shrink-0 tabular-nums">{timeAgo(p.savedAt)}</span>
                  <button
                    type="button"
                    onClick={e => handleDelete(p.id, e)}
                    className="text-white/15 hover:text-red-400 text-xs px-1 shrink-0 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete preset"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/25 pb-1">
              No saved wheels yet. Design your wheel then click Save.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
