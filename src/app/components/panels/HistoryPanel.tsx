import { useEffect, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents, WinRecord } from '@shared/events'
import { Panel } from '../ui/Panel'

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

interface Props {
  socket: AppSocket | null
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  const today = new Date()
  if (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  ) return 'Today'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// ── Row with inline edit ──────────────────────────────────────────────────────

interface RowProps {
  record: WinRecord
  prevTimestamp?: number
  onRemove: (id: string) => void
  onSave: (id: string, label: string, triggeredBy: string) => void
}

function HistoryRow({ record, prevTimestamp, onRemove, onSave }: RowProps) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(record.label)
  const [triggeredBy, setTriggeredBy] = useState(record.triggeredBy)
  const labelRef = useRef<HTMLInputElement>(null)

  // Sync if record changes externally
  useEffect(() => { setLabel(record.label) }, [record.label])
  useEffect(() => { setTriggeredBy(record.triggeredBy) }, [record.triggeredBy])

  const startEdit = () => {
    setEditing(true)
    setTimeout(() => labelRef.current?.focus(), 0)
  }

  const commit = () => {
    setEditing(false)
    if (label.trim() !== record.label || triggeredBy.trim() !== record.triggeredBy) {
      onSave(record.id, label, triggeredBy)
    }
  }

  const cancel = () => {
    setEditing(false)
    setLabel(record.label)
    setTriggeredBy(record.triggeredBy)
  }

  const showDatePrefix =
    !prevTimestamp || formatDate(record.timestamp) !== formatDate(prevTimestamp)

  if (editing) {
    return (
      <div className="rounded-md bg-white/10 border border-white/20 p-2 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-full shrink-0 border border-white/20"
            style={{ backgroundColor: record.color }}
          />
          <input
            ref={labelRef}
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }}
            placeholder="Prize label"
            className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none border-b border-white/30 focus:border-accent pb-0.5"
          />
        </div>
        <input
          value={triggeredBy === 'editor' ? '' : triggeredBy}
          onChange={e => setTriggeredBy(e.target.value || 'editor')}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }}
          placeholder="Viewer / username (optional)"
          className="w-full bg-transparent text-xs text-white/60 placeholder-white/30 outline-none border-b border-white/20 focus:border-accent pb-0.5"
        />
        <div className="flex justify-end gap-2 pt-0.5">
          <button type="button" onClick={cancel} className="text-xs text-white/40 hover:text-white/70 transition-colors">Cancel</button>
          <button type="button" onClick={commit} className="text-xs text-accent hover:text-accent/80 transition-colors">Save</button>
        </div>
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-2.5 py-1.5 px-2 rounded-md bg-white/5 hover:bg-white/8 transition-colors">
      {/* Colour swatch */}
      <span
        className="w-3 h-3 rounded-full shrink-0 border border-white/20"
        style={{ backgroundColor: record.color }}
      />

      {/* Label + triggered-by stacked */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate leading-tight" title={record.label}>{record.label}</p>
        {record.triggeredBy !== 'editor' && (
          <p className="text-xs text-white/35 truncate leading-tight" title={record.triggeredBy}>{record.triggeredBy}</p>
        )}
      </div>

      {/* Timestamp */}
      <span
        className="text-white/30 text-xs shrink-0 tabular-nums"
        title={new Date(record.timestamp).toLocaleString()}
      >
        {showDatePrefix ? `${formatDate(record.timestamp)} ` : ''}{formatTime(record.timestamp)}
      </span>

      {/* Actions — visible on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          type="button"
          title="Edit"
          onClick={startEdit}
          className="text-white/40 hover:text-white transition-colors text-xs leading-none px-1"
        >
          ✎
        </button>
        <button
          type="button"
          title="Remove (claimed)"
          onClick={() => onRemove(record.id)}
          className="text-white/40 hover:text-red-400 transition-colors text-xs leading-none px-1"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function HistoryPanel({ socket }: Props) {
  const [history, setHistory] = useState<WinRecord[]>([])
  const [clearing, setClearing] = useState(false)

  // Load initial history
  useEffect(() => {
    fetch('/api/history')
      .then(r => r.json())
      .then((data: WinRecord[]) => setHistory(data))
      .catch(() => {})
  }, [])

  // Live socket updates
  useEffect(() => {
    if (!socket) return
    const onWin     = (r: WinRecord)        => setHistory(prev => [r, ...prev])
    const onRemoved = ({ id }: { id: string }) => setHistory(prev => prev.filter(r => r.id !== id))
    const onUpdated = (r: WinRecord)        => setHistory(prev => prev.map(x => x.id === r.id ? r : x))
    const onClear   = ()                    => setHistory([])
    socket.on('win-recorded',   onWin)
    socket.on('win-removed',    onRemoved)
    socket.on('win-updated',    onUpdated)
    socket.on('history-cleared', onClear)
    return () => {
      socket.off('win-recorded',   onWin)
      socket.off('win-removed',    onRemoved)
      socket.off('win-updated',    onUpdated)
      socket.off('history-cleared', onClear)
    }
  }, [socket])

  const handleRemove = async (id: string) => {
    setHistory(prev => prev.filter(r => r.id !== id))
    await fetch(`/api/history/${id}`, { method: 'DELETE' }).catch(() => {})
  }

  const handleSave = async (id: string, label: string, triggeredBy: string) => {
    const res = await fetch(`/api/history/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, triggeredBy }),
    }).catch(() => null)
    if (res?.ok) {
      const updated: WinRecord = await res.json()
      setHistory(prev => prev.map(r => r.id === id ? updated : r))
    }
  }

  const handleClear = async () => {
    setClearing(true)
    await fetch('/api/history', { method: 'DELETE' }).catch(() => {})
    setHistory([])
    setClearing(false)
  }

  return (
    <Panel title={`Win History${history.length > 0 ? ` (${history.length})` : ''}`} defaultOpen={false}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-white/40 text-xs">
          {history.length === 0 ? 'No spins yet' : `${history.length} result${history.length !== 1 ? 's' : ''} — hover to edit or remove`}
        </p>
        {history.length > 0 && (
          <button
            type="button"
            className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
            onClick={handleClear}
            disabled={clearing}
          >
            {clearing ? 'Clearing…' : 'Clear all'}
          </button>
        )}
      </div>

      {history.length > 0 && (
        <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin pr-1">
          {history.map((record, i) => (
            <HistoryRow
              key={record.id}
              record={record}
              prevTimestamp={i > 0 ? history[i - 1].timestamp : undefined}
              onRemove={handleRemove}
              onSave={handleSave}
            />
          ))}
        </div>
      )}
    </Panel>
  )
}
