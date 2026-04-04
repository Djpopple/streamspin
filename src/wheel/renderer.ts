// Wheel Canvas renderer — pure function, no side effects, no framework dependencies.
// Receives the current rotation angle (radians) on every animation frame.
//
// Coordinate conventions (standard HTML5 Canvas):
//   • Origin (0,0) = top-left
//   • +x = right, +y = down
//   • Angles increase CLOCKWISE; 0 = 3 o'clock
//   • Wheel centre = (cx, cy)

import type { WheelConfig } from '../types/config.js'
import type { SegmentLayout } from './physics.js'
import {
  POINTER_PRESETS,
  getPointerRotation,
  getPointerOrigin,
} from './pointers.js'

const TWO_PI = Math.PI * 2

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Render a single frame. Call this inside requestAnimationFrame.
 *
 * @param ctx     2D rendering context of the target canvas
 * @param config  Current WheelConfig
 * @param layout  Pre-computed segment layout (from computeSegmentLayout)
 * @param rotation  Current wheel rotation in radians
 */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  config: WheelConfig,
  layout: SegmentLayout[],
  rotation: number
): void {
  const { width, height } = ctx.canvas
  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(width, height) / 2 - (config.wheel.framePadding ?? 56)

  // Clear + background
  ctx.clearRect(0, 0, width, height)
  if (config.wheel.backgroundColor !== 'transparent') {
    ctx.fillStyle = config.wheel.backgroundColor
    ctx.fillRect(0, 0, width, height)
  }

  if (layout.length === 0) {
    drawEmptyState(ctx, cx, cy, radius, config)
    return
  }

  applyShadow(ctx, config)
  applyGlow(ctx, config)
  drawSegments(ctx, config, layout, cx, cy, radius, rotation)
  clearGlow(ctx)
  clearShadow(ctx)

  drawBorder(ctx, config, cx, cy, radius)
  drawHub(ctx, config, cx, cy)
  drawLabels(ctx, config, layout, cx, cy, radius, rotation)
  drawPointer(ctx, config, cx, cy, radius)
  drawFrame(ctx, config, width, height)
}

// ── Segments ──────────────────────────────────────────────────────────────────

function drawSegments(
  ctx: CanvasRenderingContext2D,
  config: WheelConfig,
  layout: SegmentLayout[],
  cx: number, cy: number, radius: number,
  rotation: number
): void {
  for (const seg of layout) {
    const start = rotation + seg.start
    const end = rotation + seg.start + seg.span
    const segment = config.segments[seg.index]

    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, radius, start, end)
    ctx.closePath()

    if (segment.gradientColor) {
      // Radial gradient along the segment's centre line, from hub edge to rim
      const midAngle = rotation + seg.mid
      const gx0 = cx + config.wheel.hubSize * Math.cos(midAngle)
      const gy0 = cy + config.wheel.hubSize * Math.sin(midAngle)
      const gx1 = cx + radius * Math.cos(midAngle)
      const gy1 = cy + radius * Math.sin(midAngle)
      const grad = ctx.createLinearGradient(gx0, gy0, gx1, gy1)
      grad.addColorStop(0, segment.gradientColor)
      grad.addColorStop(1, segment.color)
      ctx.fillStyle = grad
    } else {
      ctx.fillStyle = segment.color
    }
    ctx.fill()

    // Subtle inner border between segments
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

// ── Border ────────────────────────────────────────────────────────────────────

function drawBorder(
  ctx: CanvasRenderingContext2D,
  config: WheelConfig,
  cx: number, cy: number, radius: number
): void {
  if (config.wheel.borderWidth <= 0) return
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, TWO_PI)
  ctx.strokeStyle = config.wheel.borderColor
  ctx.lineWidth = config.wheel.borderWidth
  ctx.stroke()
}

// ── Hub ───────────────────────────────────────────────────────────────────────

function drawHub(
  ctx: CanvasRenderingContext2D,
  config: WheelConfig,
  cx: number, cy: number
): void {
  const { hubSize, hubColor, borderColor, borderWidth } = config.wheel
  if (hubSize <= 0) return

  ctx.beginPath()
  ctx.arc(cx, cy, hubSize, 0, TWO_PI)
  ctx.fillStyle = hubColor
  ctx.fill()

  if (borderWidth > 0) {
    ctx.strokeStyle = borderColor
    ctx.lineWidth = Math.max(1, borderWidth * 0.5)
    ctx.stroke()
  }

  // Sheen
  const grad = ctx.createRadialGradient(cx - hubSize * 0.2, cy - hubSize * 0.2, 0, cx, cy, hubSize)
  grad.addColorStop(0, 'rgba(255,255,255,0.35)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.beginPath()
  ctx.arc(cx, cy, hubSize, 0, TWO_PI)
  ctx.fillStyle = grad
  ctx.fill()
}

// ── Labels ────────────────────────────────────────────────────────────────────

function drawLabels(
  ctx: CanvasRenderingContext2D,
  config: WheelConfig,
  layout: SegmentLayout[],
  cx: number, cy: number, radius: number,
  rotation: number
): void {
  const { globalFont, globalFontSize } = config.wheel

  for (const seg of layout) {
    const segment = config.segments[seg.index]
    const midAngle = rotation + seg.mid
    const font = segment.fontOverride ?? globalFont
    const fontSize = Math.max(10, Math.min(globalFontSize, (seg.span * radius) / 3.5))

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(midAngle)

    // Text runs from inner hub outward; positioned at 55% of radius (+/- per-segment offset)
    const textX = radius * (0.55 + (segment.labelRadiusOffset ?? 0))
    ctx.translate(textX, 0)

    // Clamp text to available width
    const maxWidth = radius * 0.82 - config.wheel.hubSize

    const weight = config.wheel.labelBold ? 'bold' : 'normal'
    const style  = config.wheel.labelItalic ? 'italic' : 'normal'
    ctx.font = `${style} ${weight} ${fontSize}px ${font}`
    ctx.fillStyle = segment.textColor
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'

    if (ctx.measureText(segment.label).width > maxWidth) {
      ctx.fillText(segment.label, 0, 0, maxWidth)
    } else {
      ctx.fillText(segment.label, 0, 0)
    }

    ctx.restore()
  }
}

// ── Shadow ────────────────────────────────────────────────────────────────────

function applyShadow(ctx: CanvasRenderingContext2D, config: WheelConfig): void {
  if (!config.wheel.shadowEnabled) return
  ctx.shadowColor = 'rgba(0,0,0,0.55)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetX = 4
  ctx.shadowOffsetY = 4
}

function clearShadow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
}

// ── Glow ──────────────────────────────────────────────────────────────────────

function applyGlow(ctx: CanvasRenderingContext2D, config: WheelConfig): void {
  if (!config.wheel.glowEnabled) return
  ctx.shadowColor = config.wheel.glowColor
  ctx.shadowBlur = config.wheel.glowIntensity
}

function clearGlow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
}

// ── Pointer ───────────────────────────────────────────────────────────────────

function drawPointer(
  ctx: CanvasRenderingContext2D,
  config: WheelConfig,
  cx: number, cy: number, radius: number
): void {
  const { preset, position, scale, colorTint, customImageDataUrl } = config.pointer
  const size = 32 * scale
  const gap = 6

  const origin = getPointerOrigin(position, radius, gap)
  const rotation = getPointerRotation(position)

  ctx.save()
  ctx.translate(cx + origin.x, cy + origin.y)
  ctx.rotate(rotation)

  if (preset === 'custom') {
    if (customImageDataUrl && _customImageCache.has(customImageDataUrl)) {
      const img = _customImageCache.get(customImageDataUrl)!
      const half = size * 0.6
      if (config.pointer.customRotation) {
        ctx.rotate(config.pointer.customRotation * Math.PI / 180)
      }
      ctx.drawImage(img, -half, -half, half * 2, half * 2)
    }
  } else {
    const drawFn = POINTER_PRESETS[preset]
    drawFn(ctx, size, colorTint ?? '#ffffff')
  }

  ctx.restore()
}

// ── Custom image cache ────────────────────────────────────────────────────────

const _customImageCache = new Map<string, HTMLImageElement>()

/** Pre-load a custom pointer image so it renders without async wait. */
export function preloadCustomPointer(dataUrl: string): void {
  if (_customImageCache.has(dataUrl)) return
  const img = new Image()
  img.onload = () => _customImageCache.set(dataUrl, img)
  img.src = dataUrl
}

// ── Frame overlay ─────────────────────────────────────────────────────────────

const _frameImageCache = new Map<string, HTMLImageElement>()

/** Pre-load a frame overlay image so it renders without async wait. */
export function preloadFrameOverlay(dataUrl: string): void {
  if (_frameImageCache.has(dataUrl)) return
  const img = new Image()
  img.onload = () => _frameImageCache.set(dataUrl, img)
  img.src = dataUrl
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  config: WheelConfig,
  width: number,
  height: number
): void {
  if (!config.wheel.frameEnabled || !config.wheel.frameImageDataUrl) return
  const img = _frameImageCache.get(config.wheel.frameImageDataUrl)
  if (!img) return
  ctx.drawImage(img, 0, 0, width, height)
}

// ── Empty state ───────────────────────────────────────────────────────────────

function drawEmptyState(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, radius: number,
  config: WheelConfig
): void {
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, TWO_PI)
  ctx.strokeStyle = config.wheel.borderColor
  ctx.lineWidth = config.wheel.borderWidth || 3
  ctx.setLineDash([12, 8])
  ctx.stroke()
  ctx.setLineDash([])

  ctx.font = `16px ${config.wheel.globalFont}`
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Add segments to get started', cx, cy)
}
