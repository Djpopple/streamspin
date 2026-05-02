# Architecture — StreamSpin

## Overview

StreamSpin is a **local-first** tool. It runs entirely on the streamer's machine — no cloud, no accounts, no subscription. The architecture has three layers:

```
┌─────────────────────────────────────────────────────┐
│  OBS / Streamlabs                                   │
│  ┌──────────────────────────────────────────────┐   │
│  │  Browser Source → http://localhost:3000/wheel │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                         ▲ WebSocket (Socket.io)
                         │
┌─────────────────────────────────────────────────────┐
│  LOCAL SERVER  (Node.js / Express — port 3000)      │
│                                                     │
│  ┌─────────────┐  ┌────────────┐  ┌─────────────┐  │
│  │ Twitch Chat │  │   Botrix   │  │  REST API   │  │
│  │  (tmi.js)   │  │  webhook   │  │ /api/*      │  │
│  └──────┬──────┘  └─────┬──────┘  └──────┬──────┘  │
│         └───────────────┴────────────────┘          │
│                         │                           │
│              ┌──────────▼──────────┐                │
│              │   Socket Bridge     │                │
│              │  + Spin Queue       │                │
│              └──────────┬──────────┘                │
│                         │ Socket.io                  │
└─────────────────────────┼───────────────────────────┘
                          │
          ┌───────────────┴────────────────┐
          ▼                                ▼
┌──────────────────────┐      ┌────────────────────────┐
│  EDITOR UI           │      │  WHEEL OVERLAY          │
│  localhost:5173 (dev)│      │  localhost:3000/wheel   │
│  localhost:3000 (prod│      │  (always this URL)      │
│  React 18 + Vite     │      │  Vanilla TS + Canvas    │
│  No wheel dep        │      │  No React               │
└──────────────────────┘      └────────────────────────┘
```

---

## Why Local-First?

1. **No cloud costs** — free tool, no hosting bill
2. **Low latency** — wheel spins within milliseconds of a chat command
3. **Privacy** — OAuth tokens never leave the machine
4. **Reliability** — works fully offline (manual trigger mode)
5. **Simplicity** — no backend deployment, no auth server

---

## Directory Structure (as-built)

```
streamspin/
├── index.html              Vite entry: editor app
├── overlay.html            Vite entry: OBS overlay (no React)
├── src/
│   ├── app/                React editor UI
│   │   ├── App.tsx         Root — config state, undo/redo, debounced save, socket
│   │   ├── index.css       Tailwind base + component classes
│   │   ├── main.tsx        React entry point
│   │   ├── lib/
│   │   │   ├── configApi.ts   fetch/save/import/export config via REST
│   │   │   └── constants.ts   SEGMENT_COLORS, FONTS, EASING_OPTIONS, generateId
│   │   └── components/
│   │       ├── WheelPreview.tsx    Live canvas preview (same renderer as overlay)
│   │       ├── PresetManager.tsx   Named wheel preset save/load/delete UI
│   │       ├── panels/
│   │       │   ├── SegmentsPanel.tsx
│   │       │   ├── AppearancePanel.tsx
│   │       │   ├── PointerPanel.tsx
│   │       │   ├── SpinSettingsPanel.tsx
│   │       │   ├── ResultPanel.tsx
│   │       │   ├── IntegrationsPanel.tsx
│   │       │   └── HistoryPanel.tsx
│   │       └── ui/
│   │           ├── Panel.tsx       Collapsible section wrapper
│   │           ├── Slider.tsx
│   │           ├── ColorInput.tsx
│   │           ├── Toggle.tsx
│   │           ├── NumberInput.tsx
│   │           ├── Select.tsx
│   │           └── FontSelect.tsx
│   ├── wheel/              Pure renderer — NO React, NO DOM except Canvas
│   │   ├── renderer.ts     renderFrame(ctx, config, layout, rotation, timestamp)
│   │   ├── physics.ts      computeSegmentLayout, createSpinAnimation, tickAnimation
│   │   ├── pointers.ts     Canvas-drawn pointer presets + rotation helpers
│   │   └── effects.ts      drawAmbientEffects — 8 particle types, frame-rate-independent
│   ├── overlay/
│   │   └── main.ts         OBS overlay entry — Socket.io + rAF render loop
│   ├── server/
│   │   ├── index.ts        Express app + Socket.io server
│   │   ├── configStore.ts  Atomic read/write of config.json
│   │   ├── presetsStore.ts Atomic read/write of presets.json
│   │   ├── historyStore.ts In-memory win history + history.json persistence
│   │   ├── migration.ts    migrateConfig() — deep-merges against DEFAULT_CONFIG
│   │   ├── socketBridge.ts Spin queue + event routing + win recording
│   │   ├── tokenStore.ts   Twitch OAuth token storage + auto-refresh
│   │   ├── integrationManager.ts  Twitch chat + EventSub lifecycle
│   │   └── routes/
│   │       ├── config.ts   GET/POST /api/config
│   │       ├── trigger.ts  POST /api/trigger (webhook / Stream Deck)
│   │       ├── presets.ts  CRUD /api/presets + /api/presets/:id/load
│   │       ├── auth.ts     /auth/twitch OAuth
│   │       └── history.ts  GET/DELETE /api/history, DELETE/PATCH /api/history/:id
│   ├── integrations/
│   │   └── twitch/
│   │       ├── chat.ts     tmi.js — !spin, !addslice, !removeslice, per-user cooldowns
│   │       └── eventsub.ts Native WebSocket EventSub — Channel Points, auto-fulfil
│   └── types/              Shared types — imported by app, server, overlay
│       ├── config.ts       WheelConfig master schema + DEFAULT_CONFIG
│       └── events.ts       Typed Socket.io event maps
├── public/assets/          Static assets (Vite copies as-is)
├── dist/                   Production build (gitignored)
│   ├── index.html          Editor app
│   └── overlay.html        OBS overlay
└── dist-server/            Compiled server (gitignored)
```

---

## The Two Pages

### Editor (`/`)
A React 18 app compiled by Vite. Loaded by the streamer during their session. Config state lives entirely in `App.tsx` — the editor does **not** react to `config-update` socket events after initial load, avoiding feedback loops with the server.

Communication with the server:
- `GET /api/config` — initial config load on mount
- `POST /api/config` — 400ms debounced auto-save on every change
- `GET/POST/PUT/DELETE /api/presets` — preset management
- `GET/POST/PATCH/DELETE /api/history` — win history
- Socket.io — spin events, integration status, live history updates

### Overlay (`/wheel`)
A minimal Vite-compiled page — no React, no framework. Contains one `<canvas>` and one result `<div>`. Loaded into OBS as a Browser Source and left running.

- On connect: receives current config via `config-update`
- Runs a continuous `requestAnimationFrame` loop (no idle state, always 60fps)
- Responds to `spin` events: starts animation, plays audio, shows result overlay, emits `spin-complete` then `spin-done`
- Responds to `config-update`: replaces config and recomputes segment layout

---

## The Wheel Renderer

`src/wheel/renderer.ts` exports a single pure function:

```typescript
function renderFrame(
  ctx: CanvasRenderingContext2D,
  config: WheelConfig,
  layout: SegmentLayout[],    // pre-computed from computeSegmentLayout()
  rotation: number,           // current wheel rotation in radians
  timestamp?: number          // performance.now() — used by ambient effects
): void
```

**Zero side effects. Zero internal state.** Called every animation frame at 60fps. Wrapped in a top-level `ctx.save()`/`ctx.restore()` guard. Both call sites wrap in `try/catch` so a renderer error never kills the rAF loop.

`layout` is computed once per segment change via `computeSegmentLayout(segments)`, not on every frame.

### Rendering order (painter's algorithm)
1. `clearRect` — clear canvas
2. Background fill (if not transparent)
3. Drop shadow circle (opaque fill + ctx.shadow*, covered by segments)
4. Glow (`ctx.shadowBlur`) — if enabled
5. Segment arcs (fill + inner separator stroke)
6. Segment image overlay (clipped arc slice per segment)
7. Clear glow
8. Outer wheel border
9. Hub (circle + sheen radial gradient)
10. Segment labels (radial text, rotated to face outward)
11. Pointer (positioned at wheel edge, rotated inward)
12. Ambient effects (all or outside-only via evenodd clip)
13. Frame overlay (artist PNG scaled to canvas)

### Pointer system
All five presets are drawn in `src/wheel/pointers.ts` as canvas drawing functions in **pointing-right (+x) orientation**. `getPointerRotation(position)` returns the `ctx.rotate()` value needed to make any preset face inward from any of the four positions. `getPointerOrigin(position, radius, gap)` returns the (x, y) placement offset.

This means adding a new preset requires only adding one drawing function — no geometry changes elsewhere.

---

## Spin Physics

`src/wheel/physics.ts` — all animation maths, no DOM dependency.

### Winner selection
`createSpinAnimation()` picks a weighted-random winner, then calculates `targetAngle` to land that segment's midpoint precisely under the pointer, plus N full rotations (random within the configured min/max range).

```
targetAngle = currentAngle + ((pointerAngle - winner.mid) mod 2π) + rotations × 2π
```

### Easing
`tickAnimation(anim, now)` returns `{ angle, progress, complete }` each frame.
Three built-in curves: `ease-out-cubic`, `ease-out-quint`, `ease-out-expo`. Bounce applies a small sinusoidal overshoot in the final 15% of the animation.

---

## Ambient Effects System

`src/wheel/effects.ts` — pure Canvas 2D, no assets, no external libraries.

`drawAmbientEffects(ctx, effect, intensity, timestamp)` is called from `renderFrame` after the pointer. It manages a module-level `_particles` array, updating positions using frame-rate-independent `dt` (capped at 50ms to handle tab-switch pauses), then drawing each particle.

**Scope control** in `renderer.ts`: when `ambientEffectScope === 'outside'`, an evenodd clipping path is applied before calling `drawAmbientEffects` — a full-canvas rect with a circular hole at the wheel radius. Particles inside the wheel are clipped away.

| Effect | Movement | Canvas draw |
|---|---|---|
| Silver stars | Radiate outward from centre | 8-point star path |
| Gold sparkles | Stationary twinkle (alpha oscillates) | 4-line cross stroke |
| Sakura | Fall downward, gentle sway | Two `ellipse()` fills |
| Pink hearts | Rise upward, gentle sway | `arc()` + `bezierCurveTo()` |
| Snowflakes | Fall downward, spin | 6-arm stroke loop with branches |
| Confetti | Fall downward, tumble | `fillRect` on rotated context |
| Fireflies | Wander and wrap at edges | `createRadialGradient` + `arc` |

---

## Spin Event Split: spin-complete vs spin-done

The overlay emits two events on spin completion:

1. **`spin-complete`** — fired immediately when the wheel stops:
   - Server records the win in `historyStore`
   - If `segmentImageMode === 'reveal'`, server flips `segment.showImage = true`, saves config, broadcasts `config-update` to overlay clients
   - Result overlay shown to viewers
   - Editor preview mirrors the reveal via its `onReveal` callback prop (since the editor ignores `config-update`)

2. **`spin-done`** — fired after `result.duration + result.lingerDuration` milliseconds:
   - Spin queue releases — next queued spin can fire

This split ensures the queue is not released until viewers have seen the result and any reveal.

---

## Undo / Redo System

Managed entirely in `App.tsx`. Two stacks: `undoStack` and `redoStack`, capped at 30 states each.

**Burst-coalescing**: The first config change in an edit burst captures a "before" snapshot in `historyPendingRef`. A 500ms debounce timer commits that snapshot to the undo stack. Subsequent changes within the window reset the timer — dragging a slider produces one undo state, not one per pixel.

**Initialization guard**: `initializedRef` in the history `useEffect` skips the `DEFAULT_CONFIG → fetchedConfig` transition on load so it is never recorded as an undo state.

**Undo/redo operations** set `isUndoRedoRef.current = true` to prevent the history effect from recording the operation itself as a new history entry, and cancel any pending burst timer.

---

## Config & Preset Storage

Two JSON files, both gitignored, both written atomically (write `.tmp` → rename):

### `config.json` — active wheel config
Managed by `configStore.ts`. Written on every `POST /api/config`. When loading a preset, the preset's config is written here and broadcast to overlay clients.

### `presets.json` — named wheel snapshots
```typescript
interface PresetsFile {
  presets: Array<{
    id: string          // UUID
    name: string        // user-defined name
    config: WheelConfig // full snapshot
    savedAt: string     // ISO timestamp
  }>
}
```
Managed by `presetsStore.ts`. The list endpoint (`GET /api/presets`) omits the full config for performance. `POST /api/presets/:id/load` writes to `config.json` and broadcasts `config-update` to overlay clients in one operation.

---

## Config Schema

`src/types/config.ts` is the single source of truth. Key sections:

```typescript
interface WheelConfig {
  version: number
  wheel: WheelAppearance      // border, hub, font, glow, shadow
  segments: Segment[]         // label, color, textColor, weight, enabled
  pointer: PointerConfig      // preset, customImageDataUrl, position, scale, colorTint
  spin: SpinPhysics           // duration range, rotations range, easing, bounce
  result: ResultDisplay       // win overlay — message, colors, font, duration
  sound: SoundConfig          // spin/win audio dataUrls + volumes
  commands: CommandConfig[]   // chat command definitions (Phase 3)
  removeWinnerMode: boolean
  integrations: {
    twitch: TwitchConfig
    kick: KickConfig          // Botrix bridge — no direct connection needed
    webhook: WebhookConfig
  }
}
```

---

## Socket.io Event Contract

Typed in `src/types/events.ts`.

### Server → Client

| Event | Payload | Who receives it |
|---|---|---|
| `spin` | `{ triggeredBy: string }` | Overlay + Editor (preview) |
| `config-update` | `{ config: WheelConfig }` | Overlay only |
| `history-update` | `{ history: WinRecord[] }` | Editor only |
| `chat-message` | `{ platform, username, message, timestamp }` | Editor only |
| `integration-status` | `{ platform, status, message? }` | Editor only |
| `spin-queue` | `{ queueLength: number }` | All |

### Client → Server

| Event | Payload | Sender |
|---|---|---|
| `spin-complete` | `{ winner: Segment, triggeredBy: string }` | Overlay or Editor preview |
| `spin-done` | — | Overlay or Editor preview (after result + linger) |
| `editor-spin` | — | Editor (Test Spin / Space bar) |

---

## Spin Queue

`src/server/socketBridge.ts` manages a FIFO queue of pending spins. When a spin arrives while one is in progress, it is queued. The overlay emits `spin-complete` when animation finishes, which pops the next item.

```
Trigger arrives → enqueueSpin()
                       ↓
           spinning?  push to queue
           idle?      emit 'spin' immediately, set spinning=true
                       ↓
    overlay emits 'spin-complete'  → record win, trigger reveal
                       ↓
    overlay emits 'spin-done'      → spinning=false → processQueue()
```

---

## Config Flow (Editor ↔ Server ↔ Overlay)

```
User changes setting in panel
    ↓
setConfig(newConfig) in App.tsx
    ↓ (immediate)
WheelPreview re-renders via configRef — live preview
    ↓ (400ms debounce)
POST /api/config
    ↓
configStore.writeConfig() — writes config.json atomically
    ↓
io.sockets.sockets.forEach → emit 'config-update' to overlay clients only
    ↓
OBS overlay re-renders on next frame
```

The editor never listens to incoming `config-update` events after the initial load — it manages its own React state. This prevents feedback loops. The one exception is reveal mode: the editor mirrors reveals via the `onReveal` callback prop on `WheelPreview`, which updates local React state directly.

---

## Vite Build Setup

Two entry points in `vite.config.ts`:

| Entry | Source | Output | Served at |
|---|---|---|---|
| `main` | `index.html` | `dist/index.html` | `/` |
| `overlay` | `overlay.html` | `dist/overlay.html` | `/wheel` |

Both share `src/types/` and `src/wheel/`. Vite tree-shakes independently — the overlay bundle contains no React code.

---

## Dev vs Production Serving

### Development (`npm run dev`)
```
concurrently:
  ├── Vite dev server (port 5173) — editor + overlay HTML, HMR
  └── tsx watch       (port 3000) — Express server + Socket.io

Editor:  http://localhost:5173
Overlay: http://localhost:3000/wheel → Express redirects → Vite:5173/overlay.html
         OBS Browser Source follows the redirect automatically.
/api/* and /socket.io proxied by Vite to localhost:3000
```

### Production (`npm run build && npm start`)
```
vite build       → dist/index.html + dist/overlay.html
tsc server build → dist-server/

Express (port 3000):
  GET /        → dist/index.html
  GET /wheel   → dist/overlay.html
  GET /api/*   → routers
  WS           → Socket.io
```

---

## Authentication

### Twitch (Phase 3)
- OAuth 2.0 Authorization Code flow
- Server-side token exchange at `/auth/twitch/callback`
- Access + refresh tokens stored in `.env`
- Server auto-refreshes before expiry

### Kick
- No OAuth required — Botrix handles Kick authentication externally
- StreamSpin only exposes `POST /api/trigger`

### Webhook / Stream Deck
- Shared secret in `WEBHOOK_SECRET` env var
- If unset, any POST is accepted (dev convenience — set it in production)

---

## Security

- Server binds to `127.0.0.1` — not LAN/internet accessible
- Webhook endpoint validates `WEBHOOK_SECRET` when set
- OAuth tokens never leave the server process
- `config.json`, `presets.json`, and `.env` are all gitignored
- No external data transmission — all processing is local

---

## Performance Targets

| Metric | Target |
|---|---|
| Overlay page load time | < 500ms |
| Chat command → spin latency | < 100ms |
| Canvas render FPS (spin + idle) | 60fps |
| Config save round-trip | < 50ms |
| Preset load → overlay update | < 200ms |
| Server memory footprint | < 100MB |
| Overlay tab memory | < 150MB |

---

## Build & Distribution

### Development
```bash
npm run dev   # Vite (5173) + tsx watch (3000)
```

### Production
```bash
npm run build && npm start
```

### Phase 4: Electron
Server runs as Electron main process. Editor opens as `BrowserWindow`. Overlay is still served via localhost — Electron `BrowserWindow` cannot be used as an OBS Browser Source directly.
