// Twitch EventSub over WebSocket — Channel Points redemptions.
// Connects to Twitch's EventSub WebSocket, subscribes to reward redemptions,
// and calls onRedemption when a matching reward is redeemed.
// Auto-reconnects on disconnect and handles the reconnect URL message.

import { WebSocket } from 'ws'

const EVENTSUB_URL = 'wss://eventsub.wss.twitch.tv/ws'
const HELIX_BASE = 'https://api.twitch.tv/helix'

export interface EventSubCallbacks {
  onRedemption: (rewardId: string, username: string, input: string) => void
  onStatusChange: (connected: boolean) => void
  getAccessToken: () => Promise<string | null>
}

type TwitchHeaders = Record<string, string>

async function helixHeaders(getToken: () => Promise<string | null>): Promise<TwitchHeaders | null> {
  const token = await getToken()
  const clientId = process.env.TWITCH_CLIENT_ID
  if (!token || !clientId) return null
  return {
    Authorization: `Bearer ${token}`,
    'Client-Id': clientId,
    'Content-Type': 'application/json',
  }
}

let ws: WebSocket | null = null
let keepAliveTimer: NodeJS.Timeout | null = null
let reconnectTimer: NodeJS.Timeout | null = null
let stopped = false

export async function connectEventSub(
  broadcasterId: string,
  rewardId: string | undefined,
  callbacks: EventSubCallbacks,
  connectUrl: string = EVENTSUB_URL
): Promise<void> {
  stopped = false
  cleanup()

  ws = new WebSocket(connectUrl)

  ws.on('open', () => {
    console.log('[EventSub] WebSocket connected')
  })

  ws.on('message', async (raw) => {
    let msg: Record<string, unknown>
    try {
      msg = JSON.parse(raw.toString()) as Record<string, unknown>
    } catch {
      return
    }

    const meta = msg.metadata as Record<string, string> | undefined
    const msgType = meta?.message_type
    const payload = msg.payload as Record<string, unknown> | undefined

    if (msgType === 'session_welcome') {
      const session = payload?.session as Record<string, unknown> | undefined
      const sessionId = session?.id as string | undefined
      if (!sessionId) return

      resetKeepalive(session?.keepalive_timeout_seconds as number ?? 10)
      callbacks.onStatusChange(true)

      if (rewardId && broadcasterId) {
        await subscribeToRedemptions(sessionId, broadcasterId, rewardId, callbacks.getAccessToken)
      }
    }

    if (msgType === 'session_keepalive') {
      resetKeepalive()
    }

    if (msgType === 'session_reconnect') {
      const session = payload?.session as Record<string, unknown> | undefined
      const reconnectUrl = session?.reconnect_url as string | undefined
      if (reconnectUrl) {
        cleanup()
        await connectEventSub(broadcasterId, rewardId, callbacks, reconnectUrl)
      }
    }

    if (msgType === 'notification') {
      const event = payload?.event as Record<string, unknown> | undefined
      if (!event) return
      const redeemedRewardId = (event.reward as Record<string, string> | undefined)?.id
      const username = event.user_name as string ?? 'unknown'
      const input = event.user_input as string ?? ''
      callbacks.onRedemption(redeemedRewardId ?? '', username, input)
    }

    if (msgType === 'revocation') {
      console.warn('[EventSub] Subscription revoked — check token scopes')
      callbacks.onStatusChange(false)
    }
  })

  ws.on('close', () => {
    console.log('[EventSub] Connection closed')
    callbacks.onStatusChange(false)
    cleanup()
    if (!stopped) {
      reconnectTimer = setTimeout(() => {
        connectEventSub(broadcasterId, rewardId, callbacks)
      }, 5000)
    }
  })

  ws.on('error', (err) => {
    console.error('[EventSub] Error:', err.message)
  })
}

async function subscribeToRedemptions(
  sessionId: string,
  broadcasterId: string,
  rewardId: string,
  getToken: () => Promise<string | null>
): Promise<void> {
  const headers = await helixHeaders(getToken)
  if (!headers) return

  const res = await fetch(`${HELIX_BASE}/eventsub/subscriptions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'channel.channel_points_custom_reward_redemption.add',
      version: '1',
      condition: { broadcaster_user_id: broadcasterId, reward_id: rewardId },
      transport: { method: 'websocket', session_id: sessionId },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('[EventSub] Subscription failed:', res.status, body)
  } else {
    console.log('[EventSub] Subscribed to channel point redemptions')
  }
}

export async function fulfillRedemption(
  broadcasterId: string,
  rewardId: string,
  redemptionId: string,
  getToken: () => Promise<string | null>
): Promise<void> {
  const headers = await helixHeaders(getToken)
  if (!headers) return

  await fetch(
    `${HELIX_BASE}/channel_points/custom_rewards/redemptions?broadcaster_id=${broadcasterId}&reward_id=${rewardId}&id=${redemptionId}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'FULFILLED' }),
    }
  ).catch(err => console.error('[EventSub] Fulfil error:', err))
}

export function disconnectEventSub(): void {
  stopped = true
  cleanup()
}

export function isEventSubConnected(): boolean {
  return ws?.readyState === WebSocket.OPEN
}

function cleanup(): void {
  if (keepAliveTimer) clearTimeout(keepAliveTimer)
  if (reconnectTimer) clearTimeout(reconnectTimer)
  keepAliveTimer = null
  reconnectTimer = null
  if (ws) {
    ws.removeAllListeners()
    if (ws.readyState === WebSocket.OPEN) ws.close()
    ws = null
  }
}

function resetKeepalive(timeoutSeconds = 10): void {
  if (keepAliveTimer) clearTimeout(keepAliveTimer)
  // If no message received within timeout + 2s grace, consider disconnected
  keepAliveTimer = setTimeout(() => {
    console.warn('[EventSub] Keepalive timeout — reconnecting')
    ws?.terminate()
  }, (timeoutSeconds + 2) * 1000)
}
