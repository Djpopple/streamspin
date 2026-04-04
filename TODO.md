# TODO — StreamSpin

Tasks are grouped by phase. Each phase should be fully functional before moving to the next.

Legend: `[x]` = done, `[ ]` = todo, `[-]` = deferred / won't do this phase

---

## Phase 0 — Project Setup ✅

- [x] Initialise Vite + React + TypeScript project
- [x] Set up Tailwind CSS
- [x] Set up Express server with TypeScript (`tsx watch`)
- [x] Set up Socket.io (server + client, fully typed)
- [x] Configure ESLint
- [x] Configure Vitest
- [x] Set up `concurrently` to run Vite + Express together (`npm run dev`)
- [x] Create `.env.example` with all required variables
- [x] Define master config schema in `src/types/config.ts` + `DEFAULT_CONFIG`
- [x] Define socket event types in `src/types/events.ts`
- [x] Create `config.json.example`
- [x] Set up config read/write API endpoints (`GET /api/config`, `POST /api/config`)
- [x] Create GitHub repository and push initial commit

---

## Phase 1 — Wheel Rendering Engine ✅

- [x] `src/wheel/renderer.ts` — pure `renderFrame(ctx, config, layout, rotation)`
  - [x] Segment arcs with configurable fill colours
  - [x] Per-segment gradient fills (linear, hub → rim)
  - [x] Segment inner border/stroke
  - [x] Segment labels — radial, font, size, truncation with maxWidth
  - [x] Per-segment label position offset (shift toward/away from centre)
  - [x] Bold / italic label style toggles
  - [x] Centre circle / hub with sheen gradient
  - [x] Glow effect via `ctx.shadowBlur`
  - [x] Drop shadow rendering
  - [x] Frame overlay image (artist PNG rendered on top of wheel)
  - [x] Configurable background colour (transparent or solid)
- [x] `src/wheel/physics.ts` — spin animation
  - [x] Configurable duration (min/max random range)
  - [x] Three easing functions: ease-out-cubic, ease-out-quint, ease-out-expo
  - [x] Configurable rotations (min/max random range)
  - [x] Bounce/overshoot effect (optional, configurable intensity)
  - [x] Winner detection — segment under pointer at final angle
  - [x] Weighted segment support (probability weighting)
- [x] `src/wheel/pointers.ts` — five canvas-drawn presets (Arrow, Triangle, Pin, Gem, Hand)
  - [x] Pointer position: top, right, bottom, left
  - [x] Custom image pointer (PNG/JPG upload → base64 stored in config)
  - [x] Custom pointer rotation (snap buttons + 360° slider)
  - [x] Pointer scale control
  - [x] Colour tint for SVG presets
- [x] OBS overlay page (`/wheel`)
  - [x] Compiled as separate Vite entry (`overlay.html` → `dist/overlay.html`)
  - [x] Connects to Socket.io on mount
  - [x] Runs continuous `requestAnimationFrame` render loop
  - [x] Listens for `spin` events → starts animation → emits `spin-complete`
  - [x] Transparent background
  - [x] Win result overlay with pop-in animation
  - [x] Spin-start and win audio playback
- [x] `WheelPreview` component in editor — identical render pipeline to overlay
  - [x] Result overlay shown in editor preview after test spin

---

## Phase 2 — Editor UI ✅

- [x] Layout: collapsible sidebar panels + live canvas preview
- [x] Wider sidebar (420px) with slim custom scrollbar, no phantom empty space
- [x] Disconnect and save-error banners
- [x] Space bar shortcut triggers test spin
- [x] **Segments Panel**
  - [x] Add / delete segments (minimum 2)
  - [x] Drag-and-drop reorder (handle-only, doesn't interfere with sliders)
  - [x] Up/down arrow reorder buttons
  - [x] Per-segment: label, colour (10-col palette + hex input), weight, enabled toggle
  - [x] Expandable advanced options per segment:
    - [x] Text colour picker
    - [x] Gradient fill toggle + start colour
    - [x] Font override (overrides global font for this segment)
    - [x] Label position slider (−40% to +40% of radius)
  - [x] Bulk import (newline or comma-separated)
  - [x] Remove-winner mode toggle
- [x] **Appearance Panel**
  - [x] Background: transparent or solid colour
  - [x] Wheel border width + colour
  - [x] Hub size + colour
  - [x] Global font selector (Inter, Oswald, Bebas Neue, Bangers, Poppins, Nunito, Arial, Georgia, Impact, Verdana, Courier New, Comic Sans, Times New Roman, Permanent Marker, Ravie, Bradley Hand ITC)
  - [x] Label font size
  - [x] Bold / italic label style toggles
  - [x] Glow toggle + colour + intensity
  - [x] Drop shadow toggle
  - [x] Frame ring width slider (20–160px)
  - [x] Frame overlay upload (artist PNG rendered on top of wheel)
- [x] **Pointer Panel**
  - [x] Preset selector — live canvas previews of all 5 presets
  - [x] Custom image upload (PNG/JPG, auto-resized to 256px)
  - [x] Custom pointer rotation (−90/−45/+45/+90° snap buttons + 0–359° slider)
  - [x] Position selector (4 directions)
  - [x] Scale slider
  - [x] Colour tint for SVG presets
- [x] **Spin & Sound Panel**
  - [x] Duration min/max sliders
  - [x] Rotations min/max sliders
  - [x] Easing curve selector
  - [x] Bounce toggle + intensity slider
  - [x] Spin-start audio upload + volume
  - [x] Win audio upload + volume
- [x] **Result Overlay Panel**
  - [x] Show/hide toggle
  - [x] Duration slider
  - [x] `{winner}` message template
  - [x] Background colour + opacity
  - [x] Font + size + colour
  - [x] Live mini-preview of the result overlay style
- [x] 400ms debounced auto-save (config.json + overlay push on every change)
- [x] Live wheel preview — canvas updates in real time as settings change
- [x] "Test Spin" button triggers spin in editor and overlay simultaneously
- [x] Config import / export (JSON download/upload via header buttons)
- [x] **Named wheel presets** — save, load, update, delete multiple wheels
  - [x] `presetsStore.ts` — atomic read/write of `presets.json`
  - [x] `GET/POST/PUT/DELETE /api/presets` + `POST /api/presets/:id/load`
  - [x] `PresetManager.tsx` — sidebar UI with name input, list, timestamps, active indicator
  - [x] Loading a preset pushes live to OBS overlay immediately
- [x] Config schema migration (`migrateConfig`) — old configs upgraded automatically on load

---

## Phase 3 — Platform Integrations ✅

### Twitch
- [x] OAuth flow — Authorization Code, server-side
  - [x] `/auth/twitch` redirect + token exchange
  - [x] Tokens stored in `tokens.json` (gitignored, never in browser)
  - [x] Auto-refresh within 5 minutes of expiry
- [x] `src/integrations/twitch/chat.ts` — TMI.js IRC connection
  - [x] Connect/disconnect lifecycle
  - [x] Command parser with configurable trigger strings
  - [x] Per-user cooldown (tracked in memory Map)
  - [x] Moderator-only and broadcaster-only gates
  - [x] Configurable bot response messages
  - [x] `!spin`, `!addslice <label>`, `!removeslice <label>`
- [x] `src/integrations/twitch/eventsub.ts` — Channel Points
  - [x] Native WebSocket EventSub connection with keepalive
  - [x] `channel.channel_points_custom_reward_redemption.add` subscription
  - [x] Auto-fulfil redemption after spin completes
- [x] **Integrations panel in Editor**
  - [x] Twitch: connect/disconnect, channel + bot username, OAuth status
  - [x] Command list: enable/disable, trigger, cooldown, mod-only, response
  - [x] Channel Points: reward ID, enabled toggle
  - [x] Connection status indicator
  - [x] Live chat feed (last N messages)

### Kick (via Botrix bridge)
- [x] Integrations panel: step-by-step Botrix setup guide with copy-paste JS snippet
- [x] `POST /api/trigger` verified as the webhook entry point

### Manual / Webhook
- [x] `POST /api/trigger` with shared secret auth
- [x] Webhook + Stream Deck guide in Integrations panel

---

## Phase 4 — Polish ✅

- [x] OBS Browser Source URL copy button in editor header
- [x] Spin queue (multiple pending spins execute in order)
- [x] Drop shadow rendering
- [x] Per-segment font override
- [x] Bold/italic global label style
- [x] Gradient fills per segment
- [x] Drag-and-drop segment reordering (handle-only)
- [x] Error/disconnect banners
- [x] Keyboard shortcut: Space = test spin
- [x] Config migration (handles old configs gracefully)
- [x] Frame ring width control (space for artist frame overlays)
- [x] Frame overlay upload (artist PNG on top of wheel)
- [x] Custom pointer rotation controls
- [x] Label position offset per segment
- [x] Result overlay shown in editor preview (not just OBS overlay)
- [x] Colour picker reliability fix
- [x] Toggle direction fix (left = off, right = on)
- [x] Wider sidebar + slim modern scrollbar
- [x] Expanded font library (16 fonts)

## Phase 5 — Distribution

- [ ] Electron wrapper — bundle server + editor into single `.exe` / `.dmg`
- [ ] Auto-updater (Electron)
- [ ] Windows NSIS + Mac DMG installers

---

## Backlog / Future

- [ ] OnlyFans integration (blocked — no public streaming/chat API)
- [ ] TikTok Live integration
- [ ] YouTube Live integration
- [ ] Confetti / particle effects on win
- [ ] Animated segment backgrounds (GIF/video fills)
- [ ] Viewer-submitted entry queue (`!addme`)
- [ ] Second screen / fullscreen result display mode
- [ ] Mobile companion app (manual trigger from phone)
- [ ] Cloud preset sync (opt-in)
- [ ] Public API for third-party extensions

---

## Known Blockers

| Item | Status | Notes |
|---|---|---|
| Kick native bot API | Bypassed | Using Botrix bridge instead |
| OnlyFans API | Blocked externally | Manual webhook is the workaround |
| Electron packaging | Phase 5 | Starting tomorrow |
