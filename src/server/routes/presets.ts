import { Router } from 'express'
import type { Server } from 'socket.io'
import {
  listPresets,
  getPreset,
  createPreset,
  updatePreset,
  deletePreset,
} from '../presetsStore.js'
import { writeConfig } from '../configStore.js'
import type { WheelConfig } from '../../types/config.js'
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from '../../types/events.js'

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

export function presetsRouter(io: IO): Router {
  const router = Router()

  // List all presets (name + id + savedAt, no full config payload)
  router.get('/', (_req, res) => {
    res.json({ presets: listPresets() })
  })

  // Get one preset including full config
  router.get('/:id', (req, res) => {
    const preset = getPreset(req.params.id)
    if (!preset) { res.status(404).json({ error: 'Not found' }); return }
    res.json(preset)
  })

  // Create a new preset
  router.post('/', (req, res) => {
    const { name, config } = req.body as { name?: string; config?: WheelConfig }
    if (!name || !config || config.version === undefined) {
      res.status(400).json({ error: 'name and valid config are required' })
      return
    }
    const preset = createPreset(name, config)
    res.json({ id: preset.id, savedAt: preset.savedAt })
  })

  // Update an existing preset (name, config, or both)
  router.put('/:id', (req, res) => {
    const updated = updatePreset(req.params.id, req.body as { name?: string; config?: WheelConfig })
    if (!updated) { res.status(404).json({ error: 'Not found' }); return }
    res.json({ ok: true, savedAt: updated.savedAt })
  })

  // Delete a preset
  router.delete('/:id', (_req, res) => {
    const deleted = deletePreset(_req.params.id)
    if (!deleted) { res.status(404).json({ error: 'Not found' }); return }
    res.json({ ok: true })
  })

  // Load a preset as the active config — writes config.json and pushes to overlay
  router.post('/:id/load', (req, res) => {
    const preset = getPreset(req.params.id)
    if (!preset) { res.status(404).json({ error: 'Not found' }); return }
    writeConfig(preset.config)
    io.sockets.sockets.forEach(socket => {
      if (socket.data.clientType === 'overlay') {
        socket.emit('config-update', { config: preset.config })
      }
    })
    res.json({ ok: true, config: preset.config })
  })

  return router
}
