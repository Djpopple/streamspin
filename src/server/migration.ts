// Config schema migration — called in configStore.readConfig() before returning.
// Add a case per version bump. Each case upgrades from vN to vN+1.

import type { WheelConfig } from '../types/config.js'
import { DEFAULT_CONFIG } from '../types/config.js'

export function migrateConfig(raw: unknown): WheelConfig {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_CONFIG }

  const config = raw as Record<string, unknown>

  // Ensure top-level keys exist (handles very old or partial configs)
  const base: WheelConfig = {
    ...DEFAULT_CONFIG,
    ...(config as Partial<WheelConfig>),
    // Always deep-merge nested objects so new fields get their defaults
    wheel: { ...DEFAULT_CONFIG.wheel, ...((config as Partial<WheelConfig>).wheel ?? {}) },
    pointer: { ...DEFAULT_CONFIG.pointer, ...((config as Partial<WheelConfig>).pointer ?? {}) },
    spin: { ...DEFAULT_CONFIG.spin, ...((config as Partial<WheelConfig>).spin ?? {}) },
    result: { ...DEFAULT_CONFIG.result, ...((config as Partial<WheelConfig>).result ?? {}) },
    sound: { ...DEFAULT_CONFIG.sound, ...((config as Partial<WheelConfig>).sound ?? {}) },
  }

  // v1 → v1 (current): ensure all segments have required fields
  base.segments = base.segments.map(seg => ({
    id: seg.id ?? crypto.randomUUID(),
    label: seg.label ?? '',
    color: seg.color ?? '#e94560',
    textColor: seg.textColor ?? '#ffffff',
    weight: seg.weight ?? 1,
    enabled: seg.enabled ?? true,
    ...(seg.gradientColor !== undefined ? { gradientColor: seg.gradientColor } : {}),
    ...(seg.fontOverride !== undefined ? { fontOverride: seg.fontOverride } : {}),
    ...(seg.labelRadiusOffset !== undefined ? { labelRadiusOffset: seg.labelRadiusOffset } : {}),
    ...(seg.showImage !== undefined ? { showImage: seg.showImage } : {}),
    ...(seg.soundDataUrl !== undefined ? { soundDataUrl: seg.soundDataUrl } : {}),
    ...(seg.soundVolume !== undefined ? { soundVolume: seg.soundVolume } : {}),
  }))

  // Ensure commands array is present
  if (!Array.isArray(base.commands)) {
    base.commands = DEFAULT_CONFIG.commands
  }

  // Ensure integrations sub-objects exist
  base.integrations = {
    twitch: { ...DEFAULT_CONFIG.integrations.twitch, ...base.integrations?.twitch },
    kick: { ...DEFAULT_CONFIG.integrations.kick, ...base.integrations?.kick },
    webhook: { ...DEFAULT_CONFIG.integrations.webhook, ...base.integrations?.webhook },
  }

  return base
}
