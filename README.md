# StreamSpin — Customisable Stream Overlay Spin Wheel

A fully customisable, browser-source-ready spin wheel for live streamers on Twitch, Kick, and OnlyFans. Runs entirely on your own machine — no cloud, no subscription, no latency.

---

## Features

### Wheel Designer
- Add, remove, reorder, and weight segments
- Per-segment colour picker (16-colour palette + full hex)
- Global font selector — Inter, Oswald, Bebas Neue, Bangers, Poppins, Nunito, and more
- Border, hub, glow, and shadow controls
- Spin physics tuning: duration range, rotation count, easing curve, bounce effect
- Audio: upload custom spin-start and win sounds with per-sound volume

### Pointer / Indicator
- Five built-in presets drawn with real canvas previews: Arrow, Triangle, Pin, Gem, Hand
- Import your own PNG/JPG pointer image (auto-resized)
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

### Platform Integrations
| Platform | Chat Commands | Channel Points | Trigger Method |
|---|:---:|:---:|---|
| Twitch | Phase 3 | Phase 3 | Webhook, manual |
| Kick | Via Botrix | — | Botrix → webhook |
| OnlyFans | — | — | Manual / Stream Deck |

### OBS / Streamlabs Ready
- Paste `http://localhost:3000/wheel` as a Browser Source (1920×1080, transparent background)
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

## Directory Structure

```
streamspin/
├── index.html              ← Vite entry: editor app
├── overlay.html            ← Vite entry: OBS overlay
├── src/
│   ├── app/                React editor UI
│   │   ├── components/
│   │   │   ├── panels/     Settings panels (Segments, Appearance, Pointer, Spin, Result)
│   │   │   ├── ui/         Reusable primitives (Slider, Toggle, ColorInput, …)
│   │   │   ├── PresetManager.tsx
│   │   │   └── WheelPreview.tsx
│   │   └── lib/            configApi, constants
│   ├── wheel/              Pure Canvas renderer — no React dependency
│   │   ├── renderer.ts
│   │   ├── physics.ts
│   │   └── pointers.ts
│   ├── overlay/            OBS overlay entry (vanilla TS)
│   ├── server/             Express + Socket.io backend
│   │   ├── routes/         config, trigger, presets, auth
│   │   ├── configStore.ts
│   │   ├── presetsStore.ts
│   │   └── socketBridge.ts
│   └── types/              Shared TypeScript types
│       ├── config.ts       Master WheelConfig schema
│       └── events.ts       Socket.io event maps
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

## Twitch Integration (Phase 3)

Full Twitch integration is coming in Phase 3. The OAuth stub is already in place at `/auth/twitch`. Once complete:

| Command | Who | Effect |
|---|---|---|
| `!spin` | Viewer (if enabled) | Triggers a spin |
| `!addslice <label>` | Moderator+ | Adds a segment live |
| `!removeslice <label>` | Moderator+ | Removes a segment |

Channel Points redemptions will auto-trigger a spin when a configured reward is redeemed.

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

## Roadmap

See [TODO.md](TODO.md) for the full phased task breakdown.

---

## Contributing

PRs welcome. Please read [CLAUDE.md](CLAUDE.md) for development conventions if using AI-assisted coding.

---

## Licence

MIT
