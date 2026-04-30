// Ambient particle effects — drawn on top of the wheel, behind the frame overlay.
// Stateless from the caller's perspective: module-level particle arrays are fine
// because the editor and overlay run in separate browser contexts.

import type { AmbientEffect } from '../types/config.js'

interface Particle {
  x: number
  y: number
  angle: number       // radians — direction of travel or polar angle from centre
  radius: number      // distance from wheel centre (used by silver-stars)
  vx: number
  vy: number
  speed: number       // px/s
  size: number        // base display size in px
  opacity: number     // base opacity (further modulated per effect)
  phase: number       // oscillation phase offset (0–2π)
  rotation: number    // current draw rotation (radians)
  rotSpeed: number    // radians/s
}

let _particles: Particle[] = []
let _currentEffect: AmbientEffect = 'none'
let _lastTs = 0

// ── Helpers ───────────────────────────────────────────────────────────────────

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a)
}

// ── Particle factories ────────────────────────────────────────────────────────

function makeStar(w: number, h: number, scattered: boolean): Particle {
  const cx = w / 2
  const cy = h / 2
  const r = Math.min(w, h) / 2
  const angle = rand(0, Math.PI * 2)
  const radius = scattered ? rand(r * 0.05, r * 0.82) : rand(r * 0.04, r * 0.18)
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
    angle, radius, vx: 0, vy: 0,
    speed: rand(10, 26),
    size: rand(5, 13),
    opacity: rand(0.55, 1.0),
    phase: rand(0, Math.PI * 2),
    rotation: rand(0, Math.PI * 2),
    rotSpeed: rand(-0.4, 0.4),
  }
}

function makeSparkle(w: number, h: number): Particle {
  return {
    x: rand(w * 0.06, w * 0.94),
    y: rand(h * 0.06, h * 0.94),
    angle: 0, radius: 0, vx: 0, vy: 0, speed: 0,
    size: rand(3, 8),
    opacity: 1,
    phase: rand(0, Math.PI * 2),
    rotation: rand(0, Math.PI / 4),
    rotSpeed: 0,
  }
}

function makePetal(w: number, h: number, scattered: boolean): Particle {
  return {
    x: rand(-20, w + 20),
    y: scattered ? rand(-30, h) : rand(-50, -10),
    angle: rand(-0.35, 0.35),
    radius: 0,
    vx: rand(-12, 12),
    vy: rand(32, 72),
    speed: 0,
    size: rand(6, 14),
    opacity: rand(0.55, 0.92),
    phase: rand(0, Math.PI * 2),
    rotation: rand(0, Math.PI * 2),
    rotSpeed: rand(-1.6, 1.6),
  }
}

function makeParticle(effect: AmbientEffect, w: number, h: number, scattered = false): Particle {
  if (effect === 'silver-stars') return makeStar(w, h, scattered)
  if (effect === 'gold-sparkles') return makeSparkle(w, h)
  return makePetal(w, h, scattered)
}

function particleCount(effect: AmbientEffect, intensity: number): number {
  const base = effect === 'silver-stars' ? 10
             : effect === 'gold-sparkles' ? 22
             : 14 // sakura
  return Math.max(3, Math.round(base * intensity))
}

// ── Shape drawers ─────────────────────────────────────────────────────────────

function drawStar4(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number, rotation: number, alpha: number
): void {
  const outer = size
  const inner = size * 0.38
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    const r = i % 2 === 0 ? outer : inner
    if (i === 0) ctx.moveTo(r * Math.cos(a), r * Math.sin(a))
    else ctx.lineTo(r * Math.cos(a), r * Math.sin(a))
  }
  ctx.closePath()
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.strokeStyle = 'rgba(180,205,230,0.55)'
  ctx.lineWidth = 0.6
  ctx.stroke()
  ctx.restore()
}

function drawSparkle(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number, rotation: number, alpha: number
): void {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.lineCap = 'round'

  ctx.strokeStyle = '#ffd700'
  ctx.lineWidth = Math.max(1, size * 0.38)
  ctx.beginPath()
  ctx.moveTo(-size, 0); ctx.lineTo(size, 0)
  ctx.moveTo(0, -size); ctx.lineTo(0, size)
  ctx.stroke()

  ctx.lineWidth = Math.max(0.5, size * 0.2)
  const d = size * 0.56
  ctx.beginPath()
  ctx.moveTo(-d, -d); ctx.lineTo(d, d)
  ctx.moveTo(d, -d); ctx.lineTo(-d, d)
  ctx.stroke()
  ctx.restore()
}

function drawPetal(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number, rotation: number, alpha: number
): void {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.rotate(rotation)

  ctx.beginPath()
  ctx.ellipse(0, -size * 0.46, size * 0.38, size * 0.62, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#ffb7c5'
  ctx.fill()

  ctx.beginPath()
  ctx.ellipse(0, -size * 0.36, size * 0.15, size * 0.3, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,240,245,0.55)'
  ctx.fill()
  ctx.restore()
}

// ── Main export ───────────────────────────────────────────────────────────────

export function drawAmbientEffects(
  ctx: CanvasRenderingContext2D,
  effect: AmbientEffect,
  intensity: number,
  timestamp: number,
): void {
  if (effect === 'none') {
    _particles = []
    _currentEffect = 'none'
    _lastTs = 0
    return
  }

  const { width, height } = ctx.canvas
  const ts = timestamp > 0 ? timestamp : performance.now()
  const dt = _lastTs > 0 ? Math.min(ts - _lastTs, 50) : 16
  _lastTs = ts
  const t = ts / 1000  // seconds

  // Re-initialise when effect type changes
  if (effect !== _currentEffect) {
    _currentEffect = effect
    const count = particleCount(effect, intensity)
    _particles = Array.from({ length: count }, () => makeParticle(effect, width, height, true))
  }

  const cx = width / 2
  const cy = height / 2
  const r = Math.min(width, height) / 2

  // ── Update ──────────────────────────────────────────────────────────────────

  for (let i = 0; i < _particles.length; i++) {
    const p = _particles[i]

    if (effect === 'silver-stars') {
      p.radius += p.speed * dt / 1000
      p.x = cx + Math.cos(p.angle) * p.radius
      p.y = cy + Math.sin(p.angle) * p.radius
      p.rotation += p.rotSpeed * dt / 1000
      if (p.radius > r * 0.96) {
        _particles[i] = makeStar(width, height, false)
      }
    }

    if (effect === 'sakura') {
      const sway = Math.sin(t * 0.75 + p.phase) * 16
      p.x += (p.vx + sway) * dt / 1000
      p.y += p.vy * dt / 1000
      p.rotation += p.rotSpeed * dt / 1000
      if (p.y > height + 30) {
        _particles[i] = makePetal(width, height, false)
      }
    }
    // gold-sparkles: stationary — just oscillate opacity in the draw step
  }

  // ── Draw ───────────────────────────────────────────────────────────────────

  ctx.save()
  for (const p of _particles) {
    if (effect === 'silver-stars') {
      const distFraction = Math.min(1, p.radius / (r * 0.92))
      const fadeIn  = Math.min(1, distFraction * 6)
      const fadeOut = Math.pow(1 - distFraction, 1.5)
      const alpha   = p.opacity * fadeIn * fadeOut
      if (alpha < 0.02) continue
      const pulsed = p.size * (1 + 0.38 * Math.sin(t * 2.4 + p.phase))
      drawStar4(ctx, p.x, p.y, pulsed, p.rotation, alpha)
    }

    if (effect === 'gold-sparkles') {
      const twinkle = 0.5 + 0.5 * Math.sin(t * (1.8 + (p.phase % 1.5)) + p.phase)
      const alpha   = Math.pow(twinkle, 1.5) * 0.88
      if (alpha < 0.03) continue
      const pulsed = p.size * (0.6 + 0.4 * twinkle)
      drawSparkle(ctx, p.x, p.y, pulsed, p.rotation, alpha)
    }

    if (effect === 'sakura') {
      if (p.opacity < 0.02) continue
      drawPetal(ctx, p.x, p.y, p.size, p.rotation, p.opacity)
    }
  }
  ctx.restore()
}
