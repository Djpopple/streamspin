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
  const [activeName, setActiveName] = useState(() => localStorage.getItem('ss_activeName') ?? 'My Wheel')
  const [activeId, setActiveId] = useState<string | null>(() => localStorage.getItem('ss_activeId'))
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [isDirty, setIsDirty] = useState(false)
  const [pendingLoadId, setPendingLoadId] = useState<string | null>(null)
  const [skipDirtyConfirm, setSkipDirtyConfirm] = useState(
    () => localStorage.getItem('ss_skipDirtyConfirm') === 'true'
  )
  const lastSavedConfigRef = useRef<WheelConfig | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Persist active preset across reloads
  useEffect(() => {
    if (activeId) {
      localStorage.setItem('ss_activeId', activeId)
      localStorage.setItem('ss_activeName', activeName)
    } else {
      localStorage.removeItem('ss_activeId')
      localStorage.removeItem('ss_activeName')
    }
  }, [activeId, activeName])

  useEffect(() => {
    fetch('/api/presets')
      .then(r => r.json())
      .then((d: { presets: PresetSummary[] }) => {
        setPresets(d.presets)
        const storedId = localStorage.getItem('ss_activeId')
        if (storedId && !d.presets.find(p => p.id === storedId)) {
          setActiveId(null)
          setActiveName('My Wheel')
        }
      })
      .catch(() => {/* server cold start — ignore */})
  }, [])

  // Mark dirty whenever config changes after the last save/load
  useEffect(() => {
    if (activeId && lastSavedConfigRef.current !== null && config !== lastSavedConfigRef.current) {
      setIsDirty(true)
    }
  }, [config, activeId])

  const handleSave = async () => {
    if (!activeName.trim()) { nameInputRef.current?.focus(); return }
    setSaving(true)
    try {
      if (activeId) {
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
        const res = await fetch('/api/presets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: activeName.trim(), config }),
        })
        const data = await res.json() as { id: string; savedAt: string }
        setPresets(prev => [...prev, { id: data.id, name: activeName.trim(), savedAt: data.savedAt }])
        setActiveId(data.id)
      }
      lastSavedConfigRef.current = config
      setIsDirty(false)
    } finally {
      setSaving(false)
    }
  }

  const doLoad = async (id: string) => {
    setPendingLoadId(null)
    const res = await fetch(`/api/presets/${id}/load`, { method: 'POST' })
    const data = await res.json() as { config: WheelConfig }
    const preset = presets.find(p => p.id === id)
    lastSavedConfigRef.current = data.config
    setIsDirty(false)
    onLoad(data.config, preset?.name ?? '', id)
    setActiveId(id)
    setActiveName(preset?.name ?? '')
  }

  const handleLoad = (id: string) => {
    if (id === activeId) return
    if (isDirty && activeId && !skipDirtyConfirm) {
      setPendingLoadId(id)
      return
    }
    doLoad(id)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this saved wheel?')) return
    await fetch(`/api/presets/${id}`, { method: 'DELETE' })
    setPresets(prev => prev.filter(p => p.id !== id))
    if (activeId === id) {
      setActiveId(null)
      setActiveName('My Wheel')
      lastSavedConfigRef.current = null
      setIsDirty(false)
    }
  }

  const handleNew = () => {
    setActiveId(null)
    setActiveName('')
    lastSavedConfigRef.current = null
    setIsDirty(false)
    nameInputRef.current?.focus()
  }

  const handleSkipChange = (checked: boolean) => {
    setSkipDirtyConfirm(checked)
    localStorage.setItem('ss_skipDirtyConfirm', checked ? 'true' : 'false')
  }

  const saveLabel = activeId ? 'Update' : 'Save'
  const pendingPreset = pendingLoadId ? presets.find(p => p.id === pendingLoadId) : null

  return (
    <div className="bg-surface-overlay/30 border border-white/10 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(o => !o)}
        className="flex items-center justify-between w-full px-3 py-2.5 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-xs font-semibold text-white/60 uppercase tracking-wider shrink-0">Wheels</span>
          {presets.length > 0 && (
            <span className="text-xs text-white/30 bg-white/10 px-1.5 py-0.5 rounded shrink-0">
              {presets.length}
            </span>
          )}
          {activeId && activeName && (
            <span className={`text-xs truncate min-w-0 ${isDirty ? 'text-amber-400/80' : 'text-white/35'}`}>
              • {activeName}{isDirty ? ' ●' : ''}
            </span>
          )}
        </div>
        <span className="text-white/30 text-xs shrink-0 ml-2">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-white/5 pt-2.5">

          {/* Inline switch-away confirmation */}
          {pendingPreset && (
            <div className="rounded-md border border-amber-400/30 bg-amber-400/8 px-3 py-2.5 space-y-2.5">
              <p className="text-xs text-amber-300/90 leading-snug">
                Switch to <span className="font-semibold">"{pendingPreset.name}"</span>? Unsaved changes to <span className="font-semibold">"{activeName}"</span> will be lost.
              </p>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={skipDirtyConfirm}
                  onChange={e => handleSkipChange(e.target.checked)}
                  className="accent-amber-400 w-3 h-3"
                />
                <span className="text-xs text-white/40">Don't ask again</span>
              </label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => doLoad(pendingLoadId!)}
                  className="flex-1 text-xs py-1.5 rounded-md bg-amber-400/20 border border-amber-400/40 text-amber-300 hover:bg-amber-400/30 transition-colors"
                >
                  Switch
                </button>
                <button
                  type="button"
                  onClick={() => setPendingLoadId(null)}
                  className="flex-1 text-xs py-1.5 rounded-md border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Name + save row */}
          <div className="space-y-1.5">
            {activeId && (
              <p className={`text-xs ${isDirty ? 'text-amber-400/70' : 'text-white/30'}`}>
                {isDirty ? '● Unsaved changes' : '✓ Up to date'} — {activeName}
              </p>
            )}
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
                className={`text-xs px-3 py-1.5 shrink-0 min-w-[60px] rounded-md font-medium transition-colors ${
                  activeId && isDirty
                    ? 'bg-amber-500/25 border border-amber-400/50 text-amber-300 hover:bg-amber-500/40'
                    : 'btn-primary'
                }`}
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
                  {p.id === activeId && isDirty && (
                    <span className="text-amber-400/70 text-xs shrink-0">●</span>
                  )}
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
