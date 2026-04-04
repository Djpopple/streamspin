import { useEffect, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents, IntegrationStatusEvent } from '@shared/events'
import type { WheelConfig, CommandConfig, TwitchConfig } from '@shared/config'
import { Panel } from '../ui/Panel'
import { Toggle } from '../ui/Toggle'
import { Slider } from '../ui/Slider'

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

interface IntegrationStatus {
  twitch: {
    connected: boolean
    username?: string
    channel?: string
    hasTokens: boolean
    clientIdConfigured: boolean
  }
  webhook: { hasSecret: boolean }
}

interface ChatLine {
  platform: 'twitch' | 'kick'
  username: string
  message: string
  timestamp: number
}

interface Props {
  config: WheelConfig
  socket: AppSocket | null
  onChange: (integrations: WheelConfig['integrations'], commands?: CommandConfig[]) => void
}

type Tab = 'twitch' | 'kick' | 'webhook'

const DEFAULT_STATUS: IntegrationStatus = {
  twitch: { connected: false, hasTokens: false, clientIdConfigured: false },
  webhook: { hasSecret: false },
}

export function IntegrationsPanel({ config, socket, onChange }: Props) {
  const [tab, setTab] = useState<Tab>('twitch')
  const [status, setStatus] = useState<IntegrationStatus>(DEFAULT_STATUS)
  const [chatLines, setChatLines] = useState<ChatLine[]>([])
  const chatRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval>>()

  // Poll status — fast while disconnected, stop polling when connected
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/integrations/status')
      const data = await res.json() as IntegrationStatus
      setStatus(data)
    } catch {/* server starting up */}
  }

  useEffect(() => {
    fetchStatus()
    pollRef.current = setInterval(fetchStatus, 3000)
    return () => clearInterval(pollRef.current)
  }, [])

  // Socket: live integration status + chat feed
  useEffect(() => {
    if (!socket) return

    const handleStatus = (event: IntegrationStatusEvent) => {
      if (event.platform === 'twitch') {
        setStatus(prev => ({
          ...prev,
          twitch: {
            ...prev.twitch,
            connected: event.status === 'connected',
          },
        }))
      }
    }

    const handleChat = (event: { platform: 'twitch' | 'kick' | 'system'; username: string; message: string; timestamp: number }) => {
      if (event.platform === 'system') return
      setChatLines(prev => [...prev.slice(-49), event as ChatLine])
    }

    socket.on('integration-status', handleStatus)
    socket.on('chat-message', handleChat)
    return () => {
      socket.off('integration-status', handleStatus)
      socket.off('chat-message', handleChat)
    }
  }, [socket])

  // Auto-scroll chat feed
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [chatLines])

  const setTwitch = (t: Partial<TwitchConfig>) =>
    onChange({ ...config.integrations, twitch: { ...config.integrations.twitch, ...t } })

  const handleConnect = () => {
    window.open('http://localhost:3000/auth/twitch', '_blank', 'width=500,height=700')
  }

  const handleDisconnect = async () => {
    await fetch('/api/integrations/twitch/disconnect', { method: 'POST' })
    await fetchStatus()
    setTwitch({ enabled: false })
  }

  return (
    <Panel title="Integrations" defaultOpen={false}>
      {/* Tab bar */}
      <div className="flex rounded-lg overflow-hidden border border-white/10 text-xs font-medium">
        {(['twitch', 'kick', 'webhook'] as Tab[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 capitalize transition-colors ${
              tab === t ? 'bg-accent text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            {t === 'twitch' && '💜 '}
            {t === 'kick' && '🟢 '}
            {t === 'webhook' && '🔗 '}
            {t}
          </button>
        ))}
      </div>

      {/* ── Twitch tab ── */}
      {tab === 'twitch' && (
        <div className="space-y-3">
          {/* Status + connect/disconnect */}
          <div className={`rounded-lg border p-3 flex items-center gap-3 ${
            status.twitch.connected
              ? 'border-green-500/30 bg-green-500/10'
              : 'border-white/10 bg-white/5'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              status.twitch.connected ? 'bg-green-400' : 'bg-white/20'
            }`} />
            <div className="flex-1 min-w-0">
              {status.twitch.connected ? (
                <>
                  <p className="text-sm font-medium text-green-400">Connected</p>
                  <p className="text-xs text-white/50 truncate">
                    {status.twitch.username} → #{status.twitch.channel}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-white/60">Not connected</p>
                  <p className="text-xs text-white/35">
                    {!status.twitch.clientIdConfigured
                      ? 'Add TWITCH_CLIENT_ID to .env first'
                      : status.twitch.hasTokens
                        ? 'Click Connect to reconnect'
                        : 'Authorise via Twitch to connect'}
                  </p>
                </>
              )}
            </div>
            {status.twitch.connected ? (
              <button type="button" onClick={handleDisconnect} className="btn-secondary text-xs px-3 py-1.5 shrink-0">
                Disconnect
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                disabled={!status.twitch.clientIdConfigured}
                className="btn-primary text-xs px-3 py-1.5 shrink-0 disabled:opacity-40"
              >
                Connect
              </button>
            )}
          </div>

          {!status.twitch.clientIdConfigured && (
            <div className="text-xs text-white/40 bg-white/5 rounded-lg p-3 space-y-1">
              <p className="font-medium text-white/60">Setup required</p>
              <p>1. Register an app at <span className="text-accent">dev.twitch.tv</span></p>
              <p>2. Set <code className="text-accent/80">TWITCH_CLIENT_ID</code>, <code className="text-accent/80">TWITCH_CLIENT_SECRET</code></p>
              <p>3. Set redirect URI to <code className="text-accent/80">http://localhost:3000/auth/twitch/callback</code></p>
              <p>4. Restart the server, then click Connect</p>
            </div>
          )}

          {/* Channel + enabled */}
          <Toggle
            label="Twitch enabled"
            checked={config.integrations.twitch.enabled}
            onChange={v => setTwitch({ enabled: v })}
            size="sm"
          />

          <div>
            <p className="label">Channel name</p>
            <input
              type="text"
              value={config.integrations.twitch.channel}
              onChange={e => setTwitch({ channel: e.target.value.toLowerCase().replace(/^#/, '') })}
              className="input text-sm"
              placeholder="your_twitch_channel"
            />
            <p className="text-xs text-white/30 mt-1">Leave blank to use the authenticated account's channel</p>
          </div>

          {/* Commands */}
          <div>
            <p className="label">Chat commands</p>
            <div className="space-y-2">
              {config.commands.map((cmd, i) => (
                <div key={cmd.name} className="rounded-lg border border-white/10 bg-white/5 p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Toggle
                        label=""
                        checked={cmd.enabled}
                        onChange={v => {
                          const next = [...config.commands]
                          next[i] = { ...cmd, enabled: v }
                          onChange(config.integrations, next)
                        }}
                        size="sm"
                      />
                      <code className="text-sm text-accent font-mono">{cmd.trigger}</code>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={cmd.modOnly}
                          onChange={e => {
                            const next = [...config.commands]
                            next[i] = { ...cmd, modOnly: e.target.checked }
                            onChange(config.integrations, next)
                          }}
                          className="accent-accent"
                        />
                        Mod only
                      </label>
                    </div>
                  </div>
                  <Slider
                    label="Cooldown"
                    value={cmd.cooldownSeconds}
                    min={0} max={300} step={5} unit="s"
                    onChange={v => {
                      const next = [...config.commands]
                      next[i] = { ...cmd, cooldownSeconds: v }
                      onChange(config.integrations, next)
                    }}
                  />
                  <div>
                    <p className="label">Bot response <span className="text-white/30 font-normal">(leave blank to disable)</span></p>
                    <input
                      type="text"
                      value={cmd.response}
                      onChange={e => {
                        const next = [...config.commands]
                        next[i] = { ...cmd, response: e.target.value }
                        onChange(config.integrations, next)
                      }}
                      className="input text-sm"
                      placeholder="No response"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Channel Points */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
            <Toggle
              label="Channel Points trigger"
              description="Spin when a reward is redeemed"
              checked={config.integrations.twitch.channelPointsEnabled}
              onChange={v => setTwitch({ channelPointsEnabled: v })}
              size="sm"
            />
            {config.integrations.twitch.channelPointsEnabled && (
              <div>
                <p className="label">Reward ID (UUID)</p>
                <input
                  type="text"
                  value={config.integrations.twitch.channelPointRewardId ?? ''}
                  onChange={e => setTwitch({ channelPointRewardId: e.target.value.trim() })}
                  className="input text-sm font-mono"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
                <p className="text-xs text-white/30 mt-1">
                  Create a reward in your Twitch dashboard, then find its ID via the Twitch API or browser dev tools.
                </p>
              </div>
            )}
          </div>

          {/* Chat feed */}
          {(status.twitch.connected || chatLines.length > 0) && (
            <div>
              <p className="label">Live chat</p>
              <div
                ref={chatRef}
                className="h-32 overflow-y-auto bg-black/30 rounded-lg border border-white/10 p-2 space-y-0.5"
              >
                {chatLines.length === 0 ? (
                  <p className="text-white/20 text-xs p-1">Waiting for chat messages…</p>
                ) : (
                  chatLines.map((line, i) => (
                    <div key={i} className="text-xs leading-relaxed">
                      <span className="text-purple-400 font-medium">{line.username}</span>
                      <span className="text-white/30">: </span>
                      <span className="text-white/70">{line.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Kick tab ── */}
      {tab === 'kick' && (
        <div className="space-y-3">
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
            <p className="text-sm font-medium text-green-400 mb-1">Kick via Botrix</p>
            <p className="text-xs text-white/50">
              Kick has no official bot API. The recommended approach is Botrix — a chatbot that supports custom JavaScript commands.
            </p>
          </div>

          <div className="space-y-2">
            {[
              { n: 1, text: 'Install Botrix from', link: 'botrix.live', href: 'https://botrix.live' },
              { n: 2, text: 'Connect Botrix to your Kick channel' },
              { n: 3, text: 'Create a !spin command → set action to Custom JavaScript' },
              { n: 4, text: 'Paste the snippet below into the JS editor' },
            ].map(step => (
              <div key={step.n} className="flex gap-2.5 text-xs text-white/60">
                <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-white/40 font-mono">{step.n}</span>
                <span>
                  {step.text}{' '}
                  {step.link && (
                    <span className="text-green-400 font-medium">{step.link}</span>
                  )}
                </span>
              </div>
            ))}
          </div>

          <div>
            <p className="label">Botrix custom JS snippet</p>
            <div className="relative">
              <pre className="text-xs bg-black/40 border border-white/10 rounded-lg p-3 overflow-x-auto text-green-300/80 leading-relaxed">
{`fetch('http://localhost:3000/api/trigger', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    secret: '${process.env.VITE_WEBHOOK_SECRET ?? 'YOUR_WEBHOOK_SECRET'}',
    triggeredBy: 'kick:' + username
  })
});`}
              </pre>
              <button
                type="button"
                onClick={() => {
                  const snippet = `fetch('http://localhost:3000/api/trigger', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({ secret: 'YOUR_WEBHOOK_SECRET', triggeredBy: 'kick:' + username })\n});`
                  navigator.clipboard.writeText(snippet)
                }}
                className="absolute top-2 right-2 btn-secondary text-xs px-2 py-1"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-white/30 mt-1">
              Replace <code className="text-accent/70">YOUR_WEBHOOK_SECRET</code> with your value from <code className="text-accent/70">WEBHOOK_SECRET</code> in <code className="text-accent/70">.env</code>
            </p>
          </div>

          <Toggle
            label="Botrix setup complete"
            description="Mark as done to track setup progress"
            checked={config.integrations.kick.botrixSetupComplete}
            onChange={v => onChange({ ...config.integrations, kick: { ...config.integrations.kick, botrixSetupComplete: v } })}
            size="sm"
          />
        </div>
      )}

      {/* ── Webhook tab ── */}
      {tab === 'webhook' && (
        <div className="space-y-3">
          <Toggle
            label="Webhook trigger enabled"
            checked={config.integrations.webhook.enabled}
            onChange={v => onChange({ ...config.integrations, webhook: { enabled: v } })}
            size="sm"
          />

          <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
            <p className="text-xs font-medium text-white/70">Endpoint</p>
            <code className="block text-xs text-accent font-mono break-all">POST http://localhost:3000/api/trigger</code>
            <div>
              <p className="text-xs text-white/50 mb-1">Secret status:</p>
              <span className={`text-xs px-2 py-0.5 rounded ${
                status.webhook.hasSecret
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {status.webhook.hasSecret ? '✓ WEBHOOK_SECRET set in .env' : '⚠ No secret — set WEBHOOK_SECRET in .env'}
              </span>
            </div>
          </div>

          <div>
            <p className="label">cURL example</p>
            <pre className="text-xs bg-black/40 border border-white/10 rounded-lg p-3 overflow-x-auto text-white/60 leading-relaxed whitespace-pre-wrap">
{`curl -X POST http://localhost:3000/api/trigger \\
  -H "Content-Type: application/json" \\
  -d '{"secret":"YOUR_WEBHOOK_SECRET"}'`}
            </pre>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
            <p className="text-xs font-medium text-white/70">Stream Deck setup</p>
            <div className="space-y-1.5 text-xs text-white/50">
              <p>1. Install the <span className="text-white/70">Web Requests</span> plugin from Elgato Marketplace</p>
              <p>2. Add a button → Web Requests action</p>
              <p>3. URL: <code className="text-accent/70">http://localhost:3000/api/trigger</code></p>
              <p>4. Method: POST  |  Header: <code className="text-accent/70">Content-Type: application/json</code></p>
              <p>5. Body: <code className="text-accent/70">{`{"secret":"YOUR_WEBHOOK_SECRET"}`}</code></p>
            </div>
          </div>
        </div>
      )}
    </Panel>
  )
}
