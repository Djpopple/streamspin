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
  - [x] Segment inner border/stroke
  - [x] Segment labels — radial, font, size, truncation with maxWidth
  - [x] Centre circle / hub with sheen gradient
  - [-] Gradient fills per segment (deferred to Phase 4 polish)
  - [x] Glow effect via `ctx.shadowBlur`
  - [-] Drop shadow (config toggle present; canvas shadow rendering deferred)
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

---

## Phase 2 — Editor UI ✅

- [x] Layout: collapsible sidebar panels + live canvas preview
- [x] **Segments Panel**
  - [x] Add / delete segments
  - [x] Reorder with up/down buttons
  - [-] Drag-and-drop reorder (deferred — up/down buttons are sufficient)
  - [x] Per-segment: label, colour (palette + hex input), weight, enabled toggle
  - [x] Bulk import (newline or comma-separated)
  - [x] Remove-winner mode toggle
- [x] **Appearance Panel**
  - [x] Background: transparent or solid colour
  - [x] Wheel border width + colour
  - [x] Hub size + colour
  - [x] Global font selector (Inter, Oswald, Bebas Neue, Bangers, Poppins, Nunito + system fonts)
  - [x] Label font size
  - [-] Per-segment font override (deferred to Phase 4)
  - [-] Bold/italic label controls (deferred to Phase 4)
  - [x] Glow toggle + colour + intensity
  - [x] Shadow toggle
- [x] **Pointer Panel**
  - [x] Preset selector — live canvas previews of all 5 presets
  - [x] Custom image upload (PNG/JPG, auto-resized to 256px)
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
  - [x] Live mini-preview of the result overlay
- [x] 400ms debounced auto-save (config.json + overlay push on every change)
- [x] Live wheel preview — canvas updates in real time as settings change
- [x] "Test Spin" button triggers spin in editor and overlay simultaneously
- [x] Config import / export (JSON download/upload via header buttons)
- [x] **Named wheel presets** — save, load, update, delete multiple wheels *(Phase 4 item, completed early)*
  - [x] `presetsStore.ts` — atomic read/write of `presets.json`
  - [x] `GET/POST/PUT/DELETE /api/presets` + `POST /api/presets/:id/load`
  - [x] `PresetManager.tsx` — sidebar UI with name input, list, timestamps, active indicator
  - [x] Loading a preset pushes live to OBS overlay immediately

---

## Phase 3 — Platform Integrations

### Twitch
- [ ] OAuth flow — Authorization Code, server-side
  - [ ] `/auth/twitch` redirect endpoint (stub exists, needs token exchange)
  - [ ] Token storage in `.env` (never in browser)
  - [ ] Access token refresh before expiry
- [ ] `src/integrations/twitch/chat.ts` — TMI.js IRC connection
  - [ ] Connect to channel on startup when enabled
  - [ ] Command parser with configurable prefix
  - [ ] Per-user cooldown (configurable seconds, tracked in memory)
  - [ ] Moderator-only and broadcaster-only command gates
  - [ ] Configurable bot response messages
  - [ ] `!spin`, `!addslice <label>`, `!removeslice <label>` commands
- [ ] `src/integrations/twitch/eventsub.ts` — Channel Points
  - [ ] Native WebSocket EventSub connection
  - [ ] `channel.channel_points_custom_reward_redemption.add` subscription
  - [ ] Configurable reward ID (paste in editor)
  - [ ] Auto-fulfil redemption after spin completes
- [ ] **Integrations panel in Editor**
  - [ ] Twitch: connect/disconnect button, channel + bot username inputs
  - [ ] Command list: enable/disable, trigger text, cooldown, mod-only, response
  - [ ] Channel Points: reward ID input, enabled toggle
  - [ ] Connection status dot (green/amber/red)
  - [ ] Chat feed display (last N messages)

### Kick (via Botrix bridge)
- [ ] Integrations panel: Botrix setup guide with copy-paste JS snippet
- [ ] Verify `POST /api/trigger` works reliably from Botrix context
- [ ] Add Botrix setup to `docs/INTEGRATIONS.md` (already documented)

### Manual / Webhook
- [x] `POST /api/trigger` endpoint with shared secret auth
- [ ] Webhook secret input in Integrations panel
- [x] "Test Spin" button in editor (manual trigger via socket)
- [ ] Stream Deck setup guide in Integrations panel

---

## Phase 4 — Polish & Distribution

- [x] OBS Browser Source URL copy button in editor header
- [x] Spin queue (multiple pending spins execute in order)
- [x] Named wheel presets / multi-wheel switching *(completed in Phase 2)*
- [ ] Drop shadow rendering in Canvas renderer
- [ ] Per-segment font override
- [ ] Bold/italic label controls
- [ ] Gradient fills per segment
- [ ] Drag-and-drop segment reordering
- [ ] Error states in UI (failed save, auth error, server disconnect)
- [ ] Keyboard shortcuts (`Space` = spin, `Escape` = cancel, etc.)
- [ ] `config.json` migration logic (handle version field changes)
- [ ] Electron wrapper — bundles server + editor into single `.exe`/`.dmg`
- [ ] Auto-updater (Electron)
- [ ] Windows NSIS + Mac DMG installers
- [ ] Streamlabs/StreamElements chatbot integration notes in docs

---

## Backlog / Future

- [ ] OnlyFans integration (blocked — no public streaming/chat API)
- [ ] TikTok Live integration
- [ ] YouTube Live integration
- [ ] Confetti / particle effects on win
- [ ] Animated segment backgrounds (GIF/video fills)
- [ ] Viewer-submitted entry queue (viewers type `!addme` to add their name)
- [ ] Second screen / fullscreen result display mode
- [ ] Mobile companion app (manual trigger from phone)
- [ ] Cloud preset sync (opt-in)
- [ ] Public API for third-party extensions

---

## Known Blockers

| Item | Status | Notes |
|---|---|---|
| Twitch OAuth token exchange | Not started | Phase 3 — stub routes exist |
| Kick native bot API | Bypassed | Using Botrix bridge instead |
| OnlyFans API | Blocked externally | Manual webhook is the workaround |
| Electron packaging | Deferred | Phase 4 scope |
| Canvas drop shadow | Deferred | Config toggle exists; rendering not wired |
