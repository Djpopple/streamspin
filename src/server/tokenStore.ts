// Stores OAuth tokens in tokens.json (gitignored).
// Separate from config.json so tokens are never accidentally exported.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TOKENS_PATH = path.join(__dirname, '../../tokens.json')
const TMP_PATH = TOKENS_PATH + '.tmp'

export interface TwitchTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number       // unix ms
  userId: string          // broadcaster/bot user ID
  username: string        // broadcaster/bot login name
}

interface TokensFile {
  twitch?: TwitchTokens
}

function read(): TokensFile {
  if (!fs.existsSync(TOKENS_PATH)) return {}
  try {
    return JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf-8')) as TokensFile
  } catch {
    return {}
  }
}

function write(data: TokensFile): void {
  fs.writeFileSync(TMP_PATH, JSON.stringify(data, null, 2), 'utf-8')
  fs.renameSync(TMP_PATH, TOKENS_PATH)
}

export function getTwitchTokens(): TwitchTokens | null {
  return read().twitch ?? null
}

export function setTwitchTokens(tokens: TwitchTokens): void {
  const data = read()
  data.twitch = tokens
  write(data)
}

export function clearTwitchTokens(): void {
  const data = read()
  delete data.twitch
  write(data)
}

export function hasTwitchTokens(): boolean {
  return Boolean(read().twitch)
}

/** Refresh the access token using the stored refresh token. Returns updated tokens or null on failure. */
export async function refreshTwitchToken(): Promise<TwitchTokens | null> {
  const tokens = getTwitchTokens()
  if (!tokens) return null

  const clientId = process.env.TWITCH_CLIENT_ID
  const clientSecret = process.env.TWITCH_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  try {
    const res = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!res.ok) {
      console.error('[TokenStore] Token refresh failed:', res.status)
      return null
    }

    const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number }
    const updated: TwitchTokens = {
      ...tokens,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    }
    setTwitchTokens(updated)
    return updated
  } catch (err) {
    console.error('[TokenStore] Token refresh error:', err)
    return null
  }
}

/** Get a valid access token, refreshing if < 5 min from expiry. */
export async function getValidAccessToken(): Promise<string | null> {
  let tokens = getTwitchTokens()
  if (!tokens) return null

  const FIVE_MIN = 5 * 60 * 1000
  if (Date.now() > tokens.expiresAt - FIVE_MIN) {
    tokens = await refreshTwitchToken()
  }

  return tokens?.accessToken ?? null
}
