// Socket.io event contract — shared between server and client.
// Import from here, never define event shapes inline.

import type { WheelConfig, Segment } from './config.js'

// ── Server → Client ──────────────────────────────────────────────────────────

export interface SpinEvent {
  triggeredBy: string           // 'twitch:username', 'kick:username', 'webhook', 'editor'
}

export interface ConfigUpdateEvent {
  config: WheelConfig
}

export interface ChatMessageEvent {
  platform: 'twitch' | 'kick' | 'system'
  username: string
  message: string
  timestamp: number
}

export interface IntegrationStatusEvent {
  platform: 'twitch' | 'kick' | 'webhook'
  status: 'connected' | 'disconnected' | 'error' | 'connecting'
  message?: string
}

export interface SpinQueueEvent {
  queueLength: number
}

// ── Win History ───────────────────────────────────────────────────────────────

export interface WinRecord {
  id: string
  label: string
  color: string
  timestamp: number
  triggeredBy: string
}

// ── Client → Server ──────────────────────────────────────────────────────────

export interface SpinCompleteEvent {
  winner: Segment
  triggeredBy: string
}

// ── Typed Socket Maps (for socket.io type safety) ─────────────────────────────

// Events emitted by the server, received by clients
export interface ServerToClientEvents {
  spin: (event: SpinEvent) => void
  'config-update': (event: ConfigUpdateEvent) => void
  'chat-message': (event: ChatMessageEvent) => void
  'integration-status': (event: IntegrationStatusEvent) => void
  'spin-queue': (event: SpinQueueEvent) => void
  'win-recorded': (event: WinRecord) => void
  'win-removed': (event: { id: string }) => void
  'win-updated': (event: WinRecord) => void
  'history-cleared': () => void
}

// Events emitted by clients, received by the server
export interface ClientToServerEvents {
  'spin-complete': (event: SpinCompleteEvent) => void
  'spin-done': () => void   // emitted after result overlay + linger — releases the spin queue
  'editor-spin': () => void
}

export interface InterServerEvents {
  ping: () => void
}

export interface SocketData {
  clientType: 'editor' | 'overlay'
}
