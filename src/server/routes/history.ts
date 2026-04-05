import { Router } from 'express'
import type { Server } from 'socket.io'
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from '../../types/events.js'
import { getHistory, clearHistory, removeWin, updateWin } from '../historyStore.js'

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

export function historyRouter(io: IO) {
  const router = Router()

  router.get('/', (_req, res) => {
    res.json(getHistory())
  })

  router.delete('/', (_req, res) => {
    clearHistory()
    for (const s of io.sockets.sockets.values()) {
      if (s.data.clientType === 'editor') s.emit('history-cleared')
    }
    res.json({ ok: true })
  })

  router.delete('/:id', (req, res) => {
    const removed = removeWin(req.params.id)
    if (!removed) { res.status(404).json({ error: 'Not found' }); return }
    for (const s of io.sockets.sockets.values()) {
      if (s.data.clientType === 'editor') s.emit('win-removed', { id: req.params.id })
    }
    res.json({ ok: true })
  })

  router.patch('/:id', (req, res) => {
    const { label, triggeredBy } = req.body as { label?: string; triggeredBy?: string }
    if (typeof label !== 'string' || typeof triggeredBy !== 'string') {
      res.status(400).json({ error: 'label and triggeredBy are required strings' }); return
    }
    const updated = updateWin(req.params.id, label, triggeredBy)
    if (!updated) { res.status(404).json({ error: 'Not found' }); return }
    for (const s of io.sockets.sockets.values()) {
      if (s.data.clientType === 'editor') s.emit('win-updated', updated)
    }
    res.json(updated)
  })

  return router
}
