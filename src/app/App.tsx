import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '@shared/events'
import type { WheelConfig } from '@shared/config'
import { DEFAULT_CONFIG } from '@shared/config'

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

function App() {
  const [config, setConfig] = useState<WheelConfig>(DEFAULT_CONFIG)
  const [connected, setConnected] = useState(false)
  const [socket, setSocket] = useState<AppSocket | null>(null)

  useEffect(() => {
    const s: AppSocket = io('/', {
      query: { clientType: 'editor' },
    })

    s.on('connect', () => setConnected(true))
    s.on('disconnect', () => setConnected(false))
    s.on('config-update', (event) => setConfig(event.config))

    setSocket(s)
    return () => { s.disconnect() }
  }, [])

  const handleTestSpin = () => {
    socket?.emit('editor-spin')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-surface-raised border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold tracking-tight">StreamSpin</span>
          <span className="text-xs text-white/40 font-mono">v{config.version}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-white/60">{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <button className="btn-primary" onClick={handleTestSpin}>
            Test Spin
          </button>
        </div>
      </header>

      {/* Main layout — sidebar + preview */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar placeholder */}
        <aside className="w-80 bg-surface-raised border-r border-white/10 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="panel">
            <h2 className="font-semibold mb-3">Segments</h2>
            <p className="text-white/40 text-sm">Segment editor — Phase 2</p>
          </div>
          <div className="panel">
            <h2 className="font-semibold mb-3">Appearance</h2>
            <p className="text-white/40 text-sm">Appearance controls — Phase 2</p>
          </div>
          <div className="panel">
            <h2 className="font-semibold mb-3">Integrations</h2>
            <p className="text-white/40 text-sm">Twitch / Kick setup — Phase 3</p>
          </div>
        </aside>

        {/* Preview area */}
        <main className="flex-1 flex flex-col items-center justify-center bg-surface gap-6 p-8">
          <div className="panel w-full max-w-md text-center">
            <p className="text-white/60 text-sm mb-2">OBS Browser Source URL</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 input font-mono text-sm text-accent">
                http://localhost:3000/wheel
              </code>
              <button
                className="btn-secondary px-3 py-2 text-sm shrink-0"
                onClick={() => navigator.clipboard.writeText('http://localhost:3000/wheel')}
              >
                Copy
              </button>
            </div>
          </div>

          {/* Wheel canvas preview placeholder */}
          <div className="rounded-xl border-2 border-white/10 bg-black/30 flex items-center justify-center"
               style={{ width: 500, height: 500 }}>
            <div className="text-center text-white/30">
              <div className="text-6xl mb-4">🎡</div>
              <p className="text-sm">Wheel preview — Phase 1</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
