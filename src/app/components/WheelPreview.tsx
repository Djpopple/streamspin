// Live wheel preview rendered in the editor.
// Uses the same renderer and physics as the OBS overlay — pixel-perfect match.

import { useEffect, useRef, useState } from 'react'
import { Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '@shared/events'
import type { WheelConfig } from '@shared/config'
import { renderFrame, preloadCustomPointer, preloadFrameOverlay, preloadSegmentImage } from '../../wheel/renderer'
import {
  computeSegmentLayout,
  createSpinAnimation,
  tickAnimation,
  getWinnerLayout,
  pointerCanvasAngle,
} from '../../wheel/physics'
import type { SpinAnimation, SegmentLayout } from '../../wheel/physics'

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${opacity})`
}

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

interface Props {
  config: WheelConfig
  socket: AppSocket | null
  size?: number
}

export function WheelPreview({ config, socket, size = 480 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [resultText, setResultText] = useState<string | null>(null)
  const resultTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // Keep mutable refs so the animation loop always sees the latest values
  // without needing to restart the loop on every config change.
  const configRef = useRef(config)
  const socketRef = useRef(socket)    // keeps socket fresh inside the rAF closure
  const layoutRef = useRef<SegmentLayout[]>(computeSegmentLayout(config.segments))
  const animRef = useRef<SpinAnimation | null>(null)
  const rotationRef = useRef(0)
  const triggeredByRef = useRef('editor')

  useEffect(() => {
    configRef.current = config
    layoutRef.current = computeSegmentLayout(config.segments)
    if (config.pointer.customImageDataUrl) {
      preloadCustomPointer(config.pointer.customImageDataUrl)
    }
    if (config.wheel.frameImageDataUrl) {
      preloadFrameOverlay(config.wheel.frameImageDataUrl)
    }
    if (config.wheel.segmentImageDataUrl) {
      preloadSegmentImage(config.wheel.segmentImageDataUrl)
    }
  }, [config])

  useEffect(() => {
    socketRef.current = socket
  }, [socket])

  // Single render loop — started once, never restarted
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')!
    let rafId: number

    function loop() {
      const now = performance.now()
      const anim = animRef.current

      if (anim) {
        const { angle, complete } = tickAnimation(anim, now)
        rotationRef.current = angle

        if (complete) {
          rotationRef.current = anim.targetAngle
          const pAngle = pointerCanvasAngle(configRef.current.pointer.position)
          const winner = getWinnerLayout(layoutRef.current, anim.targetAngle, pAngle)
          const winnerSegment = configRef.current.segments[winner.index]

          socketRef.current?.emit('spin-complete', {
            winner: winnerSegment,
            triggeredBy: triggeredByRef.current,
          })
          animRef.current = null

          // Show result overlay in editor preview
          const { result } = configRef.current
          if (result.enabled) {
            const text = result.messageTemplate.replace('{winner}', winnerSegment.label)
            setResultText(text)
            clearTimeout(resultTimerRef.current)
            resultTimerRef.current = setTimeout(() => setResultText(null), result.duration)
          }

          // Release queue after result + linger
          const resultMs = result.enabled ? result.duration : 0
          const lingerMs = result.lingerDuration ?? 0
          setTimeout(() => socketRef.current?.emit('spin-done'), resultMs + lingerMs)
        }
      }

      renderFrame(ctx, configRef.current, layoutRef.current, rotationRef.current, now)
      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // intentionally empty — loop starts once, uses refs

  // Subscribe to spin events from the socket
  useEffect(() => {
    if (!socket) return

    const handleSpin = (event: { triggeredBy: string }) => {
      if (animRef.current) return  // already spinning
      triggeredByRef.current = event.triggeredBy
      const cfg = configRef.current
      const pAngle = pointerCanvasAngle(cfg.pointer.position)
      animRef.current = createSpinAnimation(
        cfg.spin,
        cfg.segments,
        layoutRef.current,
        rotationRef.current,
        pAngle
      )
    }

    socket.on('spin', handleSpin)
    return () => { socket.off('spin', handleSpin) }
  }, [socket])

  const { result } = config

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ width: size, height: size }}
      />
      {resultText && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="px-8 py-5 rounded-2xl font-bold text-center max-w-[80%] break-words animate-result-pop"
            style={{
              background: hexToRgba(result.backgroundColor, result.backgroundOpacity),
              color: result.textColor,
              fontFamily: result.font,
              fontSize: Math.min(result.fontSize, size / 8),
            }}
          >
            {resultText}
          </div>
        </div>
      )}
    </div>
  )
}
