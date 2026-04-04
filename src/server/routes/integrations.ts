import { Router } from 'express'
import { getTwitchStatus, disconnectTwitch } from '../integrationManager.js'
import { clearTwitchTokens, hasTwitchTokens } from '../tokenStore.js'

export const integrationsRouter = Router()

integrationsRouter.get('/status', (_req, res) => {
  res.json({
    twitch: {
      ...getTwitchStatus(),
      hasTokens: hasTwitchTokens(),
      clientIdConfigured: Boolean(process.env.TWITCH_CLIENT_ID),
    },
    webhook: {
      hasSecret: Boolean(process.env.WEBHOOK_SECRET),
    },
  })
})

integrationsRouter.post('/twitch/disconnect', async (_req, res) => {
  await disconnectTwitch()
  clearTwitchTokens()
  res.json({ ok: true })
})
