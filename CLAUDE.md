# CLAUDE.md — StreamSpin Development Guide

This file is the canonical source of truth for AI-assisted development on this project. Read it before making any changes.

---

## Project Identity

**StreamSpin** is a local-first, browser-source-ready spin wheel for streamers. It runs as a local Node.js server. The Editor UI and the wheel overlay are two separate pages served by the same server. A WebSocket layer bridges chat events to the overlay in real time.

---

## Tech Stack (Decisions Made)

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | React 18 + Vite | Fast HMR, familiar ecosystem |
| Wheel rendering | HTML5 Canvas (custom) | Full control over animation, no bloat |
| Styling | Tailwind CSS | Utility-first, no fighting CSS modules |
| Backend | Express + Socket.io | Simple, battle-tested, native WS |
| Twitch chat | `tmi.js` | De-facto standard for Twitch IRC |
| Twitch EventSub | Native fetch + WS | No extra SDK needed |
| Kick chat | Pusher JS client | Kick uses Pusher under the hood |
| State persistence | JSON config file (local) | No DB dependency for a local tool |
| Packaging | `pkg` or Electron (later) | Distribute as single executable |

Do **not** introduce new major dependencies without a clear reason. This is a local tool — keep it lean.

---

## Project Structure

```
src/
  app/              React editor UI
  wheel/            Pure Canvas rendering, no React
  integrations/     One file per platform
  server/           Express app, Socket.io, REST API
public/
  assets/pointers/  SVG pointer presets
  assets/sounds/    WAV/OGG audio
docs/               Architecture + integration guides
```

The wheel renderer (`src/wheel/`) must remain framework-agnostic — it takes a config object and a canvas element. This means it can be used both in the React editor (preview) and in the standalone OBS overlay page.

---

## Coding Conventions

- **TypeScript throughout** — no plain JS files in `src/`
- Functional React components only, no class components
- No `any` types without a comment explaining why
- Config schema lives in `src/types/config.ts` — the single source of truth for all wheel/platform settings
- Integration modules export a single `connect(config, onEvent)` function and a `disconnect()` function — nothing else
- Server-side socket events are typed in `src/types/events.ts`
- All user-facing strings are in `src/constants/strings.ts` (prep for i18n)

---

## What NOT to Do

- Do not store OAuth tokens in the browser (localStorage/cookies). Tokens go in `.env` or the local config file, managed server-side.
- Do not make the wheel renderer depend on React. It must work in a plain `<script>` context for the OBS overlay page.
- Do not add a database. Config persists as `config.json` in the project root. Segment lists, colours, and credentials all live there.
- Do not break the separation between Editor (port 3000/) and Overlay (port 3000/wheel). They communicate only via Socket.io.
- Do not auto-commit or push. Always confirm with the user before any git operations.
- Do not co-author commits — commits are attributed to the user only.

---

## Key Files

| File | Purpose |
|---|---|
| `src/types/config.ts` | Master config type — touch this first when adding features |
| `src/wheel/renderer.ts` | Canvas rendering engine |
| `src/wheel/physics.ts` | Spin easing, duration, bounce calculations |
| `src/server/index.ts` | Express entry point |
| `src/server/socketBridge.ts` | Translates chat events → socket.io → overlay |
| `src/integrations/twitch/index.ts` | Twitch TMI + EventSub |
| `src/integrations/kick/index.ts` | Kick Pusher client |
| `config.json` | Runtime config (gitignored except `.example`) |
| `.env` | Secrets/tokens (never committed) |

---

## Running Locally

```bash
npm run dev        # Start server + Vite dev server concurrently
npm run build      # Production build
npm run typecheck  # Run tsc --noEmit
npm run lint       # ESLint
```

---

## Testing Strategy

- Unit tests for the wheel physics and config parsing (Vitest)
- Integration tests for the socket bridge with a mock chat event
- No tests required for the Canvas renderer (visual — test manually)
- Platform integration modules are tested against sandbox/test accounts only

---

## Environment Variables

See `.env.example` for the full list. Never hardcode credentials. Never commit `.env`.

---

## Deployment Notes

This is a **local tool**. There is no cloud deployment. Distribution will eventually be via a packaged Electron app or `pkg` binary. The server always binds to `localhost` only.

---

## Future Considerations (Don't Implement Yet)

- Multi-wheel support (tracked in TODO.md Phase 4)
- Cloud config sync
- Mobile companion app for manual trigger
- OnlyFans native API (blocked on platform providing one)
