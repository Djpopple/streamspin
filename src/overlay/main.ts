// OBS Wheel Overlay — runs in the Browser Source.
// No React, no framework. Connects via Socket.io, renders via Canvas.
// Must stay lightweight — OBS embeds a Chromium instance with limited resources.

import { io } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '../types/events.js'
import type { WheelConfig } from '../types/config.js'
import { DEFAULT_CONFIG } from '../types/config.js'
import { renderFrame, preloadCustomPointer, preloadFrameOverlay, preloadSegmentImage } from '../wheel/renderer.js'
import {
  computeSegmentLayout,
  createSpinAnimation,
  tickAnimation,
  getWinnerLayout,
  pointerCanvasAngle,
} from '../wheel/physics.js'
import type { SpinAnimation, SegmentLayout } from '../wheel/physics.js'

// ── Canvas setup ──────────────────────────────────────────────────────────────

const canvas = document.getElementById('wheel-canvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!

function resizeCanvas() {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}
resizeCanvas()
window.addEventListener('resize', resizeCanvas)

// ── State ─────────────────────────────────────────────────────────────────────

let config: WheelConfig = DEFAULT_CONFIG
let layout: SegmentLayout[] = computeSegmentLayout(config.segments)
let rotation = 0
let animation: SpinAnimation | null = null
let triggeredBy = 'unknown'

// ── Result overlay ────────────────────────────────────────────────────────────

const resultEl = document.getElementById('result-overlay') as HTMLDivElement
const resultTextEl = document.getElementById('result-text') as HTMLDivElement

function showResult(winner: WheelConfig['segments'][number]) {
  const { result } = config
  if (!result.enabled) return

  const message = result.messageTemplate.replace('{winner}', winner.label)
  resultTextEl.textContent = message
  resultTextEl.style.background = hexToRgba(result.backgroundColor, result.backgroundOpacity)
  resultTextEl.style.color = result.textColor
  resultTextEl.style.fontFamily = result.font
  resultTextEl.style.fontSize = `${result.fontSize}px`

  resultEl.classList.add('visible')

  setTimeout(() => {
    resultEl.classList.remove('visible')
  }, result.duration)
}

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${opacity})`
}

// ── Sound ─────────────────────────────────────────────────────────────────────

function playAudio(dataUrl: string | undefined, volume: number) {
  if (!dataUrl) return
  const audio = new Audio(dataUrl)
  audio.volume = Math.max(0, Math.min(1, volume))
  audio.play().catch(() => {/* OBS may block audio until user interaction */})
}

// ── Animation loop ────────────────────────────────────────────────────────────

function loop() {
  const now = performance.now()

  if (animation) {
    const { angle, complete } = tickAnimation(animation, now)
    rotation = angle

    if (complete) {
      rotation = animation.targetAngle
      const pAngle = pointerCanvasAngle(config.pointer.position)
      const winner = getWinnerLayout(layout, rotation, pAngle)
      const winnerSegment = config.segments[winner.index]

      // Signal win immediately — triggers server-side win recording + reveal
      socket.emit('spin-complete', { winner: winnerSegment, triggeredBy })
      showResult(winnerSegment)

      if (config.sound.winEnabled) {
        playAudio(config.sound.winDataUrl, config.sound.winVolume)
      }

      // Release the spin queue only after result overlay + linger have elapsed
      const resultMs = config.result.enabled ? config.result.duration : 0
      const lingerMs = (config.result.lingerDuration ?? 0)
      setTimeout(() => socket.emit('spin-done'), resultMs + lingerMs)

      animation = null
    }
  }

  renderFrame(ctx, config, layout, rotation)
  requestAnimationFrame(loop)
}

requestAnimationFrame(loop)

// ── Socket.io ─────────────────────────────────────────────────────────────────

const socket = io('/', {
  query: { clientType: 'overlay' },
})

socket.on('connect', () => {
  console.log('[StreamSpin] Overlay connected')
})

socket.on('disconnect', () => {
  console.log('[StreamSpin] Overlay disconnected — reconnecting...')
})

socket.on('config-update', ({ config: newConfig }) => {
  config = newConfig
  layout = computeSegmentLayout(config.segments)
  if (config.pointer.customImageDataUrl) {
    preloadCustomPointer(config.pointer.customImageDataUrl)
  }
  if (config.wheel.frameImageDataUrl) {
    preloadFrameOverlay(config.wheel.frameImageDataUrl)
  }
  if (config.wheel.segmentImageDataUrl) {
    preloadSegmentImage(config.wheel.segmentImageDataUrl)
  }
})

socket.on('spin', (event) => {
  if (animation) return  // already spinning — socket bridge queues for us

  triggeredBy = event.triggeredBy
  const pAngle = pointerCanvasAngle(config.pointer.position)
  animation = createSpinAnimation(config.spin, config.segments, layout, rotation, pAngle)

  if (config.sound.spinStartEnabled) {
    playAudio(config.sound.spinStartDataUrl, config.sound.spinStartVolume)
  }
})
