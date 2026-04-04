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
import { authRouter } from './routes/auth.js'
import { setupSocketBridge } from './socketBridge.js'

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

app.use(express.json())
app.use(cors({ origin: `http://localhost:5173` }))

// API routes
app.use('/api/config', configRouter)
app.use('/api/trigger', triggerRouter(io))
app.use('/auth', authRouter)

// Serve the wheel overlay page (OBS Browser Source)
app.get('/wheel', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../public/wheel.html'))
})

// Serve built React editor in production
const distPath = path.join(__dirname, '../../dist')
app.use(express.static(distPath))
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

setupSocketBridge(io)

httpServer.listen(PORT, HOST, () => {
  console.log(`StreamSpin server running at http://${HOST}:${PORT}`)
  console.log(`  Editor:  http://localhost:${PORT}`)
  console.log(`  Overlay: http://localhost:${PORT}/wheel  ← paste this into OBS`)
})
