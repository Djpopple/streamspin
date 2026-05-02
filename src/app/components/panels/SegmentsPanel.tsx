import { useState, useRef } from 'react'
import type { Segment, SegmentImageMode } from '@shared/config'
import { Panel } from '../ui/Panel'
import { Toggle } from '../ui/Toggle'
import { ColorInput } from '../ui/ColorInput'
import { FontSelect } from '../ui/FontSelect'
import { Slider } from '../ui/Slider'
import { FONTS, generateId, cycleColor } from '../../lib/constants'

interface Props {
  segments: Segment[]
  removeWinnerMode: boolean
  segmentImageMode: SegmentImageMode
  onChange: (segments: Segment[], removeWinnerMode?: boolean) => void
}

interface SegmentRowProps {
  segment: Segment
  index: number
  total: number
  expanded: boolean
  segmentImageMode: SegmentImageMode
  onToggleExpand: () => void
  onChange: (seg: Segment) => void
  onDelete: () => void
  onMove: (dir: -1 | 1) => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
}

function SegmentRow({
  segment, index, total, expanded, segmentImageMode,
  onToggleExpand, onChange, onDelete, onMove,
  onDragStart, onDragOver, onDrop,
}: SegmentRowProps) {
  const hasGradient = segment.gradientColor !== undefined

  return (
    <div
      className={`rounded-lg border transition-colors ${segment.enabled ? 'border-white/10 bg-white/5' : 'border-white/5 bg-transparent opacity-50'}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* ── Main row ── */}
      <div className="flex items-center gap-2 p-2">
        {/* Drag handle */}
        <span
          className="text-white/20 hover:text-white/50 cursor-grab active:cursor-grabbing text-xs select-none shrink-0 px-0.5"
          title="Drag to reorder"
          draggable
          onDragStart={onDragStart}
        >⠿</span>

        {/* Colour swatch — opens unified palette dropdown */}
        <ColorInput
          compact
          value={segment.color}
          onChange={c => onChange({ ...segment, color: c })}
        />

        {/* Label */}
        <input
          type="text"
          value={segment.label}
          onChange={e => onChange({ ...segment, label: e.target.value })}
          className="input text-sm py-1 flex-1 min-w-0"
          placeholder="Segment label"
        />

        {/* Weight */}
        <input
          type="number"
          value={segment.weight}
          min={1}
          max={99}
          onChange={e => onChange({ ...segment, weight: Math.max(1, parseInt(e.target.value) || 1) })}
          className="input text-sm py-1 w-12 text-center"
          title="Weight (higher = more likely)"
        />

        {/* Enabled toggle */}
        <button
          type="button"
          title={segment.enabled ? 'Disable' : 'Enable'}
          onClick={() => onChange({ ...segment, enabled: !segment.enabled })}
          className={`text-xs px-1.5 py-1 rounded transition-colors ${segment.enabled ? 'text-green-400 hover:text-green-300' : 'text-white/30 hover:text-white/50'}`}
        >
          {segment.enabled ? '●' : '○'}
        </button>

        {/* Expand toggle */}
        <button
          type="button"
          title="More options"
          onClick={onToggleExpand}
          className={`text-xs px-1 py-1 rounded transition-colors ${expanded ? 'text-accent' : 'text-white/30 hover:text-white/60'}`}
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* ── Expanded options ── */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-white/8 pt-2.5">
          {/* Text colour */}
          <ColorInput
            label="Text colour"
            value={segment.textColor}
            onChange={v => onChange({ ...segment, textColor: v })}
          />

          {/* Gradient */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="label">Gradient fill</span>
              <button
                type="button"
                onClick={() => {
                  if (hasGradient) {
                    const { gradientColor: _, ...rest } = segment
                    onChange(rest as Segment)
                  } else {
                    onChange({ ...segment, gradientColor: '#ffffff' })
                  }
                }}
                className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                  hasGradient
                    ? 'border-accent/50 bg-accent/15 text-accent'
                    : 'border-white/15 text-white/40 hover:text-white/70'
                }`}
              >
                {hasGradient ? 'On' : 'Off'}
              </button>
            </div>
            {hasGradient && (
              <ColorInput
                label="Gradient start colour"
                value={segment.gradientColor!}
                onChange={v => onChange({ ...segment, gradientColor: v })}
              />
            )}
          </div>

          {/* Label position */}
          <Slider
            label="Label position"
            value={Math.round((segment.labelRadiusOffset ?? 0) * 100)}
            min={-40} max={40} step={5} unit="%"
            onChange={v => onChange({ ...segment, labelRadiusOffset: v === 0 ? undefined : v / 100 })}
          />

          {/* Font override */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="label">Font override</span>
              {segment.fontOverride && (
                <button
                  type="button"
                  onClick={() => { const { fontOverride: _, ...rest } = segment; onChange(rest as Segment) }}
                  className="text-xs text-white/40 hover:text-red-400 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
            <FontSelect
              value={segment.fontOverride ?? ''}
              options={[{ label: 'Use global font', value: '' }, ...FONTS]}
              onChange={(v: string) => onChange({ ...segment, fontOverride: v || undefined })}
            />
          </div>

          {/* Per-segment win sound */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="label">Win sound</span>
              {segment.soundDataUrl && (
                <button
                  type="button"
                  onClick={() => { const { soundDataUrl: _, soundVolume: __, ...rest } = segment; onChange(rest as Segment) }}
                  className="text-xs text-white/40 hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
            <label className={`flex items-center gap-2 cursor-pointer rounded-md border-2 border-dashed p-2.5 transition-colors ${
              segment.soundDataUrl ? 'border-accent/50 bg-accent/5' : 'border-white/15 hover:border-white/30'
            }`}>
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = ev => {
                    onChange({ ...segment, soundDataUrl: ev.target?.result as string, soundVolume: segment.soundVolume ?? 0.8 })
                  }
                  reader.readAsDataURL(file)
                  e.target.value = ''
                }}
              />
              <span className="text-xs text-white/50">
                {segment.soundDataUrl ? 'Sound loaded — click to replace' : 'Click to upload win sound…'}
              </span>
            </label>
            {segment.soundDataUrl && (
              <Slider
                label="Sound volume"
                value={Math.round((segment.soundVolume ?? 0.8) * 100)}
                min={0} max={100} step={5} unit="%"
                onChange={v => onChange({ ...segment, soundVolume: v / 100 })}
              />
            )}
            <p className="text-white/25 text-xs">Overrides the global win sound for this segment only.</p>
          </div>

          {/* Show image — only relevant in manual/reveal modes */}
          {(segmentImageMode === 'manual' || segmentImageMode === 'reveal') && (
            <Toggle
              label={segmentImageMode === 'reveal' ? 'Revealed (won)' : 'Show image'}
              checked={segment.showImage ?? false}
              onChange={v => onChange({ ...segment, showImage: v })}
              size="sm"
            />
          )}
        </div>
      )}

      {/* ── Row controls ── */}
      <div className="flex items-center gap-1 px-2 pb-2">
        <div className="flex gap-0.5 ml-auto">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="text-white/30 hover:text-white/70 disabled:opacity-20 px-1.5 py-0.5 text-xs transition-colors"
            title="Move up"
          >↑</button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            className="text-white/30 hover:text-white/70 disabled:opacity-20 px-1.5 py-0.5 text-xs transition-colors"
            title="Move down"
          >↓</button>
          <button
            type="button"
            onClick={onDelete}
            className="text-red-400/50 hover:text-red-400 px-1.5 py-0.5 text-xs transition-colors ml-1"
            title="Delete segment"
          >✕</button>
        </div>
      </div>
    </div>
  )
}

export function SegmentsPanel({ segments, removeWinnerMode, segmentImageMode, onChange }: Props) {
  const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const dragIndexRef = useRef<number | null>(null)

  const toggleExpanded = (id: string) => {
    setExpandedSet(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleChange = (i: number, seg: Segment) => {
    const next = [...segments]
    next[i] = seg
    onChange(next)
  }

  const handleDelete = (i: number) => {
    if (segments.length <= 2) return
    setExpandedSet(prev => { const s = new Set(prev); s.delete(segments[i].id); return s })
    onChange(segments.filter((_, idx) => idx !== i))
  }

  const handleMove = (i: number, dir: -1 | 1) => {
    const next = [...segments]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  const handleAdd = () => {
    const newSeg: Segment = {
      id: generateId(),
      label: `Prize ${segments.length + 1}`,
      color: cycleColor(segments.length),
      textColor: '#ffffff',
      weight: 1,
      enabled: true,
    }
    onChange([...segments, newSeg])
  }

  const handleDragStart = (i: number) => { dragIndexRef.current = i }

  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    const from = dragIndexRef.current
    if (from === null || from === i) return
    const next = [...segments]
    const [moved] = next.splice(from, 1)
    next.splice(i, 0, moved)
    dragIndexRef.current = i
    onChange(next)
  }

  const handleDrop = () => { dragIndexRef.current = null }

  const handleBulkImport = () => {
    const lines = bulkText
      .split(/[\n,]/)
      .map(l => l.trim())
      .filter(Boolean)
    if (lines.length === 0) return
    const newSegs: Segment[] = lines.map((label, i) => ({
      id: generateId(),
      label,
      color: cycleColor(segments.length + i),
      textColor: '#ffffff',
      weight: 1,
      enabled: true,
    }))
    onChange([...segments, ...newSegs])
    setBulkText('')
    setBulkOpen(false)
  }

  const enabledCount = segments.filter(s => s.enabled).length

  return (
    <Panel title="Segments" badge={`${enabledCount}/${segments.length}`}>

      <Toggle
        label="Remove winner after spin"
        description="Winning segment is removed each spin"
        checked={removeWinnerMode}
        onChange={v => onChange(segments, v)}
        size="sm"
      />

      <div className="space-y-1.5">
        {segments.map((seg, i) => (
          <SegmentRow
            key={seg.id}
            segment={seg}
            index={i}
            total={segments.length}
            expanded={expandedSet.has(seg.id)}
            onToggleExpand={() => toggleExpanded(seg.id)}
            onChange={seg => handleChange(i, seg)}
            onDelete={() => handleDelete(i)}
            onMove={dir => handleMove(i, dir)}
            segmentImageMode={segmentImageMode}
            onDragStart={() => handleDragStart(i)}
            onDragOver={e => handleDragOver(e, i)}
            onDrop={handleDrop}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <button type="button" className="btn-primary text-xs flex-1 py-1.5" onClick={handleAdd}>
          + Add Segment
        </button>
        <button
          type="button"
          className="btn-secondary text-xs px-3 py-1.5"
          onClick={() => setBulkOpen(o => !o)}
        >
          Bulk
        </button>
      </div>

      {bulkOpen && (
        <div className="space-y-2">
          <textarea
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            placeholder={'One per line, or comma-separated:\nPrize A\nPrize B\nPrize C'}
            className="input text-sm resize-none h-28 font-mono"
          />
          <div className="flex gap-2">
            <button type="button" className="btn-primary text-xs flex-1 py-1.5" onClick={handleBulkImport}>
              Import
            </button>
            <button type="button" className="btn-secondary text-xs px-3 py-1.5" onClick={() => setBulkOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="pt-1">
        <p className="text-white/25 text-xs">Weight = relative probability. Min 2 segments. Drag to reorder.</p>
      </div>
    </Panel>
  )
}
