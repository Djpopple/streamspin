# StreamSpin — Customisable Stream Overlay Spin Wheel

A fully customisable, browser-source-ready spin wheel for live streamers on Twitch, Kick, and more. Runs entirely on your own machine — no cloud, no subscription, no latency.

---

## Features

### Wheel Designer
- Add, remove, drag-and-drop reorder, and weight segments
- Per-segment colour picker (10-colour palette + full hex input)
- Per-segment advanced options: text colour, gradient fill, font override, label position offset
- Smart label sizing — all labels sit at the same radius; font scales automatically so wide segments get bigger text and narrow segments get smaller text, everything stays inside the wheel
- Global font selector — 17 fonts including Inter, Bebas Neue, Bangers, Times New Roman, Ravie, Bradley Hand ITC, CC Zoinks, and more
- Bold / italic label style toggles
- Border, hub, glow, drop shadow, and background colour controls
- Frame ring width control (reserves space for artist frame overlays)
- Frame overlay upload — drop a transparent PNG designed by your artist on top of the wheel

### Pointer / Indicator
- Five built-in presets: Arrow, Triangle, Pin, Gem, Hand (live canvas previews)
- Import your own PNG/JPG pointer image (auto-resized to 256px)
- Custom pointer rotation: snap buttons (−90°, −45°, +45°, +90°) + full 360° slider
- Position: top, right, bottom, left
- Scale and colour tint controls

### Multiple Wheel Presets
- Save unlimited named wheel configurations
- Switch between wheels instantly — OBS overlay updates live
- Active preset remembered across page reloads (no accidental duplicates)
- Timestamps show when each preset was last saved

### Win History
- Every spin result is recorded — label, colour swatch, timestamp, and who triggered it (Twitch username, webhook, etc.)
- Persists across restarts (`history.json`, capped at 200 entries)
- Live updates in the editor as spins complete — no refresh needed
- Hover any row to reveal **edit** (✎) and **remove** (✕) actions
  - Edit: correct the prize label or viewer name inline, Enter to save
  - Remove: mark the prize as claimed and remove it from the list
- Clear all button to reset history

### Result Overlay
- Configurable win message with `{winner}` placeholder
- Background colour, opacity, font, size, and text colour
- Adjustable display duration
- Pop-in animation shown in both the editor preview and the OBS overlay

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

### Clean Restart
Press `Ctrl+C` in the terminal then run `npm run dev` again. Config is re-read and migrated on every startup.

---

## Themed Preset Files

Ready-to-import wheel configs live in the [`presets/`](presets/) folder. Import any via the **Import** button in the editor header.

| File | Palette | Font | Vibe |
|---|---|---|---|
| `halloween.json` | Orange / purple / black | Bebas Neue | Spooky glow, orange border |
| `goth.json` | Deep purples / crimson / black | Bebas Neue | Slow moody spin, purple glow |
| `cutesy.json` | Pinks / pastels / lavender | Nunito Bold | Bouncy, soft glow |
| `cottage-core.json` | Sage / honey / dusty rose | Georgia Italic | Gentle bounce, earthy |
| `christmas.json` | Red / green / gold | Bebas Neue | Gold glow, festive bounce |

All have placeholder segment labels — swap them for your prizes and hit **Update**.

---

## Frame Artwork Spec

For artists creating frame overlays or custom pointers:

**Frame overlay PNG:**
- Square canvas at your target resolution (e.g. 800×800px)
- Transparent centre — the wheel renders behind the frame
- Design vines, cogs, borders etc. in the outer ring
- Use "Frame ring width" in Appearance to control ring size (default 56px, up to 160px)
- Export as PNG with alpha

**Custom pointer PNG:**
- 64×64px recommended (auto-resized on import)
- Tip pointing **right** (3 o'clock) — StreamSpin rotates it to the correct position
- Use the rotation controls in the Pointer panel to fine-tune

Drop font files (`.ttf` / `.woff2`) into [`public/assets/fonts/`](public/assets/fonts/) and ask Claude to wire up the `@font-face` rule.

---

## Directory Structure

```
streamspin/
├── index.html              ← Vite entry: editor app
├── overlay.html            ← Vite entry: OBS overlay
├── presets/                ← Ready-to-import themed wheel configs
├── public/
│   └── assets/fonts/       ← Drop custom font files here
├── src/
│   ├── app/                React editor UI
│   │   ├── components/
│   │   │   ├── panels/     Segments, Appearance, Pointer, Spin, Result, Integrations
│   │   │   ├── ui/         Slider, Toggle, ColorInput, Select, Panel, …
│   │   │   ├── PresetManager.tsx
│   │   │   └── WheelPreview.tsx
│   │   └── lib/            configApi, constants
│   ├── wheel/              Pure Canvas renderer — no React dependency
│   │   ├── renderer.ts     renderFrame, smart label sizing, frame/pointer caches
│   │   ├── physics.ts      Spin animation, winner detection, easing
│   │   └── pointers.ts     Five canvas-drawn pointer presets
│   ├── overlay/            OBS overlay entry (vanilla TS)
│   ├── server/             Express + Socket.io backend
│   │   ├── routes/         config, trigger, presets, auth
│   │   ├── configStore.ts  Atomic config.json read/write
│   │   ├── migration.ts    Schema migration — runs on every config read + preset load + import
│   │   ├── presetsStore.ts Atomic presets.json read/write
│   │   ├── socketBridge.ts Spin queue + event routing
│   │   ├── tokenStore.ts   Twitch OAuth token storage + auto-refresh
│   │   └── integrationManager.ts  Twitch chat + EventSub lifecycle
│   ├── integrations/
│   │   └── twitch/         chat.ts (tmi.js) + eventsub.ts (native WS)
│   └── types/
│       ├── config.ts       Master WheelConfig schema + DEFAULT_CONFIG
│       └── events.ts       Socket.io event maps
├── docs/
│   ├── ARCHITECTURE.md
│   └── INTEGRATIONS.md
├── .env.example
├── CLAUDE.md
└── TODO.md
```

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

Kick has no public bot API. Use **Botrix**:
1. Install [Botrix](https://botrix.live) and connect it to your Kick channel
2. Create a `!spin` command with this custom JS:
```javascript
fetch('http://localhost:3000/api/trigger', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ secret: 'YOUR_WEBHOOK_SECRET' })
});
```

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Test spin (when not focused on a text input) |

---

## Roadmap

Phases 0–4 complete including win history. Next: Phase 5 — Electron packaging into a single `.exe`.

See [TODO.md](TODO.md) for the full breakdown.

---

## Contributing

PRs welcome. Please read [CLAUDE.md](CLAUDE.md) for development conventions if using AI-assisted coding.

---

## Licence

MIT
