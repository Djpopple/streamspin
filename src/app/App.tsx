import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '@shared/events'
import type { WheelConfig } from '@shared/config'
import { DEFAULT_CONFIG } from '@shared/config'
import { WheelPreview } from './components/WheelPreview'

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

function App() {
  const [config, setConfig] = useState<WheelConfig>(DEFAULT_CONFIG)
  const [connected, setConnected] = useState(false)
  const [socket, setSocket] = useState<AppSocket | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const s: AppSocket = io('/', { query: { clientType: 'editor' } })
    s.on('connect', () => setConnected(true))
    s.on('disconnect', () => setConnected(false))
    s.on('config-update', (event) => setConfig(event.config))
    setSocket(s)
    return () => { s.disconnect() }
  }, [])

  const handleTestSpin = () => socket?.emit('editor-spin')

  const handleCopyUrl = () => {
    navigator.clipboard.writeText('http://localhost:3000/wheel')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-surface-raised border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-tight">StreamSpin</span>
          <span className="text-xs text-white/30 font-mono">v{config.version}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-white/50 text-xs">{connected ? 'Server connected' : 'Disconnected'}</span>
          </div>
          <button className="btn-primary text-sm" onClick={handleTestSpin} disabled={!connected}>
            Test Spin
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 bg-surface-raised border-r border-white/10 overflow-y-auto p-3 flex flex-col gap-3 shrink-0">
          <div className="panel">
            <h2 className="text-sm font-semibold mb-2 text-white/80">Segments</h2>
            <div className="space-y-1.5">
              {config.segments.filter(s => s.enabled).map((seg) => (
                <div key={seg.id} className="flex items-center gap-2 text-sm">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="truncate text-white/80">{seg.label}</span>
                  <span className="ml-auto text-white/30 text-xs">×{seg.weight}</span>
                </div>
              ))}
            </div>
            <p className="text-white/30 text-xs mt-3">Segment editor — Phase 2</p>
          </div>

          <div className="panel">
            <h2 className="text-sm font-semibold mb-2 text-white/80">Appearance</h2>
            <p className="text-white/30 text-xs">Colours, fonts, effects — Phase 2</p>
          </div>

          <div className="panel">
            <h2 className="text-sm font-semibold mb-2 text-white/80">Pointer</h2>
            <p className="text-white/30 text-xs">Preset &amp; custom image — Phase 2</p>
          </div>

          <div className="panel">
            <h2 className="text-sm font-semibold mb-2 text-white/80">Integrations</h2>
            <p className="text-white/30 text-xs">Twitch / Kick setup — Phase 3</p>
          </div>
        </aside>

        {/* Preview */}
        <main className="flex-1 flex flex-col items-center justify-center gap-5 p-8 overflow-auto">
          {/* OBS URL */}
          <div className="panel w-full max-w-lg">
            <p className="label">OBS Browser Source URL</p>
            <div className="flex items-center gap-2">
              <code className="input font-mono text-sm text-accent flex-1">
                http://localhost:3000/wheel
              </code>
              <button
                className="btn-secondary text-sm shrink-0 px-3 py-2 min-w-16"
                onClick={handleCopyUrl}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Wheel canvas */}
          <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
            <WheelPreview config={config} socket={socket} size={460} />
          </div>

          <p className="text-white/25 text-xs">
            This preview is identical to the OBS overlay
          </p>
        </main>
      </div>
    </div>
  )
}

export default App
