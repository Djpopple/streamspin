// Live wheel preview rendered in the editor.
// Uses the same renderer and physics as the OBS overlay — pixel-perfect match.

import { useEffect, useRef } from 'react'
import { Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '@shared/events'
import type { WheelConfig } from '@shared/config'
import { renderFrame, preloadCustomPointer } from '../../wheel/renderer'
import {
  computeSegmentLayout,
  createSpinAnimation,
  tickAnimation,
  getWinnerLayout,
  pointerCanvasAngle,
} from '../../wheel/physics'
import type { SpinAnimation, SegmentLayout } from '../../wheel/physics'

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

interface Props {
  config: WheelConfig
  socket: AppSocket | null
  size?: number
}

export function WheelPreview({ config, socket, size = 480 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

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
        }
      }

      renderFrame(ctx, configRef.current, layoutRef.current, rotationRef.current)
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

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
  )
}
