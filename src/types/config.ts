// Master config type — single source of truth for all wheel and platform settings.
// Both the server (reads/writes config.json) and the React app (editor UI)
// import from here. Keep it in sync with config.json.example.

export type SegmentImageMode = 'none' | 'all' | 'alternating' | 'manual' | 'reveal'
export type AmbientEffect = 'none' | 'silver-stars' | 'gold-sparkles' | 'sakura' | 'pink-hearts' | 'snowflakes' | 'confetti' | 'fireflies'

export interface Segment {
  id: string
  label: string
  color: string
  gradientColor?: string  // if set, segment draws a radial gradient from this → color
  textColor: string
  weight: number          // relative weight for probability (default 1)
  enabled: boolean
  fontOverride?: string
  labelRadiusOffset?: number  // fraction of radius to shift label in/out (-0.4 … +0.4)
  showImage?: boolean         // whether this segment reveals the segment image
  soundDataUrl?: string       // per-segment win sound (overrides global win sound)
  soundVolume?: number        // 0.0 – 1.0, defaults to global win volume
}

export type PointerPreset =
  | 'arrow'
  | 'pin'
  | 'triangle'
  | 'gem'
  | 'hand'
  | 'custom'

export type PointerPosition = 'top' | 'right' | 'bottom' | 'left'

export interface PointerConfig {
  preset: PointerPreset
  customImageDataUrl?: string   // base64 PNG/JPG for custom pointer
  position: PointerPosition
  scale: number                 // 0.5 – 3.0
  colorTint?: string            // for SVG presets only
  customRotation?: number       // extra rotation in degrees for custom image pointers
}

export type EasingFunction = 'ease-out-cubic' | 'ease-out-quint' | 'ease-out-expo'

export interface SpinPhysics {
  durationMin: number           // ms
  durationMax: number           // ms
  rotationsMin: number          // full rotations
  rotationsMax: number          // full rotations
  easing: EasingFunction
  bounce: boolean
  bounceIntensity: number       // 0.0 – 1.0
}

export interface WheelAppearance {
  backgroundColor: string       // 'transparent' or hex
  borderWidth: number           // px
  borderColor: string
  hubSize: number               // radius in px
  hubColor: string
  globalFont: string            // CSS font-family
  globalFontSize: number        // px
  glowEnabled: boolean
  glowColor: string
  glowIntensity: number         // 0 – 40 px blur
  shadowEnabled: boolean
  framePadding: number          // px ring between wheel rim and canvas edge (space for frame art)
  frameEnabled: boolean
  frameImageDataUrl?: string    // base64 PNG frame overlay rendered on top of wheel
  frameScale: number            // scale of the frame PNG drawn on canvas (50–150, default 100 = fill canvas)
  labelBold: boolean
  labelItalic: boolean
  segmentImageMode: SegmentImageMode
  segmentImageDataUrl?: string  // base64 image revealed behind segments
  segmentImageOpacity: number   // 0 – 1
  segmentImageOverlay: number   // 0 – 1 dark veil over image segments for text readability
  ambientEffect: AmbientEffect
  ambientEffectIntensity: number  // 0.2 – 1.0
  ambientEffectScope: 'all' | 'outside'  // 'all' = over wheel, 'outside' = ring only
}

export interface ResultDisplay {
  enabled: boolean
  duration: number              // ms to show the result overlay
  lingerDuration: number        // ms to hold wheel on screen after overlay dismisses
  messageTemplate: string       // supports {winner} placeholder
  backgroundColor: string
  backgroundOpacity: number     // 0.0 – 1.0
  font: string
  fontSize: number
  textColor: string
}

export interface SoundConfig {
  spinStartEnabled: boolean
  spinStartVolume: number       // 0.0 – 1.0
  spinStartDataUrl?: string     // base64 audio, or empty for preset
  winEnabled: boolean
  winVolume: number
  winDataUrl?: string
}

export interface CommandConfig {
  name: string                  // e.g. 'spin'
  trigger: string               // e.g. '!spin'
  enabled: boolean
  cooldownSeconds: number
  modOnly: boolean
  broadcasterOnly: boolean
  response: string              // bot chat response, '' to disable
}

export interface TwitchConfig {
  enabled: boolean
  channel: string
  botUsername: string
  // OAuth tokens are in .env — not stored here
  channelPointRewardId?: string // UUID of the redemption reward
  channelPointsEnabled: boolean
}

export interface KickConfig {
  enabled: boolean
  // Kick is handled via Botrix webhook — no direct connection config needed
  // This config just stores UI state (e.g. which help step the user is on)
  botrixSetupComplete: boolean
}

export interface WebhookConfig {
  enabled: boolean
  // Secret is in .env — this just tracks enabled state
}

export interface WheelConfig {
  version: number               // schema version for future migrations
  wheel: WheelAppearance
  segments: Segment[]
  pointer: PointerConfig
  spin: SpinPhysics
  result: ResultDisplay
  sound: SoundConfig
  commands: CommandConfig[]
  removeWinnerMode: boolean     // remove winning segment after each spin
  integrations: {
    twitch: TwitchConfig
    kick: KickConfig
    webhook: WebhookConfig
  }
}

export const DEFAULT_CONFIG: WheelConfig = {
  version: 1,
  wheel: {
    backgroundColor: 'transparent',
    borderWidth: 4,
    borderColor: '#ffffff',
    hubSize: 24,
    hubColor: '#ffffff',
    globalFont: 'Inter, sans-serif',
    globalFontSize: 18,
    glowEnabled: false,
    glowColor: '#ffffff',
    glowIntensity: 10,
    shadowEnabled: true,
    framePadding: 56,
    frameEnabled: false,
    frameScale: 100,
    labelBold: false,
    labelItalic: false,
    segmentImageMode: 'none',
    segmentImageOpacity: 1,
    segmentImageOverlay: 0.35,
    ambientEffect: 'none',
    ambientEffectIntensity: 0.6,
    ambientEffectScope: 'all',
  },
  segments: [
    { id: '1', label: 'Prize 1', color: '#e94560', textColor: '#ffffff', weight: 1, enabled: true },
    { id: '2', label: 'Prize 2', color: '#0f3460', textColor: '#ffffff', weight: 1, enabled: true },
    { id: '3', label: 'Prize 3', color: '#16213e', textColor: '#ffffff', weight: 1, enabled: true },
    { id: '4', label: 'Prize 4', color: '#533483', textColor: '#ffffff', weight: 1, enabled: true },
    { id: '5', label: 'Prize 5', color: '#e94560', textColor: '#ffffff', weight: 1, enabled: true },
    { id: '6', label: 'Prize 6', color: '#0f3460', textColor: '#ffffff', weight: 1, enabled: true },
  ],
  pointer: {
    preset: 'arrow',
    position: 'top',
    scale: 1.0,
  },
  spin: {
    durationMin: 4000,
    durationMax: 8000,
    rotationsMin: 5,
    rotationsMax: 10,
    easing: 'ease-out-cubic',
    bounce: false,
    bounceIntensity: 0.3,
  },
  result: {
    enabled: true,
    duration: 4000,
    lingerDuration: 0,
    messageTemplate: '🎉 {winner} 🎉',
    backgroundColor: '#000000',
    backgroundOpacity: 0.75,
    font: 'Inter, sans-serif',
    fontSize: 48,
    textColor: '#ffffff',
  },
  sound: {
    spinStartEnabled: false,
    spinStartVolume: 0.8,
    winEnabled: false,
    winVolume: 0.8,
  },
  commands: [
    {
      name: 'spin',
      trigger: '!spin',
      enabled: true,
      cooldownSeconds: 30,
      modOnly: false,
      broadcasterOnly: false,
      response: 'The wheel is spinning! 🎡',
    },
    {
      name: 'addslice',
      trigger: '!addslice',
      enabled: true,
      cooldownSeconds: 0,
      modOnly: true,
      broadcasterOnly: false,
      response: '',
    },
    {
      name: 'removeslice',
      trigger: '!removeslice',
      enabled: true,
      cooldownSeconds: 0,
      modOnly: true,
      broadcasterOnly: false,
      response: '',
    },
  ],
  removeWinnerMode: false,
  integrations: {
    twitch: {
      enabled: false,
      channel: '',
      botUsername: '',
      channelPointsEnabled: false,
    },
    kick: {
      enabled: false,
      botrixSetupComplete: false,
    },
    webhook: {
      enabled: true,
    },
  },
}
