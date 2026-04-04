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
  }))

  // Back-fill wheel fields added after initial release
  const wheelDefaults: Partial<typeof base.wheel> = {}
  if (typeof base.wheel.framePadding !== 'number') wheelDefaults.framePadding = 56
  if (typeof base.wheel.frameEnabled !== 'boolean') wheelDefaults.frameEnabled = false
  if (typeof base.wheel.labelBold !== 'boolean') wheelDefaults.labelBold = false
  if (typeof base.wheel.labelItalic !== 'boolean') wheelDefaults.labelItalic = false
  if (Object.keys(wheelDefaults).length > 0) {
    base.wheel = { ...base.wheel, ...wheelDefaults }
  }

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
