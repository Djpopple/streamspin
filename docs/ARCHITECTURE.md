# Architecture — StreamSpin

## Overview

StreamSpin is a **local-first** tool. It runs entirely on the streamer's machine. There is no cloud component. The architecture has three layers:

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
│              │  (socketBridge.ts)  │                │
│              │  + Spin Queue       │                │
│              └──────────┬──────────┘                │
│                         │ Socket.io                  │
└─────────────────────────┼───────────────────────────┘
                          │
          ┌───────────────┴────────────────┐
          ▼                                ▼
┌──────────────────────┐      ┌────────────────────────┐
│  EDITOR UI           │      │  WHEEL OVERLAY          │
│  http://localhost:   │      │  http://localhost:3000/ │
│  3000/ (prod)        │      │  wheel (always)         │
│  5173/ (dev)         │      │                         │
│  React 18 + Vite     │      │  Vanilla TS + Canvas    │
│  No wheel dep        │      │  No React               │
└──────────────────────┘      └────────────────────────┘
```

---

## Why Local-First?

1. **No cloud costs** — this is a free tool, no hosting bill
2. **Low latency** — wheel spins within milliseconds of a chat command
3. **Privacy** — OAuth tokens never leave the user's machine
4. **Reliability** — works offline (manual trigger mode)
5. **Simplicity** — no auth server, no backend deployment

---

## Directory Structure (as-built)

```
streamspin/
├── index.html              ← Vite entry: editor app
├── overlay.html            ← Vite entry: OBS overlay
├── src/
│   ├── app/                React editor UI
│   │   ├── main.tsx        React entry point
│   │   ├── App.tsx         Root component
│   │   ├── index.css       Tailwind base styles + component classes
│   │   └── components/
│   │       └── WheelPreview.tsx   Live canvas preview (Phase 1)
│   ├── wheel/              Pure renderer — NO React, NO DOM API except Canvas
│   │   ├── renderer.ts     renderFrame(ctx, config, layout, rotation)
│   │   ├── physics.ts      computeSegmentLayout, createSpinAnimation, tickAnimation
│   │   └── pointers.ts     SVG-drawn pointer presets (arrow, pin, triangle, gem, hand)
│   ├── overlay/
│   │   └── main.ts         OBS overlay entry — Socket.io + render loop
│   ├── server/
│   │   ├── index.ts        Express app + Socket.io server
│   │   ├── configStore.ts  Atomic read/write of config.json
│   │   ├── socketBridge.ts Spin queue + event routing
│   │   └── routes/
│   │       ├── config.ts   GET/POST /api/config
│   │       ├── trigger.ts  POST /api/trigger (webhook + Stream Deck)
│   │       └── auth.ts     /auth/twitch OAuth flow (Phase 3)
│   ├── integrations/       Platform chat connectors (Phase 3)
│   │   ├── twitch/
│   │   └── manual/
│   └── types/              Shared types — imported by app, server, overlay
│       ├── config.ts       WheelConfig master schema + DEFAULT_CONFIG
│       └── events.ts       Typed Socket.io event maps
├── public/                 Static assets (Vite copies as-is)
│   └── assets/
│       ├── pointers/       Future: raster pointer exports
│       └── sounds/         Future: spin/win audio files
├── docs/
│   ├── ARCHITECTURE.md     This file
│   └── INTEGRATIONS.md     Platform integration research
├── dist/                   Production build output (gitignored)
│   ├── index.html          Editor app
│   └── overlay.html        OBS overlay
└── dist-server/            Compiled server (gitignored)
```

---

## The Two Pages

### Editor (`/`)
A full React 18 app built by Vite. Used by the streamer to configure the wheel during their session. Communicates with the server via:
- `GET/POST /api/config` — load and save config
- `POST /api/trigger` — manual test spin
- Socket.io — live spin preview, config-update push, integration status

The `WheelPreview` component uses an identical render pipeline to the OBS overlay. What you see in the editor is exactly what viewers see.

### Overlay (`/wheel`)
A minimal Vite-compiled page. No React. Contains one `<canvas>` and one result `<div>`. Loaded into OBS as a Browser Source.

- Loads config via `config-update` socket event on connect
- Runs a `requestAnimationFrame` loop continuously (no idle state)
- Responds to `spin` events — starts animation, emits `spin-complete` when done
- Shows result overlay for `result.duration` ms after each spin

---

## The Wheel Renderer

`src/wheel/renderer.ts` exports a single pure function:

```typescript
function renderFrame(
  ctx: CanvasRenderingContext2D,
  config: WheelConfig,
  layout: SegmentLayout[],
  rotation: number  // current wheel rotation in radians
): void
```

Called every animation frame (60fps target). Zero side effects, zero internal state.

`layout` is pre-computed from `computeSegmentLayout(segments)` and only recalculated when the segment list changes — not every frame.

### Rendering order (painter's algorithm)
1. Clear canvas
2. Glow shadow (if enabled) via `ctx.shadowBlur`
3. Segment arcs (fill + inner border)
4. Clear glow
5. Outer wheel border
6. Hub (centre circle + sheen gradient)
7. Segment labels (radial text, rotated with each segment)
8. Pointer (drawn at wheel edge; rotated to face inward)

### Pointer system
Pointer shapes are defined in `src/wheel/pointers.ts` as canvas drawing functions. Each preset draws a shape **pointing RIGHT (+x)** in local space. `getPointerRotation(position)` returns the `ctx.rotate()` angle needed to make it face inward from any of the four positions.

---

## Spin Physics

`src/wheel/physics.ts` handles all animation math.

### Winner selection
Segments are weighted. `createSpinAnimation` picks a random winner proportional to `segment.weight`, then calculates a `targetAngle` that places the winner's midpoint exactly under the pointer, plus N full rotations (random between `rotationsMin` and `rotationsMax`).

### Easing
Three built-in functions: `ease-out-cubic`, `ease-out-quint`, `ease-out-expo`. All decelerate to a smooth stop. The bounce mode overshoots by a small amount at the end of the spin.

### Animation loop
```
createSpinAnimation() → SpinAnimation object
    ↓  (each frame)
tickAnimation(anim, now) → { angle, progress, complete }
    ↓  (when complete)
getWinnerLayout() → SegmentLayout of winning segment
```

---

## Socket.io Event Contract

All event types are defined in `src/types/events.ts` using Socket.io's typed generics.

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `spin` | `{ triggeredBy: string }` | Initiate a spin (from queue) |
| `config-update` | `{ config: WheelConfig }` | Push config to editor + overlay |
| `chat-message` | `{ platform, username, message, timestamp }` | Chat feed for editor |
| `integration-status` | `{ platform, status, message? }` | Connection state indicator |
| `spin-queue` | `{ queueLength: number }` | Queue depth update |

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `spin-complete` | `{ winner: Segment, triggeredBy: string }` | Overlay/editor reports winner |
| `editor-spin` | — | Editor "Test Spin" button |

---

## Spin Queue

`src/server/socketBridge.ts` manages a simple FIFO queue. When multiple chat commands arrive while a spin is in progress, they are queued and executed sequentially. The overlay emits `spin-complete` when done, which pops the next item.

```
Command arrives → enqueueSpin()
                       ↓
           if spinning: push to queue
           if idle:     emit 'spin' immediately
                       ↓
    overlay emits 'spin-complete'
                       ↓
           processQueue() → emit next 'spin' or set idle
```

---

## Vite Build Setup

Two entry points in `vite.config.ts` `rollupOptions.input`:

| Entry | Source | Output | Served at |
|---|---|---|---|
| `main` | `index.html` | `dist/index.html` | `/` |
| `overlay` | `overlay.html` | `dist/overlay.html` | `/wheel` |

Both entries share `src/types/` and `src/wheel/` code. Vite tree-shakes them independently, so the overlay bundle contains no React code.

---

## Dev vs Production Serving

### Development (`npm run dev`)
```
concurrently:
  ├── vite dev server     (port 5173) — serves editor + overlay HTML
  └── tsx watch           (port 3000) — Express server + Socket.io

OBS Browser Source: http://localhost:3000/wheel
  └── Express redirects → http://localhost:5173/overlay.html
      └── Vite serves overlay.html (with HMR for dev)

Editor: http://localhost:5173
  └── /socket.io proxied → localhost:3000
  └── /api/*     proxied → localhost:3000
```

### Production (`npm run build && npm start`)
```
vite build → dist/index.html + dist/overlay.html
tsc -p tsconfig.server.json → dist-server/

Express (port 3000):
  GET /        → dist/index.html
  GET /wheel   → dist/overlay.html
  GET /api/*   → configRouter / triggerRouter
  WS           → Socket.io
```

---

## Config Schema

`src/types/config.ts` is the single source of truth. Key top-level sections:

```typescript
interface WheelConfig {
  version: number             // schema version (increment on breaking changes)
  wheel: WheelAppearance      // colours, fonts, glow, border, hub
  segments: Segment[]         // label, color, textColor, weight, enabled
  pointer: PointerConfig      // preset, customImageDataUrl, position, scale
  spin: SpinPhysics           // duration, rotations, easing, bounce
  result: ResultDisplay       // win overlay text, colours, duration
  sound: SoundConfig          // spin/win audio, volume
  commands: CommandConfig[]   // chat command definitions
  removeWinnerMode: boolean
  integrations: {
    twitch: TwitchConfig
    kick: KickConfig           // Botrix bridge — no direct connection
    webhook: WebhookConfig
  }
}
```

Config is persisted as `config.json` (gitignored). Written atomically via `configStore.ts` (write `.tmp` → `rename`). Created from `DEFAULT_CONFIG` if absent.

---

## Integration Architecture

### Twitch (Phase 3)
- `tmi.js` IRC connection for chat commands
- EventSub WebSocket for Channel Points
- OAuth token stored in `.env` (never in browser)
- Command cooldown tracked in memory (Map<userId, timestamp>)

### Kick (Botrix bridge)
Kick requires no native implementation. The streamers set up a Botrix command that calls `POST /api/trigger`. StreamSpin only needs its existing webhook endpoint.

### Webhook / Stream Deck / Manual
`POST /api/trigger` with `{ secret, triggeredBy? }` body. Secret validated server-side. This is the universal trigger — any tool that can make an HTTP POST can fire the wheel.

---

## Authentication

### Twitch
- OAuth 2.0 Authorization Code flow
- Server-side token exchange at `/auth/twitch/callback`
- Tokens stored in `.env` (server reads on startup)
- Automatic refresh before expiry

### Kick
- No OAuth — Botrix handles authentication externally

### Webhook
- Shared secret in `WEBHOOK_SECRET` env var
- If unset, endpoint accepts any POST (dev convenience)

---

## Security

- Server binds to `127.0.0.1` — not LAN/internet accessible
- Webhook endpoint validates `WEBHOOK_SECRET` when set
- OAuth tokens never leave the server process (not in browser, not in logs)
- `config.json` and `.env` are gitignored
- No external data transmission; all processing is local

---

## Performance Targets

| Metric | Target |
|---|---|
| Overlay page load time | < 500ms |
| Chat command → spin latency | < 100ms |
| Canvas render FPS (spin) | 60fps |
| Canvas render FPS (idle) | 60fps (continuous loop) |
| Config save latency | < 50ms |
| Server memory footprint | < 100MB |
| Overlay tab memory | < 150MB |

---

## Build & Distribution

### Development
```bash
npm run dev
# → concurrently: Vite (5173) + tsx watch (3000)
# Editor:  http://localhost:5173
# Overlay: http://localhost:3000/wheel (redirects to Vite)
```

### Production
```bash
npm run build   # Vite → dist/ + tsc → dist-server/
npm start       # node dist-server/server/index.js
# Editor:  http://localhost:3000
# Overlay: http://localhost:3000/wheel
```

### Future: Electron
Server runs as Electron main process. Editor opens as `BrowserWindow`. Overlay is still served via localhost for OBS compatibility — Electron `BrowserWindow` cannot be used as an OBS Browser Source.
