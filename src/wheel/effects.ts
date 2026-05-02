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
  color?: string      // used by pink-hearts and confetti
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

const HEART_COLORS  = ['#FF69B4', '#FF1493', '#FF6B9D', '#FFB6C1', '#E91E63', '#FF85C1']
const CONFETTI_COLORS = ['#E53935', '#FB8C00', '#FBC02D', '#43A047', '#1E88E5', '#8E24AA', '#D81B60', '#00ACC1']

function makeHeart(w: number, h: number, scattered: boolean): Particle {
  return {
    x: rand(w * 0.05, w * 0.95),
    y: scattered ? rand(0, h) : rand(h * 0.8, h + 30),
    angle: 0, radius: 0, vx: rand(-15, 15),
    vy: rand(-50, -28),
    speed: 0,
    size: rand(8, 18),
    opacity: rand(0.6, 0.95),
    phase: rand(0, Math.PI * 2),
    rotation: rand(-0.25, 0.25),
    rotSpeed: rand(-0.3, 0.3),
    color: HEART_COLORS[Math.floor(rand(0, HEART_COLORS.length))],
  }
}

function makeSnowflake(w: number, h: number, scattered: boolean): Particle {
  return {
    x: rand(-20, w + 20),
    y: scattered ? rand(-30, h) : rand(-40, -10),
    angle: 0, radius: 0, vx: rand(-10, 10),
    vy: rand(22, 55),
    speed: 0,
    size: rand(6, 14),
    opacity: rand(0.55, 0.9),
    phase: rand(0, Math.PI * 2),
    rotation: rand(0, Math.PI / 3),
    rotSpeed: rand(-0.25, 0.25),
  }
}

function makeConfetti(w: number, h: number, scattered: boolean): Particle {
  return {
    x: rand(-20, w + 20),
    y: scattered ? rand(-30, h) : rand(-40, -10),
    angle: 0, radius: 0, vx: rand(-22, 22),
    vy: rand(65, 130),
    speed: 0,
    size: rand(5, 10),
    opacity: rand(0.75, 1.0),
    phase: rand(0, Math.PI * 2),
    rotation: rand(0, Math.PI * 2),
    rotSpeed: rand(-3.5, 3.5),
    color: CONFETTI_COLORS[Math.floor(rand(0, CONFETTI_COLORS.length))],
  }
}

function makeFirefly(w: number, h: number): Particle {
  return {
    x: rand(w * 0.05, w * 0.95),
    y: rand(h * 0.05, h * 0.95),
    angle: rand(0, Math.PI * 2),
    radius: 0, vx: 0, vy: 0,
    speed: rand(15, 35),
    size: rand(5, 11),
    opacity: rand(0.7, 1.0),
    phase: rand(0, Math.PI * 2),
    rotation: 0,
    rotSpeed: rand(-1.2, 1.2),
  }
}

function makeParticle(effect: AmbientEffect, w: number, h: number, scattered = false): Particle {
  if (effect === 'silver-stars') return makeStar(w, h, scattered)
  if (effect === 'gold-sparkles') return makeSparkle(w, h)
  if (effect === 'pink-hearts')   return makeHeart(w, h, scattered)
  if (effect === 'snowflakes')    return makeSnowflake(w, h, scattered)
  if (effect === 'confetti')      return makeConfetti(w, h, scattered)
  if (effect === 'fireflies')     return makeFirefly(w, h)
  return makePetal(w, h, scattered)
}

function particleCount(effect: AmbientEffect, intensity: number): number {
  const base = effect === 'silver-stars'  ? 10
             : effect === 'gold-sparkles' ? 22
             : effect === 'pink-hearts'   ? 12
             : effect === 'snowflakes'    ? 18
             : effect === 'confetti'      ? 28
             : effect === 'fireflies'     ? 12
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

function drawHeart(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number, rotation: number, alpha: number, color: string
): void {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.rotate(rotation)
  // Two top arcs + two bezier curves to the bottom point
  const r = size * 0.55
  ctx.beginPath()
  ctx.arc(-r * 0.5, 0, r * 0.5, Math.PI, 0, false)
  ctx.arc( r * 0.5, 0, r * 0.5, Math.PI, 0, false)
  ctx.bezierCurveTo( r, 0,  r * 0.5, r * 0.8, 0, r * 1.1)
  ctx.bezierCurveTo(-r * 0.5, r * 0.8, -r, 0, -r, 0)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  // Subtle highlight
  ctx.globalAlpha = alpha * 0.3
  ctx.beginPath()
  ctx.arc(-r * 0.45, -r * 0.15, r * 0.2, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.restore()
}

function drawSnowflake(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number, rotation: number, alpha: number
): void {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.strokeStyle = '#d0eeff'
  ctx.lineWidth = Math.max(0.7, size * 0.12)
  ctx.lineCap = 'round'
  const bLen = size * 0.38
  // 6 arms, each with two 60° branches
  for (let i = 0; i < 6; i++) {
    ctx.save()
    ctx.rotate((i * Math.PI) / 3)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, -size)
    ctx.moveTo(0, -size * 0.45)
    ctx.lineTo(-bLen * 0.866, -size * 0.45 - bLen * 0.5)
    ctx.moveTo(0, -size * 0.45)
    ctx.lineTo( bLen * 0.866, -size * 0.45 - bLen * 0.5)
    ctx.stroke()
    ctx.restore()
  }
  ctx.restore()
}

function drawConfettiPiece(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number, rotation: number, alpha: number, color: string
): void {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.fillStyle = color
  ctx.fillRect(-size * 0.5, -size * 0.22, size, size * 0.44)
  ctx.restore()
}

function drawFirefly(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number, alpha: number
): void {
  ctx.save()
  ctx.globalAlpha = alpha
  const grad = ctx.createRadialGradient(x, y, 0, x, y, size)
  grad.addColorStop(0,    '#eeff88')
  grad.addColorStop(0.35, '#aadd44')
  grad.addColorStop(1,    'rgba(60,180,0,0)')
  ctx.beginPath()
  ctx.arc(x, y, size, 0, Math.PI * 2)
  ctx.fillStyle = grad
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
      // Travel to 1.3× canvas half so stars reach well into the frame ring
      if (p.radius > r * 1.3) {
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

    if (effect === 'pink-hearts') {
      const sway = Math.sin(t * 1.1 + p.phase) * 18
      p.x += (p.vx + sway) * dt / 1000
      p.y += p.vy * dt / 1000
      p.rotation += p.rotSpeed * dt / 1000
      if (p.y < -30) {
        _particles[i] = makeHeart(width, height, false)
      }
    }

    if (effect === 'snowflakes') {
      const sway = Math.sin(t * 0.85 + p.phase) * 12
      p.x += (p.vx + sway) * dt / 1000
      p.y += p.vy * dt / 1000
      p.rotation += p.rotSpeed * dt / 1000
      if (p.y > height + 30) {
        _particles[i] = makeSnowflake(width, height, false)
      }
    }

    if (effect === 'confetti') {
      const sway = Math.sin(t * 1.4 + p.phase) * 14
      p.x += (p.vx + sway) * dt / 1000
      p.y += p.vy * dt / 1000
      p.rotation += p.rotSpeed * dt / 1000
      if (p.y > height + 30) {
        _particles[i] = makeConfetti(width, height, false)
      }
    }

    if (effect === 'fireflies') {
      p.angle += p.rotSpeed * dt / 1000
      p.x += Math.cos(p.angle) * p.speed * dt / 1000
      p.y += Math.sin(p.angle) * p.speed * dt / 1000
      // Wrap at canvas edges
      if (p.x < -15) p.x = width + 15
      else if (p.x > width + 15) p.x = -15
      if (p.y < -15) p.y = height + 15
      else if (p.y > height + 15) p.y = -15
    }

    // gold-sparkles: stationary — just oscillate opacity in the draw step
  }

  // ── Draw ───────────────────────────────────────────────────────────────────

  ctx.save()
  for (const p of _particles) {
    if (effect === 'silver-stars') {
      // distFraction relative to full travel range (1.3× canvas half)
      const distFraction = p.radius / (r * 1.3)
      const fadeIn  = Math.min(1, distFraction * 8)
      // Stay bright through the frame ring; only fade in the final 20% of travel
      const fadeOut = distFraction < 0.8 ? 1 : Math.pow((1 - distFraction) / 0.2, 1.5)
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

    if (effect === 'pink-hearts') {
      drawHeart(ctx, p.x, p.y, p.size, p.rotation, p.opacity, p.color ?? '#FF69B4')
    }

    if (effect === 'snowflakes') {
      drawSnowflake(ctx, p.x, p.y, p.size, p.rotation, p.opacity)
    }

    if (effect === 'confetti') {
      drawConfettiPiece(ctx, p.x, p.y, p.size, p.rotation, p.opacity, p.color ?? '#E53935')
    }

    if (effect === 'fireflies') {
      const glow = 0.5 + 0.5 * Math.sin(t * (2.2 + p.phase * 0.3) + p.phase)
      const alpha = Math.pow(glow, 2) * 0.9 * p.opacity
      if (alpha < 0.03) continue
      drawFirefly(ctx, p.x, p.y, p.size * (0.65 + 0.35 * glow), alpha)
    }
  }
  ctx.restore()
}
