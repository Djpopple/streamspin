// Spin physics — animation state, easing, winner selection.
// No DOM or Canvas dependency. Pure maths.

import type { SpinPhysics, Segment, PointerPosition } from '../types/config.js'

export interface SegmentLayout {
  index: number     // index in original segments array
  start: number     // start angle in radians (wheel-local, 0 = 3 o'clock)
  span: number      // angular width of this segment
  mid: number       // midpoint angle (start + span/2)
}

export interface SpinAnimation {
  startAngle: number
  targetAngle: number
  startTime: number
  duration: number
  easing: SpinPhysics['easing']
  bounce: boolean
  bounceIntensity: number
  winnerIndex: number   // index into the ENABLED segments (original array index)
}

// ── Layout ───────────────────────────────────────────────────────────────────

/** Compute each enabled segment's start angle and angular span from weights. */
export function computeSegmentLayout(segments: Segment[]): SegmentLayout[] {
  const enabled = segments.filter(s => s.enabled)
  if (enabled.length === 0) return []

  const totalWeight = enabled.reduce((sum, s) => sum + s.weight, 0)
  const layouts: SegmentLayout[] = []
  let cursor = 0

  for (const seg of enabled) {
    const span = (seg.weight / totalWeight) * (Math.PI * 2)
    layouts.push({
      index: segments.indexOf(seg),
      start: cursor,
      span,
      mid: cursor + span / 2,
    })
    cursor += span
  }

  return layouts
}

// ── Winner detection ─────────────────────────────────────────────────────────

/** Canvas angle (radians) of the pointer's fixed position on screen. */
export function pointerCanvasAngle(position: PointerPosition): number {
  switch (position) {
    case 'top':    return -Math.PI / 2  // 270°
    case 'right':  return 0
    case 'bottom': return Math.PI / 2
    case 'left':   return Math.PI
  }
}

/**
 * Given a final wheel rotation and pointer position, return the SegmentLayout
 * that is sitting under the pointer.
 *
 * The wheel rotates by `rotation` radians. Segment 0's start is at `rotation`
 * in canvas space. The pointer is at a fixed `pointerAngle` in canvas space.
 *
 * Segment under pointer: the one whose wheel-local angle range contains
 * `(pointerAngle - rotation) mod 2π`.
 */
export function getWinnerLayout(
  layout: SegmentLayout[],
  rotation: number,
  pointerAngle: number
): SegmentLayout {
  if (layout.length === 0) throw new Error('No segments')

  const TWO_PI = Math.PI * 2
  // Angle in wheel-local frame
  let local = ((pointerAngle - rotation) % TWO_PI + TWO_PI) % TWO_PI

  for (const seg of layout) {
    const end = seg.start + seg.span
    if (local >= seg.start && local < end) return seg
  }
  // Fallback — floating point edge case
  return layout[layout.length - 1]
}

// ── Spin creation ─────────────────────────────────────────────────────────────

function pickWinnerLayout(layout: SegmentLayout[], segments: Segment[]): SegmentLayout {
  const totalWeight = layout.reduce((sum, l) => sum + segments[l.index].weight, 0)
  let rand = Math.random() * totalWeight
  for (const l of layout) {
    rand -= segments[l.index].weight
    if (rand <= 0) return l
  }
  return layout[layout.length - 1]
}

/**
 * Create a spin animation that will land the chosen winner under the pointer.
 *
 * Strategy:
 *  1. Pick a weighted-random winner segment.
 *  2. Calculate the angle offset needed to put the winner's midpoint under the pointer.
 *  3. Add N full rotations (random between min/max) so it looks like a real spin.
 *  4. Randomise duration within [durationMin, durationMax].
 */
export function createSpinAnimation(
  config: SpinPhysics,
  segments: Segment[],
  layout: SegmentLayout[],
  currentAngle: number,
  pointerAngle: number
): SpinAnimation {
  const TWO_PI = Math.PI * 2
  const winner = pickWinnerLayout(layout, segments)

  // The winner's midpoint should end up at `pointerAngle` in canvas space.
  // Canvas space angle of winner mid = currentAngle + winner.mid (+ full rotations).
  // We want: finalAngle + winner.mid ≡ pointerAngle (mod 2π)
  // → finalAngle = pointerAngle - winner.mid

  // Base target (no extra rotations, may be behind currentAngle)
  const baseTarget = pointerAngle - winner.mid

  // Normalise so the target is always ahead of currentAngle
  const diff = ((baseTarget - currentAngle) % TWO_PI + TWO_PI) % TWO_PI

  // Add random full rotations on top
  const extraRotations =
    config.rotationsMin +
    Math.random() * (config.rotationsMax - config.rotationsMin)

  const targetAngle = currentAngle + diff + Math.round(extraRotations) * TWO_PI

  const duration =
    config.durationMin +
    Math.random() * (config.durationMax - config.durationMin)

  return {
    startAngle: currentAngle,
    targetAngle,
    startTime: performance.now(),
    duration,
    easing: config.easing,
    bounce: config.bounce,
    bounceIntensity: config.bounceIntensity,
    winnerIndex: winner.index,
  }
}

// ── Easing ────────────────────────────────────────────────────────────────────

function applyEasing(t: number, fn: SpinPhysics['easing']): number {
  switch (fn) {
    case 'ease-out-cubic':
      return 1 - Math.pow(1 - t, 3)
    case 'ease-out-quint':
      return 1 - Math.pow(1 - t, 5)
    case 'ease-out-expo':
      return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
  }
}

function applyBounce(t: number, intensity: number): number {
  // Small overshoot then settle — applied after the base easing
  if (t < 0.85) return t
  const overshootT = (t - 0.85) / 0.15  // 0→1 in the last 15% of time
  const bounce = Math.sin(overshootT * Math.PI) * intensity * 0.04
  return t + bounce
}

// ── Tick ──────────────────────────────────────────────────────────────────────

export interface TickResult {
  angle: number
  progress: number  // 0.0 – 1.0
  complete: boolean
}

/** Advance the animation to `now` (ms). Returns the current angle and completion state. */
export function tickAnimation(anim: SpinAnimation, now: number): TickResult {
  const elapsed = now - anim.startTime
  const rawProgress = Math.min(elapsed / anim.duration, 1)

  let eased = applyEasing(rawProgress, anim.easing)
  if (anim.bounce && rawProgress > 0) {
    eased = applyBounce(eased, anim.bounceIntensity)
  }

  const angle =
    anim.startAngle + (anim.targetAngle - anim.startAngle) * eased

  return {
    angle,
    progress: rawProgress,
    complete: rawProgress >= 1,
  }
}
