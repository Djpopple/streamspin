// Translates chat events and trigger calls into socket.io events for the overlay.
// Also handles the spin queue so multiple pending spins execute in order.

import type { Server } from 'socket.io'
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  SpinEvent,
} from '../types/events.js'
import { readConfig, writeConfig } from './configStore.js'
import { addWin } from './historyStore.js'
import { randomUUID } from 'crypto'

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

const spinQueue: SpinEvent[] = []
let spinning = false

export function setupSocketBridge(io: IO): void {
  io.on('connection', (socket) => {
    const clientType = socket.handshake.query.clientType as 'editor' | 'overlay' | undefined
    socket.data.clientType = clientType ?? 'editor'

    // Send current config on connect
    socket.emit('config-update', { config: readConfig() })

    // Editor requests a test spin
    socket.on('editor-spin', () => {
      enqueueSpin(io, { triggeredBy: 'editor' })
    })

    // Overlay reports wheel stopped + winner — record win and trigger reveal if active.
    // Does NOT release the spin queue — spin-done does that after linger.
    socket.on('spin-complete', (event) => {
      console.log(`Spin complete — winner: ${event.winner.label} (triggered by ${event.triggeredBy})`)
      const record = {
        id: randomUUID(),
        label: event.winner.label,
        color: event.winner.color,
        timestamp: Date.now(),
        triggeredBy: event.triggeredBy,
      }
      addWin(record)
      for (const s of io.sockets.sockets.values()) {
        if (s.data.clientType === 'editor') s.emit('win-recorded', record)
      }

      // Reveal mode: flip winning segment showImage → true, persist, broadcast
      const config = readConfig()
      if (config.wheel.segmentImageMode === 'reveal') {
        const seg = config.segments.find(s => s.id === event.winner.id)
        if (seg && !seg.showImage) {
          seg.showImage = true
          writeConfig(config)
          io.emit('config-update', { config })
        }
      }
    })

    // Overlay signals it is ready for the next spin (after result overlay + linger).
    socket.on('spin-done', () => {
      spinning = false
      processQueue(io)
    })

    // If a client disconnects while a spin is in flight (e.g. editor page refresh),
    // reset the spinning flag after a short grace period so the queue doesn't jam.
    socket.on('disconnect', () => {
      if (!spinning) return
      setTimeout(() => {
        const sockets = io.sockets.sockets
        const anyConnected = [...sockets.values()].some(s => s.connected)
        if (!anyConnected) {
          spinning = false
          spinQueue.length = 0
        }
      }, 3000)
    })
  })
}

export function enqueueSpin(io: IO, event: SpinEvent): void {
  spinQueue.push(event)
  io.emit('spin-queue', { queueLength: spinQueue.length })
  if (!spinning) processQueue(io)
}

function processQueue(io: IO): void {
  if (spinQueue.length === 0) return
  spinning = true
  const next = spinQueue.shift()!
  io.emit('spin-queue', { queueLength: spinQueue.length })
  io.emit('spin', next)
}
