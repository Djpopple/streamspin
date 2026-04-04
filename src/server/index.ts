import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from '../types/events.js'
import { configRouter } from './routes/config.js'
import { triggerRouter } from './routes/trigger.js'
import { presetsRouter } from './routes/presets.js'
import { authRouter } from './routes/auth.js'
import { integrationsRouter } from './routes/integrations.js'
import { setupSocketBridge } from './socketBridge.js'
import { initIntegrationManager } from './integrationManager.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PORT = parseInt(process.env.PORT ?? '3000', 10)
const HOST = process.env.HOST ?? '127.0.0.1'

const app = express()
const httpServer = createServer(app)

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: [`http://localhost:5173`, `http://localhost:${PORT}`],
    methods: ['GET', 'POST'],
  },
})

app.use(express.json({ limit: '10mb' }))
app.use(cors({ origin: `http://localhost:5173` }))

// API routes
app.use('/api/config', configRouter(io))
app.use('/api/trigger', triggerRouter(io))
app.use('/api/presets', presetsRouter(io))
app.use('/api/integrations', integrationsRouter)
app.use('/auth', authRouter)

const distPath = path.join(__dirname, '../../dist')
const isProd = process.env.NODE_ENV === 'production'

// Wheel overlay — OBS Browser Source target.
app.get('/wheel', (_req, res) => {
  if (isProd) {
    res.sendFile(path.join(distPath, 'overlay.html'))
  } else {
    res.redirect('http://localhost:5173/overlay.html')
  }
})

// Serve built React editor in production
app.use(express.static(distPath))
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

setupSocketBridge(io)
initIntegrationManager(io)

httpServer.listen(PORT, HOST, () => {
  console.log(`StreamSpin server running at http://${HOST}:${PORT}`)
  console.log(`  Editor:  http://localhost:${PORT}`)
  console.log(`  Overlay: http://localhost:${PORT}/wheel  ← paste this into OBS`)
})
