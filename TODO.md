# TODO — StreamSpin

Legend: `[x]` = done, `[ ]` = todo, `[-]` = deferred / won't do this phase

---

## Phase 0 — Project Setup ✅
- [x] Vite + React + TypeScript + Tailwind
- [x] Express + Socket.io server (tsx watch)
- [x] ESLint, Vitest, concurrently dev script
- [x] Master config schema (`src/types/config.ts`) + `DEFAULT_CONFIG`
- [x] Socket event types (`src/types/events.ts`)
- [x] Config REST API (`GET/POST /api/config`)
- [x] GitHub repository

---

## Phase 1 — Wheel Rendering Engine ✅
- [x] Pure `renderFrame(ctx, config, layout, rotation)` — no framework deps
- [x] Segment arcs, per-segment gradient fills, inner border strokes
- [x] Smart label sizing — all labels equidistant from centre, font auto-scales to fill arc without overflow
- [x] Bold / italic label style toggles
- [x] Per-segment label position offset (manual override on top of auto sizing)
- [x] Hub with sheen gradient
- [x] Glow effect, drop shadow, configurable background colour
- [x] Frame overlay (artist PNG rendered on top of wheel)
- [x] Configurable frame ring width (space for artwork)
- [x] Top-level ctx.save/restore guard — bad transforms can't leak between frames
- [x] Spin physics: duration/rotation ranges, three easings, bounce, weighted winner
- [x] Five canvas-drawn pointer presets (Arrow, Triangle, Pin, Gem, Hand)
- [x] Custom image pointer + rotation controls
- [x] OBS overlay (`overlay.html`) — rAF loop, result overlay, audio, Socket.io
- [x] WheelPreview in editor — result overlay shown after test spin

---

## Phase 2 — Editor UI ✅
- [x] Collapsible sidebar panels (all collapsed by default)
- [x] 420px sidebar, slim custom scrollbar, no phantom page scroll
- [x] Disconnect and save-error banners
- [x] Space bar shortcut triggers test spin
- [x] Active preset persisted in localStorage (no accidental duplicates on reload)
- [x] **Segments Panel**
  - [x] Add / delete / drag-and-drop reorder / up-down arrows
  - [x] Label, colour (palette + hex), weight, enabled toggle
  - [x] Expandable advanced options: text colour, gradient, font override, label position
  - [x] Bulk import (newline or comma-separated)
  - [x] Remove-winner mode
- [x] **Appearance Panel**
  - [x] Background (transparent / solid colour)
  - [x] Border width + colour, hub size + colour
  - [x] 17-font global selector + bold/italic toggles
  - [x] Glow, drop shadow, frame ring width, frame overlay upload
- [x] **Pointer Panel** — presets, custom upload, rotation, position, scale, tint
- [x] **Spin & Sound Panel** — duration, rotations, easing, bounce, audio upload + volume
- [x] **Result Overlay Panel** — message template, colours, font, duration, live preview
- [x] 400ms debounced auto-save → config.json + overlay push
- [x] Config import / export (JSON) — import routes through server for migration
- [x] **Named wheel presets** — save, load, update, delete, timestamps

---

## Phase 3 — Platform Integrations ✅
- [x] Twitch OAuth (Authorization Code, server-side, auto-refresh)
- [x] Twitch chat via tmi.js — !spin, !addslice, !removeslice, per-user cooldowns, mod gates
- [x] Twitch EventSub — Channel Points, native WebSocket, auto-fulfil
- [x] Integrations panel — connect/disconnect, status, chat feed, command config
- [x] Kick via Botrix bridge — step-by-step guide in panel
- [x] `POST /api/trigger` webhook with secret auth (Stream Deck / any HTTP tool)

---

## Phase 4 — Polish ✅
- [x] Smart label auto-sizing (equidistant, chord + radial geometry)
- [x] Config migration runs on every entry point: startup, preset load, file import
- [x] Themed preset files: halloween, goth, cutesy, cottage-core, christmas
- [x] Toggle direction fix, colour picker fix, result overlay in editor
- [x] Page scroll fix (overflow hidden on html/body/#root + h-screen on root)
- [x] All panels collapsed by default
- [x] Active preset persisted across reloads via localStorage

---

## Phase 4b — Quality of Life ✅
- [x] **Win History panel** — records every spin result with label, colour swatch, timestamp, triggered-by
  - [x] Persisted to `history.json` (gitignored, capped at 200 entries)
  - [x] Live updates via socket — no refresh needed
  - [x] Per-row remove (mark as claimed) with hover-reveal ✕ button
  - [x] Inline edit — click ✎ to correct label or viewer name, Enter to save, Escape to cancel
  - [x] Clear all button
  - [x] REST API: `GET/DELETE /api/history`, `DELETE /api/history/:id`, `PATCH /api/history/:id`

---

## Phase 4c — Segment Images + Reveal ✅
- [x] **Segment image system** — one image fills the whole wheel circle; segments act as windows into it
  - [x] Mode selector: None / All / Alternating / Manual / Reveal
  - [x] Image opacity slider (how strongly the image shows through)
  - [x] Text readability overlay slider (dark veil over image segments so labels stay legible)
  - [x] Per-segment `showImage` toggle visible in Manual and Reveal modes
  - [x] Upload any image format; stored as data URL like frame overlay
- [x] **Reveal mode** — segments start solid; each winning segment permanently reveals its slice of the image
  - [x] Server-side: `spin-complete` flips `showImage = true`, saves config, broadcasts update
  - [x] Progress persists across restarts (saved in config.json)
  - [x] Reset Reveals button wipes all segments back to solid
- [x] **Spin queue timing split**
  - [x] `spin-complete` fires immediately when wheel stops (triggers win recording + reveal)
  - [x] `spin-done` fires after result overlay + linger (releases queue for next spin)
- [x] **Post-result linger** — new slider in Result Overlay panel (0–10s); wheel stays on screen after overlay fades before next spin can start
- [x] 37-font selector with live font preview dropdown (each option rendered in its own typeface)

---

## Phase 5 — Distribution (Next)
- [ ] Electron wrapper — bundle server + editor into single `.exe` / `.dmg`
- [ ] Auto-updater (Electron)
- [ ] Windows NSIS + Mac DMG installers

---

## Backlog / Future
- [ ] Animated segment backgrounds (GIF/video fills)
- [ ] Viewer-submitted entry queue (`!addme`)
- [ ] TikTok / YouTube Live integration
- [ ] Second screen / fullscreen result display
- [ ] Mobile companion app (manual trigger from phone)
- [ ] Cloud preset sync (opt-in)
- [ ] OnlyFans integration (blocked — no public API)
