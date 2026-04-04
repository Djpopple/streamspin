import { Router } from 'express'
import type { Server } from 'socket.io'
import { readConfig, writeConfig } from '../configStore.js'
import { notifyConfigUpdate } from '../integrationManager.js'
import type { WheelConfig } from '../../types/config.js'
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from '../../types/events.js'

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

export function configRouter(io: IO): Router {
  const router = Router()

  router.get('/', (_req, res) => {
    res.json(readConfig())
  })

  router.post('/', (req, res) => {
    const body = req.body as WheelConfig
    if (typeof body !== 'object' || body === null || body.version === undefined) {
      res.status(400).json({ error: 'Invalid config body' })
      return
    }
    writeConfig(body)
    notifyConfigUpdate(body)

    // Push config to overlay clients only.
    // The editor manages its own state locally after the initial load.
    io.sockets.sockets.forEach((socket) => {
      if (socket.data.clientType === 'overlay') {
        socket.emit('config-update', { config: body })
      }
    })

    res.json({ ok: true })
  })

  return router
}
