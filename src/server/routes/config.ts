import { Router } from 'express'
import { readConfig, writeConfig } from '../configStore.js'
import type { WheelConfig } from '../../types/config.js'

export const configRouter = Router()

configRouter.get('/', (_req, res) => {
  res.json(readConfig())
})

configRouter.post('/', (req, res) => {
  const body = req.body as WheelConfig
  if (typeof body !== 'object' || body === null || body.version === undefined) {
    res.status(400).json({ error: 'Invalid config body' })
    return
  }
  writeConfig(body)
  res.json({ ok: true })
})
