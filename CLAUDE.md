# CLAUDE.md — StreamSpin Development Guide

This file is the canonical source of truth for AI-assisted development on this project. Read it before making any changes.

---

## Project Identity

**StreamSpin** is a local-first, browser-source-ready spin wheel for streamers. It runs as a local Node.js server. The Editor UI and the wheel overlay are two separate Vite-compiled pages served by the same Express server. A WebSocket layer (Socket.io) bridges chat events to the overlay in real time.

---

## Tech Stack (Decisions Made)

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | React 18 + Vite | Fast HMR, familiar ecosystem |
| Wheel rendering | HTML5 Canvas (custom) | Full control over animation, no bloat |
| Styling | Tailwind CSS | Utility-first, no fighting CSS modules |
| Backend | Express + Socket.io | Simple, battle-tested, native WS |
| Twitch chat | `tmi.js` | De-facto standard for Twitch IRC |
| Twitch REST API | Native fetch to Helix | No extra SDK needed for token exchange |
| Twitch EventSub | Native WebSocket | Lightweight enough to implement directly |
| Kick chat | Botrix bridge (webhook) | Botrix handles Kick auth; we just receive a POST |
| State persistence | `config.json` + `presets.json` | No DB dependency for a local tool |
| Packaging | Electron (Phase 5) | Distribute as single executable |

Do **not** introduce new major dependencies without a clear reason. This is a local tool — keep it lean.

---

## Project Structure (as-built)

```
index.html              Vite entry: React editor app
overlay.html            Vite entry: OBS overlay (vanilla TS, no React)

src/
  app/                  React editor UI
    App.tsx             Root — config state, debounced save, socket
    lib/
      configApi.ts      fetch/save/import/export config
      constants.ts      SEGMENT_COLORS, FONTS, EASING_OPTIONS, generateId
    components/
      WheelPreview.tsx  Live canvas preview (same renderer as overlay)
      PresetManager.tsx Named wheel preset save/load/delete UI
      panels/           One file per settings panel
        SegmentsPanel.tsx
        AppearancePanel.tsx
        PointerPanel.tsx
        SpinSettingsPanel.tsx
        ResultPanel.tsx
      ui/               Reusable primitives
        Panel.tsx       Collapsible section wrapper
        Slider.tsx
        ColorInput.tsx
        Toggle.tsx
        NumberInput.tsx
        Select.tsx

  wheel/                Pure renderer — NO React, NO DOM except Canvas
    renderer.ts         renderFrame(ctx, config, layout, rotation)
    physics.ts          computeSegmentLayout, createSpinAnimation, tickAnimation
    pointers.ts         Canvas-drawn pointer presets (arrow/triangle/pin/gem/hand)

  overlay/
    main.ts             OBS overlay entry — Socket.io + rAF render loop

  server/
    index.ts            Express app + Socket.io server (binds 127.0.0.1 only)
    configStore.ts      Atomic read/write of config.json
    presetsStore.ts     Atomic read/write of presets.json (named wheel snapshots)
    socketBridge.ts     Spin queue + socket event routing
    routes/
      config.ts         GET/POST /api/config — broadcasts to overlay on POST
      trigger.ts        POST /api/trigger — webhook + Stream Deck
      presets.ts        CRUD /api/presets + POST /api/presets/:id/load
      auth.ts           /auth/twitch OAuth stubs (Phase 3)

  integrations/         Platform chat connectors (Phase 3)
    twitch/

  types/                Shared types — imported by app, server, and overlay
    config.ts           WheelConfig master schema + DEFAULT_CONFIG
    events.ts           Typed Socket.io event maps

public/
  assets/               Static assets (Vite copies as-is)
```

---

## Critical Architecture Rules

1. **The wheel renderer (`src/wheel/`) must stay framework-agnostic.** It takes a canvas context, config, layout, and rotation angle — nothing else. No React imports, no DOM access beyond Canvas. Both the editor preview and the OBS overlay use it identically.

2. **The editor does not listen to `config-update` socket events after initial load.** It manages its own state locally and debounce-saves via REST. The server pushes `config-update` only to overlay clients (`socket.data.clientType === 'overlay'`).

3. **Config is stored in two files, both gitignored:**
   - `config.json` — the currently active wheel config
   - `presets.json` — named snapshots (array of `{ id, name, config, savedAt }`)
   - Both are written atomically (write `.tmp` → rename)

4. **The server always binds to `127.0.0.1`.** Never change this to `0.0.0.0`.

---

## Coding Conventions

- **TypeScript throughout** — no plain JS files in `src/`
- Functional React components only, no class components
- No `any` types without a comment explaining why
- `src/types/config.ts` is the single source of truth — touch it first when adding new config fields
- Integration modules (Phase 3) export `connect(config, onEvent)` and `disconnect()` — nothing else
- Socket events are typed via `ServerToClientEvents` / `ClientToServerEvents` in `src/types/events.ts`

---

## What NOT to Do

- Do not store OAuth tokens in the browser (localStorage/cookies). Tokens go in `.env`, managed server-side.
- Do not make the wheel renderer depend on React or any framework.
- Do not add a database. `config.json` and `presets.json` are the only persistence.
- Do not break the editor ↔ overlay separation. They communicate only via Socket.io and REST.
- Do not auto-commit or push. Always confirm with the user before any git operations.
- Do not co-author commits — commits are attributed to the user only.
- Do not bind the server to anything other than `127.0.0.1`.

---

## Key Files

| File | Purpose |
|---|---|
| `src/types/config.ts` | Master config type + DEFAULT_CONFIG — add fields here first |
| `src/types/events.ts` | Socket.io event contract |
| `src/wheel/renderer.ts` | Canvas rendering engine — pure function |
| `src/wheel/physics.ts` | Spin animation — layout, winner selection, easing |
| `src/wheel/pointers.ts` | Canvas-drawn pointer presets |
| `src/server/index.ts` | Express + Socket.io entry point |
| `src/server/socketBridge.ts` | Spin queue + event routing |
| `src/server/configStore.ts` | Atomic config.json read/write |
| `src/server/presetsStore.ts` | Atomic presets.json read/write |
| `src/app/App.tsx` | Config state, debounced save, socket connection |
| `src/app/components/PresetManager.tsx` | Named preset UI |
| `src/app/components/WheelPreview.tsx` | Editor canvas preview |
| `config.json` | Active runtime config (gitignored) |
| `presets.json` | Named wheel snapshots (gitignored) |
| `.env` | Secrets / OAuth tokens (never committed) |

---

## Running Locally

```bash
npm run dev        # Vite (5173) + tsx watch server (3000) concurrently
npm run build      # Production build → dist/ + dist-server/
npm start          # Serve production build
npm run typecheck  # tsc --noEmit (app) + tsc -p tsconfig.server.json --noEmit
npm run lint       # ESLint
npm test           # Vitest
```

In dev, the editor is at `http://localhost:5173`.  
The OBS overlay URL is always `http://localhost:3000/wheel` (Express redirects to Vite in dev).

---

## Testing Strategy

- Unit tests (Vitest) for wheel physics and config parsing
- Integration tests for the socket bridge with mock chat events
- Canvas renderer: test manually in the editor preview
- Platform integrations: test against Twitch sandbox accounts only

---

## Environment Variables

See `.env.example` for the full list. Never hardcode credentials. Never commit `.env`.

---

## Deployment

This is a **local tool**. No cloud deployment. Distribution in Phase 4 will be via Electron (bundles Node.js + the server + the editor into a single executable).

---

## What's Already Done (Don't Re-implement)

- Named wheel presets (`presetsStore.ts` + `PresetManager.tsx`)
- Spin queue in `socketBridge.ts` — handles multiple simultaneous triggers
- OBS URL copy button in the editor header
- Config import/export (JSON download/upload) in the editor header
- Webhook trigger endpoint (`POST /api/trigger`) with secret auth
- Twitch OAuth, chat (tmi.js), and EventSub (native WS) — fully wired in `integrationManager.ts`
- Kick integration via Botrix bridge — documented in IntegrationsPanel
- Drop shadow, glow, gradient fills, per-segment font/colour/position overrides
- Frame overlay system (`frameImageDataUrl` + `frameEnabled` on WheelAppearance)
- Custom pointer rotation (`customRotation` on PointerConfig)
- Bold/italic label toggles (`labelBold`, `labelItalic` on WheelAppearance)
- Frame ring width (`framePadding` on WheelAppearance)
- Config migration (`src/server/migration.ts`) — called on every config read
- Result overlay shown in editor preview (WheelPreview), not just OBS overlay
- Slim custom scrollbar + sidebar overflow fix (`min-h-0` on flex container)
- Space bar keyboard shortcut for test spin
- Disconnect and save-error banners
- Drag-and-drop reordering (handle-only — does not conflict with sliders)
