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
│  LOCAL SERVER  (Node.js / Express)                  │
│                                                     │
│  ┌─────────────┐  ┌────────────┐  ┌─────────────┐  │
│  │ Twitch Chat │  │ Kick Chat  │  │  REST API   │  │
│  │  (tmi.js)   │  │ (Pusher)   │  │ /api/*      │  │
│  └──────┬──────┘  └─────┬──────┘  └──────┬──────┘  │
│         └───────────────┴────────────────┘         │
│                         │                           │
│              ┌──────────▼──────────┐                │
│              │   Socket Bridge     │                │
│              │  (socketBridge.ts)  │                │
│              └──────────┬──────────┘                │
│                         │                           │
│              ┌──────────▼──────────┐                │
│              │    Socket.io        │                │
│              └─────────────────────┘                │
└─────────────────────────────────────────────────────┘
                         │
          ┌──────────────┴───────────────┐
          ▼                              ▼
┌──────────────────┐          ┌──────────────────────┐
│  EDITOR UI       │          │  WHEEL OVERLAY        │
│  /              │          │  /wheel               │
│  React + Vite   │          │  Vanilla Canvas       │
│  (port 3000)    │          │  (OBS Browser Source) │
└──────────────────┘          └──────────────────────┘
```

---

## Why Local-First?

1. **No cloud costs** — this is a free tool, no hosting bill
2. **Low latency** — wheel spins within milliseconds of a chat command
3. **Privacy** — OAuth tokens never leave the user's machine
4. **Reliability** — works offline (manual trigger mode)
5. **Simplicity** — no auth server, no backend deployment

---

## The Two Pages

### Editor (`/`)
A full React app. Used by the streamer to configure the wheel. Communicates with the server via REST (`/api/config`, `/api/trigger`) and Socket.io (to preview spins live).

### Overlay (`/wheel`)
A minimal HTML page with a `<canvas>` element. No React. Loads config once from `/api/config` on mount, then stays connected via Socket.io. Responds to `spin` and `config-update` events only. Designed to be lightweight — this page must never cause OBS to stutter.

---

## Socket.io Event Contract

All events are typed in `src/types/events.ts`.

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `spin` | `{ triggeredBy: string }` | Initiate a spin |
| `config-update` | `WheelConfig` | Live config push to overlay |
| `chat-message` | `{ platform, user, message }` | Feed for editor display |
| `integration-status` | `{ platform, status }` | Connect/disconnect state |

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `spin-complete` | `{ winner: Segment }` | Overlay reports the winning segment |
| `editor-spin` | `{}` | Editor's "Test Spin" button |

---

## Config Schema

The config is a single JSON file at `config.json`. It is the only persistence mechanism. The schema is defined in `src/types/config.ts` and covers:

```typescript
interface WheelConfig {
  wheel: WheelAppearance;      // colours, fonts, effects
  segments: Segment[];          // labels, colours, weights
  pointer: PointerConfig;       // preset or custom image
  spin: SpinPhysics;            // duration, easing, bounce
  result: ResultDisplay;        // win overlay settings
  integrations: {
    twitch?: TwitchConfig;
    kick?: KickConfig;
    webhook?: WebhookConfig;
  };
  commands: CommandConfig[];    // all configurable commands
}
```

Config is written atomically (write to `.tmp`, then rename) to prevent corruption if the process is killed mid-write.

---

## Wheel Renderer

The renderer (`src/wheel/renderer.ts`) is a pure function:

```typescript
function render(canvas: HTMLCanvasElement, config: WheelConfig, angle: number): void
```

It is called on every animation frame during a spin. It has no side effects and no internal state. The animation loop and physics live in `src/wheel/physics.ts`.

This design means:
- The editor preview and the OBS overlay use identical rendering code
- The renderer is trivially testable
- No React dependency in the render path

---

## Integration Module Interface

Every platform integration exports the same interface:

```typescript
interface Integration {
  connect(config: PlatformConfig, onEvent: (event: ChatEvent) => void): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}
```

The socket bridge calls `connect()` on startup for each enabled platform and pipes `ChatEvent` objects into the command parser, which decides whether to emit a `spin` event.

---

## Authentication

### Twitch
- OAuth 2.0 Authorization Code flow
- Streamer authorises via `/auth/twitch` (browser redirect)
- Server exchanges code for access + refresh tokens
- Tokens stored in `config.json` (never in browser storage)
- Refresh handled automatically by the server

### Kick
- No OAuth required for reading public chat (read-only Pusher subscription)
- Only the channel slug is needed
- If Kick introduces a bot API, this can be upgraded without changing the interface

### OnlyFans
- No official API available (as of Q1 2026)
- Integration is manual via the webhook trigger endpoint

---

## Security Considerations

- Server binds to `127.0.0.1` only — not accessible from outside the machine
- Webhook trigger endpoint requires a shared secret (configurable)
- `.env` and `config.json` are gitignored
- No user data is sent anywhere — all processing is local
- OAuth tokens are stored with restrictive file permissions (600)

---

## Performance Targets

| Metric | Target |
|---|---|
| Overlay page load time | < 500ms |
| Chat command → spin latency | < 100ms |
| Canvas render FPS during spin | 60fps |
| Config save latency | < 50ms |
| Memory footprint (server) | < 100MB |
| Memory footprint (overlay tab) | < 150MB |

---

## Build & Distribution

### Development
```
npm run dev  →  concurrently runs:
                - Vite dev server (port 5173, proxied to 3000)
                - tsx watch on src/server/index.ts (port 3000)
```

### Production Build
```
npm run build  →  Vite builds React app to dist/
                  tsc compiles server to dist-server/
                  Express serves dist/ as static files
```

### Future: Electron Packaging
The server will run as an Electron main process. The editor opens as an Electron BrowserWindow. The wheel overlay is still served via localhost for OBS compatibility (Electron BrowserWindow cannot be used as OBS Browser Source).
