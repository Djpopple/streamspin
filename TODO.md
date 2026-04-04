# TODO — StreamSpin

Tasks are grouped by phase. Each phase should be fully functional before moving to the next.

Legend: `[ ]` = todo, `[x]` = done, `[-]` = deferred/blocked

---

## Phase 0 — Project Setup

- [ ] Initialise Vite + React + TypeScript project
- [ ] Set up Tailwind CSS
- [ ] Set up Express server with TypeScript (ts-node / tsx)
- [ ] Set up Socket.io (server + client)
- [ ] Configure ESLint + Prettier
- [ ] Configure Vitest
- [ ] Set up `concurrently` to run Vite + Express together (`npm run dev`)
- [ ] Create `.env.example` with all required variables
- [ ] Define master config schema in `src/types/config.ts`
- [ ] Define socket event types in `src/types/events.ts`
- [ ] Create `config.json.example`
- [ ] Set up config read/write API endpoints (`GET /api/config`, `POST /api/config`)
- [ ] Create GitHub repository and push initial commit

---

## Phase 1 — Wheel Rendering Engine

- [ ] `src/wheel/renderer.ts` — draw wheel from config (Canvas 2D)
  - [ ] Segment arcs with configurable fill colours
  - [ ] Segment border/stroke
  - [ ] Segment labels (font, size, colour, truncation)
  - [ ] Centre circle / hub
  - [ ] Gradient fills per segment
  - [ ] Glow / shadow effects
- [ ] `src/wheel/physics.ts` — spin animation
  - [ ] Configurable duration (min/max random range)
  - [ ] Easing function (ease-out cubic, customisable)
  - [ ] Configurable number of full rotations
  - [ ] Bounce/overshoot effect (optional)
  - [ ] Result calculation (which segment lands under pointer)
  - [ ] Weighted segment support (probability weighting)
- [ ] Pointer system
  - [ ] Pointer position enum (top/right/bottom/left)
  - [ ] Built-in SVG pointer presets: Arrow, Pin, Triangle, Gem, Hand
  - [ ] Custom image pointer (PNG/JPG upload → base64 stored in config)
  - [ ] Pointer scale and offset controls
- [ ] Standalone OBS overlay page (`/wheel`)
  - [ ] Loads config from server
  - [ ] Connects to Socket.io
  - [ ] Renders wheel, listens for `spin` events
  - [ ] Transparent background CSS
  - [ ] Win overlay / result display (configurable)

---

## Phase 2 — Editor UI

- [ ] Layout: sidebar (settings panels) + main canvas preview area
- [ ] **Segments Panel**
  - [ ] Add / remove / reorder segments (drag and drop)
  - [ ] Per-segment: label, colour, weight, enabled toggle
  - [ ] Bulk import (comma-separated or newline list)
  - [ ] "Remove winner" mode toggle (removes winning segment after spin)
- [ ] **Appearance Panel**
  - [ ] Background colour / transparency
  - [ ] Wheel border width + colour
  - [ ] Global font selector (system fonts + Google Fonts picker)
  - [ ] Per-segment font override
  - [ ] Label size + bold/italic
  - [ ] Glow intensity + colour
  - [ ] Shadow toggle
  - [ ] Hub size + colour
- [ ] **Pointer Panel**
  - [ ] Preset selector (visual grid of pointer options)
  - [ ] Upload custom image (PNG/JPG, max 512×512)
  - [ ] Position selector (top/right/bottom/left)
  - [ ] Scale slider
  - [ ] Colour tint for SVG presets
- [ ] **Spin Settings Panel**
  - [ ] Min / max spin duration sliders
  - [ ] Rotations (min/max random range)
  - [ ] Bounce toggle + intensity
  - [ ] Sound: spin start audio (upload or preset)
  - [ ] Sound: win audio (upload or preset)
  - [ ] Volume control
- [ ] **Result Display Panel**
  - [ ] Win overlay: show/hide, duration
  - [ ] Win message template (`{winner}` placeholder)
  - [ ] Win overlay background colour + opacity
  - [ ] Win overlay font + size + colour
- [ ] Config auto-save (debounced) and manual save button
- [ ] Live preview — canvas updates in real time as settings change
- [ ] "Test Spin" button in editor
- [ ] Config import / export (download/upload JSON)

---

## Phase 3 — Platform Integrations

### Twitch
- [ ] OAuth flow for bot account (Authorization Code, server-side)
  - [ ] `/auth/twitch` redirect endpoint
  - [ ] Token storage in config (never in browser)
  - [ ] Token refresh logic
- [ ] `src/integrations/twitch/chat.ts` — TMI.js IRC connection
  - [ ] Connect to channel on config load
  - [ ] Parse commands (`!spin`, `!addslice`, etc.)
  - [ ] Configurable command prefix
  - [ ] Cooldown per user (configurable seconds)
  - [ ] Moderator-only commands
  - [ ] Bot response messages (configurable)
- [ ] `src/integrations/twitch/eventsub.ts` — Channel Points
  - [ ] WebSocket EventSub connection (no server required)
  - [ ] Channel Point reward redemption → spin trigger
  - [ ] Configurable reward ID (paste in editor)
  - [ ] Auto-fulfil redemption on spin complete
- [ ] Twitch settings panel in Editor
  - [ ] Connect / disconnect button
  - [ ] Channel name input
  - [ ] Bot account input
  - [ ] Command configuration (name, enabled, cooldown, response)
  - [ ] Channel Points reward ID input

### Kick
- [ ] `src/integrations/kick/chat.ts` — Pusher WebSocket
  - [ ] Connect to channel chat via Pusher client
  - [ ] Parse chat messages for commands
  - [ ] Same command interface as Twitch module
- [ ] Kick auth (read-only chat requires channel slug only — no OAuth needed for reading)
- [ ] Kick settings panel in Editor
  - [ ] Channel slug input
  - [ ] Connect / disconnect button
  - [ ] Command configuration

### Manual / Webhook
- [ ] `POST /api/trigger` endpoint with shared secret auth
- [ ] Webhook secret configuration in Editor
- [ ] "Spin Now" button in Editor (manual trigger)
- [ ] Stream Deck plugin notes in docs

---

## Phase 4 — Polish & Distribution

- [ ] Error states in UI (disconnected, auth failed, etc.)
- [ ] Connection status indicators in Editor (green/amber/red dot)
- [ ] Dark mode Editor UI
- [ ] Keyboard shortcuts (`Space` = spin, etc.)
- [ ] OBS Browser Source setup guide in app (copy URL button)
- [ ] Spin queue system (multiple pending spins execute in order)
- [ ] Multi-wheel support (saved presets, switch between wheels)
- [ ] Electron wrapper for single-executable distribution
- [ ] Auto-updater (Electron)
- [ ] Installer (Windows NSIS, Mac DMG)
- [ ] Streamlabs/StreamElements chatbot integration docs

---

## Backlog / Future

- [ ] OnlyFans integration (blocked — awaiting official API)
- [ ] TikTok Live integration
- [ ] YouTube Live integration
- [ ] Mobile companion app (trigger wheel from phone)
- [ ] Cloud config sync (opt-in)
- [ ] Viewer-submitted entries queue (viewers add their own name)
- [ ] Confetti / particle effects on win
- [ ] Animated wheel segments (GIF/video fills)
- [ ] Second screen mode (fullscreen result display)
- [ ] API for third-party extensions

---

## Known Blockers

| Item | Blocker | Notes |
|---|---|---|
| OnlyFans integration | No public streaming/chat API | Manual webhook is the workaround |
| Kick OAuth | No official OAuth bot API as of Q1 2026 | Read-only via Pusher is possible |
| Electron packaging | Phase 4 scope | Don't implement during Phase 1-3 |
