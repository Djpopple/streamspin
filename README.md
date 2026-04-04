# StreamSpin — Customisable Stream Overlay Spin Wheel

A fully customisable, browser-source-ready spin wheel for live streamers on Twitch, Kick, and more. Runs entirely on your own machine — no cloud, no subscription, no latency.

---

## Features

### Wheel Designer
- Add, remove, reorder (drag-and-drop or arrows), and weight segments
- Per-segment colour picker (10-colour palette + full hex input)
- Per-segment advanced options: text colour, gradient fill, font override, label position offset
- Global font selector — 16 fonts including Inter, Bebas Neue, Bangers, Times New Roman, Ravie, Bradley Hand ITC, and more
- Bold / italic label style toggles
- Border, hub, glow, drop shadow, and background colour controls
- Frame ring width control (reserves space for artist frame overlays)
- Frame overlay upload — drop a transparent PNG designed by your artist on top of the wheel

### Pointer / Indicator
- Five built-in presets drawn with real canvas previews: Arrow, Triangle, Pin, Gem, Hand
- Import your own PNG/JPG pointer image (auto-resized to 256px)
- Custom pointer rotation: snap buttons (−90°, −45°, +45°, +90°) + full 360° slider
- Position: top, right, bottom, left
- Scale and colour tint controls

### Multiple Wheel Presets
- Save unlimited named wheel configurations
- Switch between wheels instantly — OBS overlay updates live
- Timestamps show when each preset was last saved
- Update or delete individual presets

### Result Overlay
- Configurable win message with `{winner}` placeholder
- Background colour, opacity, font, size, and text colour
- Adjustable display duration
- Pop-in animation — shown in both the editor preview and the OBS overlay

### Platform Integrations

| Platform | Chat Commands | Channel Points | Trigger Method |
|---|:---:|:---:|---|
| Twitch | ✅ | ✅ | Chat, Channel Points, Webhook |
| Kick | Via Botrix | — | Botrix → Webhook |
| Any tool | — | — | `POST /api/trigger` |

### OBS / Streamlabs Ready
- Paste `http://localhost:3000/wheel` as a Browser Source (any size, transparent background)
- Config changes push live to the overlay via WebSocket — no refresh needed
- Spin queue handles multiple simultaneous triggers

### Webhook / Stream Deck
Any tool that can make an HTTP POST can fire the wheel:
```bash
curl -X POST http://localhost:3000/api/trigger \
  -H "Content-Type: application/json" \
  -d '{"secret": "YOUR_WEBHOOK_SECRET"}'
```
Stream Deck users: install the **Web Requests** plugin and point a button at this endpoint.

---

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org) v20+
- OBS Studio or Streamlabs (any version with Browser Source)

### Install

```bash
git clone https://github.com/Djpopple/streamspin.git
cd streamspin
npm install
```

### Configure

```bash
cp .env.example .env
# Minimum: set WEBHOOK_SECRET to a random string
# Twitch credentials go here too — see .env.example
```

### Run

```bash
npm run dev
```

| URL | Purpose |
|---|---|
| `http://localhost:5173` | Editor UI |
| `http://localhost:3000/wheel` | OBS Browser Source (always this URL) |

---

## Frame Artwork Spec

For artists creating frame overlays or custom pointers:

**Frame overlay PNG:**
- Square canvas at your target resolution (e.g. 800×800px)
- Transparent centre — the wheel renders behind the frame
- Design vines, cogs, borders etc. in the outer ring
- Use "Frame ring width" in Appearance to control how much space the ring gets (default 56px, up to 160px)
- Export as PNG with alpha

**Custom pointer PNG:**
- 64×64px recommended (auto-resized on import)
- Tip pointing **right** (3 o'clock) — StreamSpin rotates it to the correct position
- Use the rotation controls in the Pointer panel to fine-tune

---

## Directory Structure

```
streamspin/
├── index.html              ← Vite entry: editor app
├── overlay.html            ← Vite entry: OBS overlay
├── src/
│   ├── app/                React editor UI
│   │   ├── components/
│   │   │   ├── panels/     Settings panels (Segments, Appearance, Pointer, Spin, Result, Integrations)
│   │   │   ├── ui/         Reusable primitives (Slider, Toggle, ColorInput, Select, …)
│   │   │   ├── PresetManager.tsx
│   │   │   └── WheelPreview.tsx
│   │   └── lib/            configApi, constants
│   ├── wheel/              Pure Canvas renderer — no React dependency
│   │   ├── renderer.ts     renderFrame + frame/pointer image caches
│   │   ├── physics.ts      Spin animation, winner detection, easing
│   │   └── pointers.ts     Five canvas-drawn pointer presets
│   ├── overlay/            OBS overlay entry (vanilla TS)
│   ├── server/             Express + Socket.io backend
│   │   ├── routes/         config, trigger, presets, auth
│   │   ├── configStore.ts  Atomic config.json read/write + migration
│   │   ├── migration.ts    Schema migration for old configs
│   │   ├── presetsStore.ts Atomic presets.json read/write
│   │   ├── socketBridge.ts Spin queue + event routing
│   │   ├── tokenStore.ts   Twitch token storage + auto-refresh
│   │   └── integrationManager.ts  Twitch chat + EventSub lifecycle
│   ├── integrations/
│   │   └── twitch/         chat.ts + eventsub.ts
│   └── types/              Shared TypeScript types
│       ├── config.ts       Master WheelConfig schema + DEFAULT_CONFIG
│       └── events.ts       Socket.io event maps
├── public/
│   └── assets/fonts/       Drop custom font files here (.ttf / .woff2)
├── docs/
│   ├── ARCHITECTURE.md
│   └── INTEGRATIONS.md
├── .env.example
├── CLAUDE.md
└── TODO.md
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full technical details.
See [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) for platform setup guides.

---

## Twitch Integration

1. Fill in your channel name and bot username in the Integrations panel
2. Click **Connect to Twitch** — browser opens for OAuth
3. Approve access, browser auto-closes, status turns green

| Command | Who | Effect |
|---|---|---|
| `!spin` | Viewer (if enabled) | Triggers a spin |
| `!addslice <label>` | Moderator+ | Adds a segment live |
| `!removeslice <label>` | Moderator+ | Removes a segment |

Channel Points redemptions auto-trigger a spin when a configured reward is redeemed.

## Kick Integration

Kick has no public bot API. The recommended approach is **Botrix**:
1. Install [Botrix](https://botrix.live) and connect it to your Kick channel
2. Create a `!spin` command with this custom JS:
```javascript
fetch('http://localhost:3000/api/trigger', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ secret: 'YOUR_WEBHOOK_SECRET' })
});
```

See [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) for full details.

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Test spin (when not focused on a text input) |

---

## Roadmap

See [TODO.md](TODO.md) for the full phased task breakdown. Phases 0–4 are complete. Phase 5 is Electron packaging.

---

## Contributing

PRs welcome. Please read [CLAUDE.md](CLAUDE.md) for development conventions if using AI-assisted coding.

---

## Licence

MIT
