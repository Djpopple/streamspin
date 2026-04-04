// OAuth callback routes — currently stubs for Twitch.
// Tokens are stored in .env after first auth flow.

import { Router } from 'express'

export const authRouter = Router()

// Twitch OAuth — Phase 3
authRouter.get('/twitch', (_req, res) => {
  const clientId = process.env.TWITCH_CLIENT_ID
  const redirectUri = process.env.TWITCH_REDIRECT_URI

  if (!clientId || !redirectUri) {
    res.status(500).send('Twitch credentials not configured. Set TWITCH_CLIENT_ID and TWITCH_REDIRECT_URI in .env')
    return
  }

  const scopes = [
    'chat:read',
    'chat:edit',
    'channel:read:redemptions',
    'channel:manage:redemptions',
  ].join('+')

  const url = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scopes}`
  res.redirect(url)
})

authRouter.get('/twitch/callback', (_req, res) => {
  // Phase 3: exchange code for tokens, store in .env / config
  res.send('<h2>Twitch auth — coming in Phase 3</h2><p>Return to the StreamSpin editor.</p>')
})
