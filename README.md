# StreamSpin — Customisable Stream Overlay Spin Wheel

A fully customisable, browser-source-ready spin wheel for live streamers on Twitch, Kick, and OnlyFans. Chat commands, channel point redemptions, and viewer interactions can all trigger the wheel — live, in your OBS/Streamlabs scene.

---

## Features

### Wheel Designer
- Add, remove, reorder, and weight segments
- Per-segment colour picker with gradient support
- Global and per-segment font selection (system fonts + Google Fonts)
- Border, shadow, and glow effects
- Spin physics tuning (duration, easing, bounce)
- Sound effects on spin start and result

### Pointer / Indicator
- Built-in pointer presets (arrow, pin, triangle, gem, etc.)
- Import your own PNG/JPG pointer image
- Adjustable pointer position (top, right, bottom, left) and scale

### Platform Integrations
| Platform   | Chat Commands | Channel Points | Tips/Events |
|------------|:---:|:---:|:---:|
| Twitch     | ✅  | ✅  | ✅ (via EventSub) |
| Kick       | ✅  | —   | Planned |
| OnlyFans   | Manual / webhook | — | Planned |

### OBS / Streamlabs Ready
- Served via local HTTP server — paste `http://localhost:3000/wheel` as a Browser Source
- Zero-latency WebSocket bridge between chat bot and overlay
- Transparent background by default

---

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org) v20+
- A Twitch/Kick account with broadcaster or editor permissions
- OBS Studio or Streamlabs (any version with Browser Source)

### Install

```bash
git clone https://github.com/YOUR_USERNAME/streamspin.git
cd streamspin
npm install
```

### Configure

```bash
cp .env.example .env
# Edit .env with your platform credentials
```

### Run

```bash
npm run dev
```

Open `http://localhost:3000` to access the **Editor** UI.  
Add `http://localhost:3000/wheel` as a **Browser Source** in OBS (1920×1080, transparent background).

---

## Architecture Overview

```
streamspin/
├── src/
│   ├── app/              # Editor UI (React + Vite)
│   ├── wheel/            # Wheel rendering engine (Canvas)
│   ├── integrations/     # Platform chat connectors
│   │   ├── twitch/       # IRC + EventSub
│   │   ├── kick/         # Pusher WebSocket
│   │   └── manual/       # Webhook / HTTP trigger
│   └── server/           # Express + Socket.io backend
├── public/
│   ├── assets/
│   │   ├── pointers/     # Built-in pointer SVGs
│   │   └── sounds/       # Spin/win audio
│   └── wheel.html        # OBS Browser Source entry
├── docs/
│   ├── ARCHITECTURE.md
│   └── INTEGRATIONS.md
├── .env.example
├── CLAUDE.md
├── TODO.md
└── README.md
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full technical details.  
See [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) for platform setup guides.

---

## Usage

### Chat Commands (Twitch / Kick)

| Command | Who | Effect |
|---|---|---|
| `!spin` | Viewer (if enabled) | Triggers a spin |
| `!spin <entry>` | Viewer | Adds entry to queue and spins |
| `!addslice <label>` | Moderator+ | Adds a segment live |
| `!removeslice <label>` | Moderator+ | Removes a segment |
| `!wheel reset` | Broadcaster | Resets all segments |

Commands are fully configurable in the Editor.

### Channel Points (Twitch)
Create a custom Channel Point reward named anything you like, then paste its Reward ID into the Editor. Redemptions auto-trigger a spin.

### Manual / Webhook
POST to `http://localhost:3000/api/trigger` to spin from any external tool:

```bash
curl -X POST http://localhost:3000/api/trigger \
  -H "Content-Type: application/json" \
  -d '{"secret": "YOUR_WEBHOOK_SECRET"}'
```

---

## Roadmap

See [TODO.md](TODO.md) for the full task breakdown.

---

## Contributing

PRs welcome. Please read [CLAUDE.md](CLAUDE.md) for development conventions if using AI-assisted coding.

---

## Licence

MIT
