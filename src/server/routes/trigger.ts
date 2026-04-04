import { Router } from 'express'
import type { Server } from 'socket.io'
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from '../../types/events.js'
import { enqueueSpin } from '../socketBridge.js'

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

export function triggerRouter(io: IO): Router {
  const router = Router()

  router.post('/', (req, res) => {
    const secret = process.env.WEBHOOK_SECRET
    const body = req.body as { secret?: string; triggeredBy?: string }

    if (secret && body.secret !== secret) {
      res.status(401).json({ error: 'Invalid secret' })
      return
    }

    enqueueSpin(io, { triggeredBy: body.triggeredBy ?? 'webhook' })
    res.json({ ok: true, queued: true })
  })

  return router
}
