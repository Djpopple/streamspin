import { useState, useRef } from 'react'
import type { Segment } from '@shared/config'
import { Panel } from '../ui/Panel'
import { Toggle } from '../ui/Toggle'
import { SEGMENT_COLORS, generateId, cycleColor } from '../../lib/constants'

interface Props {
  segments: Segment[]
  removeWinnerMode: boolean
  onChange: (segments: Segment[], removeWinnerMode?: boolean) => void
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="absolute top-full left-0 z-20 mt-1 p-2 bg-surface-overlay rounded-lg border border-white/15 shadow-xl">
      <div className="grid grid-cols-8 gap-1 mb-2">
        {SEGMENT_COLORS.map(c => (
          <button
            key={c}
            type="button"
            title={c}
            style={{ backgroundColor: c }}
            className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${value === c ? 'border-white' : 'border-transparent'}`}
            onClick={() => onChange(c)}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          style={{ backgroundColor: value }}
          className="w-6 h-6 rounded border border-white/20 shrink-0"
          onClick={() => inputRef.current?.click()}
        />
        <input
          ref={inputRef}
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="sr-only"
        />
        <input
          type="text"
          value={value}
          onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) onChange(e.target.value) }}
          className="input text-xs py-1 font-mono"
          maxLength={7}
        />
      </div>
    </div>
  )
}

interface SegmentRowProps {
  segment: Segment
  index: number
  total: number
  colorPickerOpen: boolean
  onOpenColorPicker: () => void
  onCloseColorPicker: () => void
  onChange: (seg: Segment) => void
  onDelete: () => void
  onMove: (dir: -1 | 1) => void
}

function SegmentRow({
  segment, index, total,
  colorPickerOpen, onOpenColorPicker, onCloseColorPicker,
  onChange, onDelete, onMove,
}: SegmentRowProps) {
  return (
    <div className={`rounded-lg border transition-colors ${segment.enabled ? 'border-white/10 bg-white/5' : 'border-white/5 bg-transparent opacity-50'}`}>
      <div className="flex items-center gap-2 p-2">
        {/* Color swatch + picker */}
        <div className="relative shrink-0">
          <button
            type="button"
            style={{ backgroundColor: segment.color }}
            className="w-7 h-7 rounded-md border-2 border-white/25 hover:border-white/60 transition-colors"
            onClick={colorPickerOpen ? onCloseColorPicker : onOpenColorPicker}
          />
          {colorPickerOpen && (
            <ColorPicker
              value={segment.color}
              onChange={c => { onChange({ ...segment, color: c }) }}
            />
          )}
        </div>

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
      </div>

      {/* Row controls */}
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

export function SegmentsPanel({ segments, removeWinnerMode, onChange }: Props) {
  const [colorPickerIndex, setColorPickerIndex] = useState<number | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')

  const update = (segs: Segment[], rwm?: boolean) => {
    onChange(segs, rwm)
    setColorPickerIndex(null)
  }

  const handleChange = (i: number, seg: Segment) => {
    const next = [...segments]
    next[i] = seg
    onChange(next)
  }

  const handleDelete = (i: number) => {
    if (segments.length <= 2) return // minimum 2 segments
    update(segments.filter((_, idx) => idx !== i))
  }

  const handleMove = (i: number, dir: -1 | 1) => {
    const next = [...segments]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    update(next)
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
    update([...segments, newSeg])
  }

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

    update([...segments, ...newSegs])
    setBulkText('')
    setBulkOpen(false)
  }

  const enabledCount = segments.filter(s => s.enabled).length

  return (
    // Clicking outside the panel closes color pickers
    <div onClick={() => setColorPickerIndex(null)}>
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
            <div key={seg.id} onClick={e => e.stopPropagation()}>
              <SegmentRow
                segment={seg}
                index={i}
                total={segments.length}
                colorPickerOpen={colorPickerIndex === i}
                onOpenColorPicker={() => setColorPickerIndex(i)}
                onCloseColorPicker={() => setColorPickerIndex(null)}
                onChange={seg => handleChange(i, seg)}
                onDelete={() => handleDelete(i)}
                onMove={dir => handleMove(i, dir)}
              />
            </div>
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
          <p className="text-white/25 text-xs">Weight = relative probability. Min 2 segments.</p>
        </div>
      </Panel>
    </div>
  )
}
