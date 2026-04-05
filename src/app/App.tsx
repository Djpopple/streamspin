import { useCallback, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '@shared/events'
import type { WheelConfig } from '@shared/config'
import { DEFAULT_CONFIG } from '@shared/config'
import { fetchConfig, saveConfig, exportConfig, importConfig } from './lib/configApi'
import { WheelPreview } from './components/WheelPreview'
import { PresetManager } from './components/PresetManager'
import { SegmentsPanel } from './components/panels/SegmentsPanel'
import { AppearancePanel } from './components/panels/AppearancePanel'
import { PointerPanel } from './components/panels/PointerPanel'
import { SpinSettingsPanel } from './components/panels/SpinSettingsPanel'
import { ResultPanel } from './components/panels/ResultPanel'
import { IntegrationsPanel } from './components/panels/IntegrationsPanel'

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>
type SaveStatus = 'saved' | 'saving' | 'error'

function App() {
  const [config, setConfig] = useState<WheelConfig>(DEFAULT_CONFIG)
  const [connected, setConnected] = useState(false)
  const [socket, setSocket] = useState<AppSocket | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [copied, setCopied] = useState(false)

  // Refs so debounced save always uses the latest config
  const latestConfigRef = useRef(config)
  const skipNextSaveRef = useRef(true)   // skip save on initial load
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const importInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { latestConfigRef.current = config }, [config])

  // Load initial config via REST (not socket — editor owns its state)
  useEffect(() => {
    fetchConfig()
      .then(cfg => {
        setConfig(cfg)
        // Mark ready for saves AFTER this render cycle
        requestAnimationFrame(() => { skipNextSaveRef.current = false })
      })
      .catch(() => {
        // Server not ready yet (cold start) — use defaults and allow saves
        skipNextSaveRef.current = false
      })
  }, [])

  // Socket — used only for spin events, not config
  useEffect(() => {
    const s: AppSocket = io('/', { query: { clientType: 'editor' } })
    s.on('connect', () => setConnected(true))
    s.on('disconnect', () => setConnected(false))
    setSocket(s)
    return () => { s.disconnect() }
  }, [])

  // Keyboard shortcut: Space = test spin
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      e.preventDefault()
      socket?.emit('editor-spin')
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [socket])

  // Debounced save — fires 400ms after the last config change
  const triggerSave = useCallback(() => {
    clearTimeout(saveTimerRef.current)
    setSaveStatus('saving')
    saveTimerRef.current = setTimeout(async () => {
      try {
        await saveConfig(latestConfigRef.current)
        setSaveStatus('saved')
      } catch {
        setSaveStatus('error')
      }
    }, 400)
  }, [])

  useEffect(() => {
    if (skipNextSaveRef.current) return
    triggerSave()
  }, [config, triggerSave])

  // Patch helpers — update a slice of config
  const patchConfig = useCallback(<K extends keyof WheelConfig>(key: K, val: WheelConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: val }))
  }, [])

  // Load a preset — replaces active config and re-enables saves
  const handlePresetLoad = useCallback((cfg: WheelConfig) => {
    skipNextSaveRef.current = false
    setConfig(cfg)
  }, [])

  // Handlers
  const handleTestSpin = () => socket?.emit('editor-spin')

  const handleCopyUrl = () => {
    navigator.clipboard.writeText('http://localhost:3000/wheel')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const imported = await importConfig(file)
      skipNextSaveRef.current = false
      setConfig(imported)
    } catch {
      alert('Invalid StreamSpin config file.')
    }
    e.target.value = ''
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 py-3 bg-surface-raised border-b border-white/10 shrink-0 gap-4">
        <span className="text-lg font-bold tracking-tight shrink-0">StreamSpin</span>

        <div className="flex items-center gap-2 ml-auto">
          {/* Save status */}
          <span className={`text-xs tabular-nums transition-colors ${
            saveStatus === 'saving' ? 'text-yellow-400/70' :
            saveStatus === 'error'  ? 'text-red-400/70' :
            'text-white/25'
          }`}>
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'error' ? 'Save failed' : 'Saved'}
          </span>

          {/* Import */}
          <label className="btn-secondary text-xs px-3 py-1.5 cursor-pointer">
            Import
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="sr-only"
            />
          </label>

          {/* Export */}
          <button
            type="button"
            className="btn-secondary text-xs px-3 py-1.5"
            onClick={() => exportConfig(config)}
          >
            Export
          </button>

          {/* Connection indicator */}
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-white/40 text-xs hidden sm:inline">
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>

          {/* Test spin */}
          <button
            type="button"
            className="btn-primary text-sm px-4 py-1.5"
            onClick={handleTestSpin}
            disabled={!connected}
          >
            Test Spin
          </button>
        </div>
      </header>

      {/* ── Banners ──────────────────────────────────────────────── */}
      {!connected && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/15 border-b border-red-500/30 text-red-300 text-xs shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
          Disconnected from server — changes won't reach the overlay until reconnected.
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/15 border-b border-yellow-500/30 text-yellow-300 text-xs shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
          Auto-save failed — check that the server is running and config.json is writable.
        </div>
      )}

      {/* ── Main ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Sidebar ── */}
        <aside className="w-[420px] bg-surface-raised border-r border-white/10 overflow-y-auto shrink-0 flex flex-col scrollbar-thin">
          <div className="p-3 space-y-3">
            <PresetManager
              config={config}
              onLoad={(cfg, _name, _id) => handlePresetLoad(cfg)}
            />

            <SegmentsPanel
              segments={config.segments}
              removeWinnerMode={config.removeWinnerMode}
              onChange={(segments, rwm) => {
                const next: Partial<WheelConfig> = { segments }
                if (rwm !== undefined) next.removeWinnerMode = rwm
                setConfig(prev => ({ ...prev, ...next }))
              }}
            />

            <AppearancePanel
              wheel={config.wheel}
              onChange={wheel => patchConfig('wheel', wheel)}
            />

            <PointerPanel
              pointer={config.pointer}
              onChange={pointer => patchConfig('pointer', pointer)}
            />

            <SpinSettingsPanel
              spin={config.spin}
              sound={config.sound}
              onSpinChange={spin => patchConfig('spin', spin)}
              onSoundChange={sound => patchConfig('sound', sound)}
            />

            <ResultPanel
              result={config.result}
              onChange={result => patchConfig('result', result)}
            />

            <IntegrationsPanel
              config={config}
              socket={socket}
              onChange={(integrations, commands) => {
                setConfig(prev => ({
                  ...prev,
                  integrations,
                  ...(commands ? { commands } : {}),
                }))
              }}
            />
          </div>
        </aside>

        {/* ── Preview area ── */}
        <main className="flex-1 flex flex-col items-center justify-center gap-5 p-8 overflow-auto min-w-0">
          {/* OBS URL strip */}
          <div className="panel w-full max-w-lg shrink-0">
            <p className="label text-xs">OBS Browser Source URL</p>
            <div className="flex items-center gap-2">
              <code className="input font-mono text-sm text-accent flex-1 py-1.5">
                http://localhost:3000/wheel
              </code>
              <button
                type="button"
                className="btn-secondary text-xs px-3 py-1.5 shrink-0 min-w-[72px]"
                onClick={handleCopyUrl}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Wheel canvas */}
          <div className="rounded-2xl border border-white/10 bg-black/25 overflow-hidden shadow-2xl shrink-0">
            <WheelPreview config={config} socket={socket} size={520} />
          </div>

          <p className="text-white/20 text-xs shrink-0">
            Live preview — identical to OBS overlay
          </p>
        </main>
      </div>
    </div>
  )
}

export default App
