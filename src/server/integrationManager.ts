// Manages the lifecycle of all platform integrations.
// Called once on server startup. Reconnects when config changes.

import type { Server } from 'socket.io'
import { randomUUID } from 'crypto'
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from '../types/events.js'
import type { WheelConfig, Segment } from '../types/config.js'
import { readConfig, writeConfig } from './configStore.js'
import { getTwitchTokens, getValidAccessToken } from './tokenStore.js'
import {
  connectTwitchChat,
  disconnectTwitchChat,
  isTwitchChatConnected,
} from '../integrations/twitch/chat.js'
import {
  connectEventSub,
  disconnectEventSub,
  isEventSubConnected,
  fulfillRedemption,
} from '../integrations/twitch/eventsub.js'
import { enqueueSpin } from './socketBridge.js'

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

const SEGMENT_COLORS = [
  '#e94560', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
]

// Pending redemptions waiting for spin-complete to auto-fulfil
const pendingRedemptions = new Map<string, { rewardId: string; redemptionId: string }>()

let io_: IO | null = null
let lastTwitchConfig = ''  // JSON snapshot for change detection

export function initIntegrationManager(io: IO): void {
  io_ = io

  // Listen for spin-complete to auto-fulfil any pending Channel Points redemptions
  io.on('connection', (socket) => {
    socket.on('spin-complete', (event) => {
      const pending = pendingRedemptions.get(event.triggeredBy)
      if (!pending) return
      pendingRedemptions.delete(event.triggeredBy)

      const tokens = getTwitchTokens()
      if (!tokens) return

      fulfillRedemption(
        tokens.userId,
        pending.rewardId,
        pending.redemptionId,
        getValidAccessToken
      )
    })
  })

  tryConnectTwitch()
}

/** Called by config route after every successful save. */
export function notifyConfigUpdate(config: WheelConfig): void {
  const newSnapshot = JSON.stringify(config.integrations.twitch)
  if (newSnapshot === lastTwitchConfig) return
  lastTwitchConfig = newSnapshot

  // Reconnect Twitch if integration settings changed
  if (config.integrations.twitch.enabled) {
    tryConnectTwitch()
  } else {
    disconnectTwitchChat()
    disconnectEventSub()
    emitStatus('twitch', 'disconnected')
  }
}

export function getTwitchStatus(): { connected: boolean; username?: string; channel?: string } {
  const tokens = getTwitchTokens()
  const config = readConfig()

  if (isTwitchChatConnected() && tokens) {
    return {
      connected: true,
      username: tokens.username,
      channel: config.integrations.twitch.channel || tokens.username,
    }
  }
  return { connected: false }
}

export function getEventSubStatus(): boolean {
  return isEventSubConnected()
}

/** Called after OAuth completes to immediately connect with fresh tokens. */
export async function tryReconnectAfterAuth(): Promise<void> {
  await disconnectTwitchChat()
  disconnectEventSub()
  await tryConnectTwitch()
}

export async function disconnectTwitch(): Promise<void> {
  await disconnectTwitchChat()
  disconnectEventSub()
  emitStatus('twitch', 'disconnected')
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function tryConnectTwitch(): Promise<void> {
  const config = readConfig()
  const twitch = config.integrations.twitch

  if (!twitch.enabled) return

  const tokens = getTwitchTokens()
  if (!tokens) {
    console.log('[Integrations] Twitch enabled but no tokens — complete OAuth first')
    return
  }

  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    console.log('[Integrations] Could not get valid Twitch access token')
    return
  }

  emitStatus('twitch', 'connecting')

  // Chat
  try {
    await connectTwitchChat(twitch, accessToken, tokens.username, {
      onSpin: (username) => {
        emitChatMessage('twitch', username, '!spin')
        enqueueSpin(io_!, { triggeredBy: `twitch:${username}` })
      },
      onAddSlice: (label, requester) => {
        emitChatMessage('twitch', requester, `!addslice ${label}`)
        addSegment(label)
      },
      onRemoveSlice: (label, requester) => {
        emitChatMessage('twitch', requester, `!removeslice ${label}`)
        removeSegment(label)
      },
      onMessage: (username, message) => {
        emitChatMessage('twitch', username, message)
      },
      onStatusChange: (connected, message) => {
        emitStatus('twitch', connected ? 'connected' : 'disconnected', message)
      },
      getConfig: readConfig,
    })
    lastTwitchConfig = JSON.stringify(twitch)
  } catch {
    emitStatus('twitch', 'error', 'Failed to connect to chat')
    return
  }

  // EventSub (Channel Points)
  if (twitch.channelPointsEnabled && twitch.channelPointRewardId) {
    await connectEventSub(tokens.userId, twitch.channelPointRewardId, {
      onRedemption: (rewardId, username, _input) => {
        const triggeredBy = `twitch:${username}`
        pendingRedemptions.set(triggeredBy, {
          rewardId,
          redemptionId: randomUUID(), // actual redemption ID would come from event payload
        })
        enqueueSpin(io_!, { triggeredBy })
      },
      onStatusChange: (connected) => {
        console.log(`[EventSub] ${connected ? 'Connected' : 'Disconnected'}`)
      },
      getAccessToken: getValidAccessToken,
    })
  }
}

function addSegment(label: string): void {
  const config = readConfig()
  const color = SEGMENT_COLORS[config.segments.length % SEGMENT_COLORS.length]
  const newSeg: Segment = {
    id: randomUUID(),
    label,
    color,
    textColor: '#ffffff',
    weight: 1,
    enabled: true,
  }
  const updated = { ...config, segments: [...config.segments, newSeg] }
  writeConfig(updated)
  broadcastConfigToOverlay(updated)
}

function removeSegment(label: string): void {
  const config = readConfig()
  const lower = label.toLowerCase()
  const segments = config.segments.filter(s => s.label.toLowerCase() !== lower)
  if (segments.length === config.segments.length) return // no match
  if (segments.filter(s => s.enabled).length < 2) return // keep minimum 2
  const updated = { ...config, segments }
  writeConfig(updated)
  broadcastConfigToOverlay(updated)
}

function broadcastConfigToOverlay(config: WheelConfig): void {
  if (!io_) return
  io_.sockets.sockets.forEach(socket => {
    if (socket.data.clientType === 'overlay') {
      socket.emit('config-update', { config })
    }
  })
}

function emitStatus(
  platform: 'twitch' | 'kick' | 'webhook',
  status: 'connected' | 'disconnected' | 'connecting' | 'error',
  message?: string
): void {
  if (!io_) return
  io_.emit('integration-status', { platform, status, message })
}

function emitChatMessage(platform: 'twitch' | 'kick', username: string, message: string): void {
  if (!io_) return
  io_.emit('chat-message', { platform, username, message, timestamp: Date.now() })
}
