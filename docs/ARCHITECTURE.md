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
│   │   ├── App.tsx         Root — config state, debounced save, socket
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
│   │       │   └── ResultPanel.tsx
│   │       └── ui/
│   │           ├── Panel.tsx       Collapsible section wrapper
│   │           ├── Slider.tsx
│   │           ├── ColorInput.tsx
│   │           ├── Toggle.tsx
│   │           ├── NumberInput.tsx
│   │           └── Select.tsx
│   ├── wheel/              Pure renderer — NO React, NO DOM except Canvas
│   │   ├── renderer.ts     renderFrame(ctx, config, layout, rotation)
│   │   ├── physics.ts      computeSegmentLayout, createSpinAnimation, tickAnimation
│   │   └── pointers.ts     Canvas-drawn pointer presets + rotation helpers
│   ├── overlay/
│   │   └── main.ts         OBS overlay entry — Socket.io + rAF render loop
│   ├── server/
│   │   ├── index.ts        Express app + Socket.io server
│   │   ├── configStore.ts  Atomic read/write of config.json
│   │   ├── presetsStore.ts Atomic read/write of presets.json
│   │   ├── socketBridge.ts Spin queue + event routing
│   │   └── routes/
│   │       ├── config.ts   GET/POST /api/config
│   │       ├── trigger.ts  POST /api/trigger (webhook / Stream Deck)
│   │       ├── presets.ts  CRUD /api/presets + /api/presets/:id/load
│   │       └── auth.ts     /auth/twitch OAuth (Phase 3)
│   ├── integrations/       Platform chat connectors (Phase 3)
│   │   └── twitch/
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
- Socket.io — test spin events, future integration status

### Overlay (`/wheel`)
A minimal Vite-compiled page — no React, no framework. Contains one `<canvas>` and one result `<div>`. Loaded into OBS as a Browser Source and left running.

- On connect: receives current config via `config-update`
- Runs a continuous `requestAnimationFrame` loop (no idle state, always 60fps)
- Responds to `spin` events: starts animation, plays audio, shows result overlay, emits `spin-complete`
- Responds to `config-update`: replaces config and recomputes segment layout

---

## The Wheel Renderer

`src/wheel/renderer.ts` exports a single pure function:

```typescript
function renderFrame(
  ctx: CanvasRenderingContext2D,
  config: WheelConfig,
  layout: SegmentLayout[],    // pre-computed from computeSegmentLayout()
  rotation: number            // current wheel rotation in radians
): void
```

**Zero side effects. Zero internal state.** Called every animation frame at 60fps.

`layout` is computed once per segment change via `computeSegmentLayout(segments)`, not on every frame.

### Rendering order (painter's algorithm)
1. Clear canvas
2. Glow shadow (`ctx.shadowBlur`) — if enabled
3. Segment arcs (fill + inner separator stroke)
4. Clear glow
5. Outer wheel border
6. Hub (circle + sheen radial gradient)
7. Segment labels (radial text, rotated to face outward)
8. Pointer (positioned at wheel edge, rotated inward)

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
| `config-update` | `{ config: WheelConfig }` | Overlay only (on connect + after preset load) |
| `chat-message` | `{ platform, username, message, timestamp }` | Editor only (Phase 3) |
| `integration-status` | `{ platform, status, message? }` | Editor only (Phase 3) |
| `spin-queue` | `{ queueLength: number }` | All |

### Client → Server

| Event | Payload | Sender |
|---|---|---|
| `spin-complete` | `{ winner: Segment, triggeredBy: string }` | Overlay or Editor preview |
| `editor-spin` | — | Editor (Test Spin button) |

---

## Spin Queue

`src/server/socketBridge.ts` manages a FIFO queue of pending spins. When a spin arrives while one is in progress, it is queued. The overlay emits `spin-complete` when animation finishes, which pops the next item.

```
Trigger arrives → enqueueSpin()
                       ↓
           spinning?  push to queue
           idle?      emit 'spin' immediately, set spinning=true
                       ↓
    overlay emits 'spin-complete'
                       ↓
           spinning=false → processQueue()
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

The editor never listens to incoming `config-update` events after the initial load — it manages its own React state. This prevents feedback loops.

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
