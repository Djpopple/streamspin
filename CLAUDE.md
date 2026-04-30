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
presets/                Ready-to-import themed wheel JSON files
public/assets/fonts/    Custom font files (.ttf/.woff2) served statically

src/
  app/                  React editor UI
    App.tsx             Root — config state, debounced save, socket, Space shortcut
    lib/
      configApi.ts      fetch/save/import/export config (import routes through server for migration)
      constants.ts      SEGMENT_COLORS, FONTS, EASING_OPTIONS, generateId
    components/
      WheelPreview.tsx  Live canvas preview + result overlay
      PresetManager.tsx Named preset UI — persists activeId in localStorage
      panels/
        SegmentsPanel.tsx   Drag-and-drop, per-segment advanced options
        AppearancePanel.tsx Bold/italic, frame overlay upload, frame ring width
        PointerPanel.tsx    Custom pointer + rotation controls
        SpinSettingsPanel.tsx
        ResultPanel.tsx
        IntegrationsPanel.tsx
        HistoryPanel.tsx    Win history — per-row remove/edit, live socket updates
      ui/
        Panel.tsx       Collapsible section (default closed)
        Slider.tsx      Defaults value=0 to guard against undefined
        ColorInput.tsx  Swatch + hex input; uses opacity-0 w-px h-px (not sr-only)
        Toggle.tsx      left=off, right=on
        NumberInput.tsx
        Select.tsx

  wheel/                Pure renderer — NO React, NO DOM except Canvas
    renderer.ts         renderFrame — wrapped in ctx.save/restore guard
                        Smart label sizing: fixed radius, font scales to chord+radial geometry
    physics.ts          computeSegmentLayout, createSpinAnimation, tickAnimation
    pointers.ts         Canvas-drawn pointer presets

  overlay/
    main.ts             OBS overlay entry — Socket.io + rAF loop

  server/
    index.ts            Express + Socket.io (binds 127.0.0.1 only)
    configStore.ts      Atomic read/write of config.json
    migration.ts        migrateConfig() — deep-merges all sub-objects against DEFAULT_CONFIG
    presetsStore.ts     Atomic read/write of presets.json
    historyStore.ts     In-memory win history + history.json persistence (capped at 200)
    socketBridge.ts     Spin queue + socket event routing + win recording
    tokenStore.ts       Twitch OAuth tokens + auto-refresh
    integrationManager.ts  Twitch chat + EventSub lifecycle
    routes/
      config.ts         GET/POST /api/config
      trigger.ts        POST /api/trigger (webhook + Stream Deck)
      presets.ts        CRUD /api/presets + POST /api/presets/:id/load (runs migration)
      auth.ts           /auth/twitch OAuth flow
      history.ts        GET/DELETE /api/history, DELETE/PATCH /api/history/:id

  integrations/
    twitch/
      chat.ts           tmi.js — !spin, !addslice, !removeslice, per-user cooldowns
      eventsub.ts       Native WebSocket EventSub — Channel Points, auto-fulfil

  types/
    config.ts           WheelConfig master schema + DEFAULT_CONFIG
    events.ts           Typed Socket.io event maps
```

---

## Critical Architecture Rules

1. **The wheel renderer (`src/wheel/`) must stay framework-agnostic.** It takes a canvas context, config, layout, and rotation angle — nothing else. No React imports, no DOM access beyond Canvas.

2. **The editor does not listen to `config-update` socket events after initial load.** It manages its own state locally and debounce-saves via REST. The server pushes `config-update` only to overlay clients (`socket.data.clientType === 'overlay'`).

3. **Persistent data is stored in three gitignored files:**
   - `config.json` — the currently active wheel config
   - `presets.json` — named snapshots (`{ id, name, config, savedAt }[]`)
   - `history.json` — win records (`WinRecord[]`, newest-first, capped at 200)
   - All are written atomically (write `.tmp` → rename)

4. **The server always binds to `127.0.0.1`.** Never change this to `0.0.0.0`.

5. **Migration runs at every entry point** — server startup (configStore.readConfig), preset load (presets route), and file import (configApi.importConfig saves then re-fetches). Never return a raw stored config without migrating it first.

6. **`renderFrame` is wrapped in a top-level `ctx.save()`/`ctx.restore()`.** Any bad transform (e.g. NaN from missing config fields) cannot leak into the next frame.

---

## Label Rendering (Smart Auto-Sizing)

All labels sit at a fixed radius (`0.35 * radius + labelRadiusOffset`). Font size is calculated per-segment using two geometric constraints:

- **Angular**: `maxFontSizeAngular = 2 * textX * sin(seg.span / 2) * 0.80` — font height must fit the arc chord at the inner edge of the text
- **Radial**: `maxRadialWidth = radius * 0.90 - textX` — text length must not exceed the rim

Font starts at `min(globalFontSize, maxFontSizeAngular)`, then scales down proportionally if the measured text width exceeds `maxRadialWidth`. Result: wide segments get full-size text, narrow segments get smaller text, everything stays inside the wheel.

Per-segment `labelRadiusOffset` shifts the fixed base position inward/outward and still applies on top of this auto-sizing.

---

## Coding Conventions

- **TypeScript throughout** — no plain JS files in `src/`
- Functional React components only, no class components
- No `any` types without a comment explaining why
- `src/types/config.ts` is the single source of truth — add new config fields here first, then update `migration.ts` (deep-merge in base object), then renderer/UI
- Integration modules export `connect(config, onEvent)` and `disconnect()` — nothing else
- Socket events are typed via `ServerToClientEvents` / `ClientToServerEvents` in `src/types/events.ts`

---

## What NOT to Do

- Do not store OAuth tokens in the browser. Tokens go in `tokens.json`, managed server-side.
- Do not make the wheel renderer depend on React or any framework.
- Do not add a database. `config.json`, `presets.json`, and `history.json` are the only persistence.
- Do not break the editor ↔ overlay separation. They communicate only via Socket.io and REST.
- Do not auto-commit or push. Always confirm with the user before any git operations.
- Do not co-author commits — commits are attributed to the user only.
- Do not bind the server to anything other than `127.0.0.1`.
- Do not return a stored config to the client without running `migrateConfig` first.
- Do not use `sr-only` on `<input type="color">` — use `opacity-0 w-px h-px` instead (sr-only's clip rect prevents the OS colour picker from opening).

---

## Adding New Config Fields

1. Add to the interface in `src/types/config.ts`
2. Add a default value to `DEFAULT_CONFIG` in `src/types/config.ts`
3. The deep-merge in `migration.ts` handles it automatically for `wheel`, `pointer`, `spin`, `result`, `sound` sub-objects — no extra migration code needed for those
4. For `Segment`-level fields, add explicit spread in the segment migration loop
5. Update renderer / UI as needed

---

## Key Files

| File | Purpose |
|---|---|
| `src/types/config.ts` | Master config type + DEFAULT_CONFIG |
| `src/types/events.ts` | Socket.io event contract |
| `src/wheel/renderer.ts` | Canvas rendering engine — smart label sizing |
| `src/wheel/physics.ts` | Spin animation + winner detection |
| `src/wheel/pointers.ts` | Canvas pointer presets |
| `src/server/index.ts` | Express + Socket.io entry point |
| `src/server/migration.ts` | Config schema migration |
| `src/server/socketBridge.ts` | Spin queue + event routing |
| `src/server/configStore.ts` | Atomic config.json read/write |
| `src/server/presetsStore.ts` | Atomic presets.json read/write |
| `src/server/historyStore.ts` | In-memory win history + history.json persistence |
| `src/server/routes/history.ts` | Win history REST API |
| `src/app/components/panels/HistoryPanel.tsx` | Win history editor UI |
| `src/app/App.tsx` | Config state, debounced save, socket, keyboard shortcut |
| `src/app/components/PresetManager.tsx` | Preset UI + localStorage persistence |
| `src/app/components/WheelPreview.tsx` | Editor canvas preview + result overlay |
| `src/app/lib/configApi.ts` | Config fetch/save/import/export |

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

Editor: `http://localhost:5173`
OBS overlay: `http://localhost:3000/wheel` (always this URL, even in dev)

---

## What's Already Done (Don't Re-implement)

- Named wheel presets (presetsStore.ts + PresetManager.tsx)
- Spin queue in socketBridge.ts
- OBS URL copy button in editor header
- Config import/export with server-side migration on import
- Webhook trigger endpoint (`POST /api/trigger`) with secret auth
- Twitch OAuth, chat (tmi.js), and EventSub — fully wired in integrationManager.ts
- Kick integration via Botrix bridge
- Drop shadow, glow, gradient fills, per-segment font/colour/position overrides
- Frame overlay system (frameImageDataUrl + frameEnabled)
- Custom pointer rotation (customRotation on PointerConfig)
- Bold/italic label toggles (labelBold, labelItalic on WheelAppearance)
- Frame ring width (framePadding on WheelAppearance)
- Smart label auto-sizing (fixed radius + geometric font scaling)
- Config migration at all three entry points
- Result overlay in editor preview (WheelPreview)
- Slim custom scrollbar + full page scroll fix (overflow hidden on html/body/#root)
- Space bar keyboard shortcut for test spin
- Disconnect and save-error banners
- Drag-and-drop segment reordering (handle-only)
- Active preset persisted in localStorage across reloads
- All panels collapsed by default
- Themed preset files in presets/ folder
- CC Zoinks font wired via @font-face from public/assets/fonts/
- Win history panel (historyStore.ts + HistoryPanel.tsx) — persisted, live socket updates, per-row remove and inline edit
- 37-font selector with live font preview dropdown (FontSelect.tsx — each option renders in its own typeface)
- Segment image system: one image fills the wheel circle, segments reveal it in modes: none/all/alternating/manual/reveal
- Reveal mode: spin-complete triggers server-side showImage flip + config-update broadcast; spin-done (after linger) releases queue
- Post-result linger slider (lingerDuration on ResultDisplay) — wheel holds on screen after overlay fades before next spin fires
- spin-complete / spin-done event split: complete = win recorded + reveal; done = queue released
