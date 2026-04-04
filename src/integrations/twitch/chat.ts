// Twitch chat integration via tmi.js.
// Parses chat commands and calls the provided callbacks.

import tmi from 'tmi.js'
import type { TwitchConfig, WheelConfig, CommandConfig } from '../../types/config.js'

export interface ChatCallbacks {
  onSpin: (username: string) => void
  onAddSlice: (label: string, requester: string) => void
  onRemoveSlice: (label: string, requester: string) => void
  onMessage: (username: string, message: string) => void
  onStatusChange: (connected: boolean, message?: string) => void
  getConfig: () => WheelConfig
}

// Per-user cooldown tracking
const cooldowns = new Map<string, Map<string, number>>() // commandName → userId → lastUsedMs

function isCooledDown(command: CommandConfig, userId: string): boolean {
  if (command.cooldownSeconds <= 0) return true
  const cmdMap = cooldowns.get(command.name) ?? new Map<string, number>()
  const lastUsed = cmdMap.get(userId) ?? 0
  return Date.now() - lastUsed >= command.cooldownSeconds * 1000
}

function setCooldown(command: CommandConfig, userId: string): void {
  if (!cooldowns.has(command.name)) cooldowns.set(command.name, new Map())
  cooldowns.get(command.name)!.set(userId, Date.now())
}

let client: tmi.Client | null = null

export async function connectTwitchChat(
  twitchConfig: TwitchConfig,
  accessToken: string,
  botUsername: string,
  callbacks: ChatCallbacks
): Promise<void> {
  if (client) await disconnectTwitchChat()

  const channel = twitchConfig.channel || botUsername

  client = new tmi.Client({
    options: { debug: false },
    identity: {
      username: botUsername,
      password: `oauth:${accessToken}`,
    },
    channels: [channel],
  })

  client.on('connected', () => {
    console.log(`[Twitch Chat] Connected to #${channel}`)
    callbacks.onStatusChange(true)
  })

  client.on('disconnected', (reason) => {
    console.log(`[Twitch Chat] Disconnected: ${reason}`)
    callbacks.onStatusChange(false, reason)
  })

  client.on('message', (ch, tags, message, self) => {
    if (self) return
    const text = message.trim()
    if (!text.startsWith('!')) return

    const username = tags['display-name'] ?? tags.username ?? 'unknown'
    const userId = tags['user-id'] ?? username
    const isMod = Boolean(tags.mod) || Boolean(tags.badges?.broadcaster)
    const isBroadcaster = Boolean(tags.badges?.broadcaster)

    callbacks.onMessage(username, text)

    const config = callbacks.getConfig()
    const [rawCmd, ...args] = text.split(' ')
    const cmdText = rawCmd.toLowerCase()

    for (const cmd of config.commands) {
      if (!cmd.enabled) continue
      if (cmd.trigger.toLowerCase() !== cmdText) continue
      if (cmd.broadcasterOnly && !isBroadcaster) continue
      if (cmd.modOnly && !isMod) continue
      if (!isCooledDown(cmd, userId)) continue

      setCooldown(cmd, userId)

      if (cmd.response && client) {
        client.say(ch, cmd.response).catch(() => {/* ignore send errors */})
      }

      if (cmd.name === 'spin') {
        callbacks.onSpin(username)
      } else if (cmd.name === 'addslice') {
        const label = args.join(' ').trim()
        if (label) callbacks.onAddSlice(label, username)
      } else if (cmd.name === 'removeslice') {
        const label = args.join(' ').trim()
        if (label) callbacks.onRemoveSlice(label, username)
      }

      break // only match first command
    }
  })

  try {
    await client.connect()
  } catch (err) {
    console.error('[Twitch Chat] Connection error:', err)
    callbacks.onStatusChange(false, String(err))
    throw err
  }
}

export async function disconnectTwitchChat(): Promise<void> {
  if (!client) return
  try {
    await client.disconnect()
  } catch {/* ignore */}
  client = null
}

export function isTwitchChatConnected(): boolean {
  return client?.readyState() === 'OPEN'
}

export function clearCooldowns(): void {
  cooldowns.clear()
}

/** Send a message to the connected channel. */
export async function sendChatMessage(channel: string, message: string): Promise<void> {
  if (!client || !isTwitchChatConnected()) return
  await client.say(channel, message).catch(() => {/* ignore */})
}
