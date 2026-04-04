// Pointer preset drawing functions.
// All shapes are defined pointing RIGHT (+x direction), tip at (+size, 0).
// The caller rotates the canvas context before invoking these.

import type { PointerPreset } from '../types/config.js'

export type PointerDrawFn = (ctx: CanvasRenderingContext2D, size: number, color: string) => void

export const POINTER_PRESETS: Record<Exclude<PointerPreset, 'custom'>, PointerDrawFn> = {
  arrow: (ctx, size, color) => {
    ctx.beginPath()
    ctx.moveTo(size * 0.8, 0)              // tip
    ctx.lineTo(-size * 0.3, -size * 0.45) // upper back
    ctx.lineTo(-size * 0.05, 0)            // notch
    ctx.lineTo(-size * 0.3, size * 0.45)  // lower back
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 1.5
    ctx.stroke()
  },

  triangle: (ctx, size, color) => {
    ctx.beginPath()
    ctx.moveTo(size * 0.75, 0)
    ctx.lineTo(-size * 0.4, -size * 0.45)
    ctx.lineTo(-size * 0.4, size * 0.45)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 1.5
    ctx.stroke()
  },

  pin: (ctx, size, color) => {
    // Balloon-style: large circle at back, narrow neck, small tip
    ctx.beginPath()
    ctx.arc(-size * 0.1, 0, size * 0.42, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    // Needle
    ctx.beginPath()
    ctx.moveTo(-size * 0.1 + size * 0.42, 0)
    ctx.lineTo(size * 0.82, 0)
    ctx.strokeStyle = color
    ctx.lineWidth = size * 0.15
    ctx.stroke()
    // Tip dot
    ctx.beginPath()
    ctx.arc(size * 0.82, 0, size * 0.08, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  },

  gem: (ctx, size, color) => {
    // Diamond shape
    ctx.beginPath()
    ctx.moveTo(size * 0.75, 0)             // right tip
    ctx.lineTo(size * 0.1, -size * 0.45)  // top
    ctx.lineTo(-size * 0.4, 0)            // left
    ctx.lineTo(size * 0.1, size * 0.45)   // bottom
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    // Inner highlight
    ctx.beginPath()
    ctx.moveTo(size * 0.55, 0)
    ctx.lineTo(size * 0.1, -size * 0.25)
    ctx.lineTo(-size * 0.15, 0)
    ctx.closePath()
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.fill()
  },

  hand: (ctx, size, color) => {
    // Simplified pointing hand: rectangular palm + extended finger tip
    const w = size * 0.28
    const h = size * 0.55
    // Palm
    ctx.beginPath()
    ctx.roundRect(-size * 0.35, -h / 2, size * 0.5, h, 4)
    ctx.fillStyle = color
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    // Pointing finger
    ctx.beginPath()
    ctx.roundRect(size * 0.15, -w / 2, size * 0.55, w, w / 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    // Fingernail hint
    ctx.beginPath()
    ctx.arc(size * 0.67, 0, w * 0.32, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fill()
  },
}

/**
 * Returns the canvas rotation (in radians) needed to make a shape
 * that naturally points RIGHT (+x) instead point INWARD toward the wheel
 * from the given pointer position.
 *
 * Pointer positions and their "inward" canvas direction:
 *   top    → downward  = +π/2
 *   right  → leftward  = +π
 *   bottom → upward    = −π/2
 *   left   → rightward = 0
 *
 * Shape naturally points at 0 (right). Rotation = targetDirection − 0 = targetDirection.
 */
export function getPointerRotation(position: 'top' | 'right' | 'bottom' | 'left'): number {
  switch (position) {
    case 'top':    return Math.PI / 2
    case 'right':  return Math.PI
    case 'bottom': return -Math.PI / 2
    case 'left':   return 0
  }
}

/**
 * Returns the (x, y) position of the pointer origin relative to the wheel centre,
 * given the wheel radius and a gap offset.
 */
export function getPointerOrigin(
  position: 'top' | 'right' | 'bottom' | 'left',
  radius: number,
  gap: number
): { x: number; y: number } {
  switch (position) {
    case 'top':    return { x: 0,             y: -(radius + gap) }
    case 'right':  return { x:  (radius + gap), y: 0 }
    case 'bottom': return { x: 0,             y:  (radius + gap) }
    case 'left':   return { x: -(radius + gap), y: 0 }
  }
}
