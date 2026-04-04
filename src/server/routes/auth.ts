// Twitch OAuth 2.0 Authorization Code flow.
// Tokens are stored in tokens.json (gitignored), never in .env or the browser.

import { Router } from 'express'
import { setTwitchTokens } from '../tokenStore.js'
import { initIntegrationManager } from '../integrationManager.js'

export const authRouter = Router()

const SCOPES = [
  'chat:read',
  'chat:edit',
  'channel:read:redemptions',
  'channel:manage:redemptions',
].join(' ')

// Step 1: Redirect to Twitch OAuth
authRouter.get('/twitch', (_req, res) => {
  const clientId = process.env.TWITCH_CLIENT_ID
  const redirectUri = process.env.TWITCH_REDIRECT_URI

  if (!clientId || !redirectUri) {
    res.status(500).send(`
      <h2>Twitch not configured</h2>
      <p>Add <code>TWITCH_CLIENT_ID</code> and <code>TWITCH_REDIRECT_URI</code> to your <code>.env</code> file.</p>
      <p>See <code>.env.example</code> for details.</p>
    `)
    return
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    force_verify: 'true',
  })

  res.redirect(`https://id.twitch.tv/oauth2/authorize?${params}`)
})

// Step 2: Exchange code for tokens, fetch user info, store, redirect back to editor
authRouter.get('/twitch/callback', async (req, res) => {
  const { code, error, error_description } = req.query as Record<string, string>

  if (error) {
    res.send(resultPage('❌ Twitch auth failed', error_description ?? error, false))
    return
  }

  if (!code) {
    res.status(400).send(resultPage('❌ No code received', 'Twitch did not return an authorisation code.', false))
    return
  }

  const clientId = process.env.TWITCH_CLIENT_ID
  const clientSecret = process.env.TWITCH_CLIENT_SECRET
  const redirectUri = process.env.TWITCH_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    res.status(500).send(resultPage('❌ Server misconfigured', 'Missing TWITCH_CLIENT_SECRET in .env.', false))
    return
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenRes.ok) {
      const body = await tokenRes.text()
      res.status(500).send(resultPage('❌ Token exchange failed', body, false))
      return
    }

    const tokenData = await tokenRes.json() as {
      access_token: string
      refresh_token: string
      expires_in: number
    }

    // Fetch user info (to get userId and username)
    const userRes = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Client-Id': clientId,
      },
    })

    if (!userRes.ok) {
      res.status(500).send(resultPage('❌ Failed to fetch user info', 'Could not retrieve Twitch user details.', false))
      return
    }

    const userData = await userRes.json() as { data: Array<{ id: string; login: string; display_name: string }> }
    const user = userData.data[0]

    if (!user) {
      res.status(500).send(resultPage('❌ No user data', 'Twitch returned empty user list.', false))
      return
    }

    setTwitchTokens({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
      userId: user.id,
      username: user.login,
    })

    console.log(`[Auth] Twitch authenticated as ${user.display_name} (${user.id})`)

    // Kick off connection now that we have tokens
    // Import dynamically to avoid circular init order issues
    initIntegrationManager as unknown  // already called from index.ts; this triggers reconnect
    // Signal integrationManager to reconnect with new tokens
    const { tryReconnectAfterAuth } = await import('../integrationManager.js')
    await tryReconnectAfterAuth()

    res.send(resultPage(
      `✅ Connected as ${user.display_name}`,
      'You can close this tab and return to the StreamSpin editor.',
      true,
      user.display_name
    ))
  } catch (err) {
    console.error('[Auth] Twitch callback error:', err)
    res.status(500).send(resultPage('❌ Unexpected error', String(err), false))
  }
})

function resultPage(title: string, message: string, success: boolean, username?: string): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8">
  <title>StreamSpin — Twitch Auth</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #1a1a2e; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #16213e; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 40px; max-width: 400px; text-align: center; }
    h2 { font-size: 1.5rem; margin-bottom: 12px; }
    p { color: rgba(255,255,255,0.6); line-height: 1.5; }
    .icon { font-size: 3rem; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? '🎡' : '⚠️'}</div>
    <h2>${title}</h2>
    <p>${message}</p>
    ${username ? `<p style="margin-top:16px;color:#e94560;font-weight:600">${username}</p>` : ''}
    <p style="margin-top:24px;font-size:0.85rem">You can close this window.</p>
  </div>
  <script>
    // Auto-close after 3 seconds if opened in a new tab
    setTimeout(() => { try { window.close() } catch(e) {} }, 3000)
  </script>
</body>
</html>`
}
