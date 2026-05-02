# StreamSpin — Test Plan & Sign-off Checklist

Six phases mirror the development phases. Each section lists what to test, how to verify it, and known edge cases. Work through them in order — later phases depend on earlier ones passing.

---

## Phase 0 — Project Setup & Server

### Prerequisites
- Node.js v20+ installed
- `.env` created from `.env.example` with `WEBHOOK_SECRET` set

### Tests

| # | Test | Pass criteria |
|---|---|---|
| 0.1 | `npm run dev` starts without errors | Both Vite (5173) and server (3000) listening, no crash |
| 0.2 | `http://localhost:5173` loads in browser | Editor UI renders, no blank page |
| 0.3 | `http://localhost:3000/wheel` loads in browser | Canvas visible, no JS errors in console |
| 0.4 | `GET http://localhost:3000/api/config` returns JSON | Valid `WheelConfig` shape, 200 response |
| 0.5 | `POST http://localhost:3000/api/config` with valid body saves | Returns 200, `config.json` updated on disk |
| 0.6 | Server binds to `127.0.0.1` only | Confirm `netstat` shows `127.0.0.1:3000`, not `0.0.0.0:3000` |
| 0.7 | `npm run typecheck` exits 0 | No TypeScript errors |
| 0.8 | `npm run lint` exits 0 | No ESLint errors |
| 0.9 | `npm test` exits 0 | All Vitest tests pass |
| 0.10 | `npm run build && npm start` serves correctly | `http://localhost:3000` loads editor, `/wheel` loads overlay |

### Sign-off
- [ ] All 0.x tests pass
- [ ] No console errors on initial load of either page

---

## Phase 1 — Wheel Rendering Engine

### Prerequisites
Phase 0 passed. At least 3 segments added in the editor.

### Tests

**Basic rendering**

| # | Test | Pass criteria |
|---|---|---|
| 1.1 | Wheel renders segments in correct arc proportions | Equal-weight segments fill equal arcs |
| 1.2 | Segment colours match editor palette selections | Canvas colours match input |
| 1.3 | Labels appear inside segments, readable | No overflow beyond rim |
| 1.4 | Hub renders at configured size | Circle visible at centre |
| 1.5 | Border renders at configured width and colour | Ring around wheel visible |
| 1.6 | Background colour (solid) fills canvas | Canvas background matches setting |
| 1.7 | Transparent background shows nothing behind wheel | No fill outside wheel segments |

**Label auto-sizing**

| # | Test | Pass criteria |
|---|---|---|
| 1.8 | Add 2 segments — labels use large font | Wide arc → large text |
| 1.9 | Add 20 segments — all labels still inside rim | Font shrinks, no overflow |
| 1.10 | Long label text on narrow segment | Text shrinks to fit radial space |
| 1.11 | Per-segment `labelRadiusOffset` moves label | Offset label visually offset from default |

**Visual effects**

| # | Test | Pass criteria |
|---|---|---|
| 1.12 | Glow effect enabled | Coloured halo visible around wheel rim |
| 1.13 | Drop shadow enabled | Shadow visible below/beside wheel (test on white background) |
| 1.14 | Per-segment gradient fill | Radial gradient visible from hub to rim |
| 1.15 | Frame overlay uploaded | PNG renders on top of wheel |
| 1.16 | Frame ring scale slider adjusts frame size | Frame grows/shrinks proportionally |
| 1.17 | Wheel padding slider adjusts wheel radius | Wheel shrinks away from canvas edge |

**Pointer**

| # | Test | Pass criteria |
|---|---|---|
| 1.18 | All 5 built-in pointer presets render | Arrow, Triangle, Pin, Gem, Hand — each visible |
| 1.19 | Pointer position: top, right, bottom, left | Pointer moves to correct edge |
| 1.20 | Custom pointer image upload | Image renders at pointer position |
| 1.21 | Custom pointer rotation slider | Image rotates continuously, no snap |
| 1.22 | Pointer scale slider | Pointer grows/shrinks |
| 1.23 | Pointer colour tint | Built-in pointers tinted to chosen colour |

**Spin physics**

| # | Test | Pass criteria |
|---|---|---|
| 1.24 | Press Space — wheel spins and stops on a segment | No infinite spin, stops cleanly |
| 1.25 | Weighted segments — heavy segment wins more often | Over 20 spins, frequency matches weight ratio |
| 1.26 | Bounce easing enabled — wheel overshoots briefly | Visible reverse at end of spin |
| 1.27 | All three easing curves produce different deceleration shapes | Cubic, Quint, Expo feel different |
| 1.28 | Min/max duration slider — long spin takes noticeably longer | Duration roughly matches configured range |

### Sign-off
- [ ] All 1.x tests pass
- [ ] No renderer errors in console during or after spin
- [ ] `renderFrame` try/catch confirmed — introduce a deliberate bad config value and confirm loop continues

---

## Phase 2 — Editor UI

### Prerequisites
Phase 1 passed.

**Segments panel**

| # | Test | Pass criteria |
|---|---|---|
| 2.1 | Add segment — appears on wheel and in list | Label editable |
| 2.2 | Delete segment — removed from wheel | List updates |
| 2.3 | Drag-and-drop reorder via ⠿ handle | Wheel order changes to match list |
| 2.4 | Up/down arrow reorder buttons | Same as drag |
| 2.5 | Segment enabled/disabled toggle | Disabled segment removed from wheel |
| 2.6 | Weight slider — set to 0 and spin | That segment never wins |
| 2.7 | Bulk import (newline-separated) | All entries added as segments |
| 2.8 | Per-segment colour picker — palette colours | Segment updates immediately |
| 2.9 | Per-segment colour picker — hex input | Arbitrary hex accepted |
| 2.10 | Recent colours appear at top of palette after use | Last 6 used colours shown |
| 2.11 | Per-segment text colour | Label colour updates |
| 2.12 | Per-segment font override | That segment's label renders in chosen font |
| 2.13 | Remove winner mode — enabled, spin several times | Each winner disappears from wheel |
| 2.14 | Remove winner mode — last segment standing | App handles gracefully (no crash) |

**Appearance panel**

| # | Test | Pass criteria |
|---|---|---|
| 2.15 | Font selector — switch fonts | All 37 fonts available, each option renders in its own typeface |
| 2.16 | Bold toggle | Labels become bold |
| 2.17 | Italic toggle | Labels become italic |
| 2.18 | Solid background — colour picker | Background updates |
| 2.19 | Transparent background | Background removed |
| 2.20 | Ambient effect: select each of 7 effects | Particles visible, appropriate animation |
| 2.21 | Ambient intensity slider | More/fewer particles clearly visible |
| 2.22 | Ambient scope — "Outside only" | Particles clipped inside wheel radius |
| 2.23 | Ambient scope — "Over wheel" | Particles draw over segments |
| 2.24 | Segment image — upload, mode All | Image visible through every segment |
| 2.25 | Segment image — mode Alternating | Alternating segments show image / solid |
| 2.26 | Segment image — mode Manual | Only manually toggled segments show image |
| 2.27 | Segment image — Image opacity slider | Image becomes more/less opaque |
| 2.28 | Segment image — Darken image slider | Dark veil increases/decreases |
| 2.29 | Segment image — Remove image button | Image cleared, mode resets |

**Spin & sound panel**

| # | Test | Pass criteria |
|---|---|---|
| 2.30 | Upload spin-start audio, spin — sound plays | Audio fires on spin start |
| 2.31 | Upload win audio, spin — sound plays on win | Audio fires when wheel stops |
| 2.32 | Per-segment win sound — upload on one segment | That segment plays its own sound; others play global |
| 2.33 | Volume sliders adjust audio level | Audibly louder/quieter |

**Result overlay panel**

| # | Test | Pass criteria |
|---|---|---|
| 2.34 | Spin — result overlay appears with winner label | `{winner}` replaced with winning segment label |
| 2.35 | Result overlay duration slider | Overlay stays longer / shorter |
| 2.36 | Linger duration slider — set to 3s | Wheel visible for 3s after overlay fades before next spin |
| 2.37 | Result overlay colours, font, font size | Overlay matches settings |
| 2.38 | Result overlay disabled — spin | No overlay appears |

**Presets**

| # | Test | Pass criteria |
|---|---|---|
| 2.39 | Save preset — name field + Save button | Preset appears in list |
| 2.40 | Switch to different preset | Wheel updates to new config |
| 2.41 | Active preset remembered on page reload | Same preset selected after F5 |
| 2.42 | Update preset — change something, click Update | Changes saved |
| 2.43 | Delete preset | Removed from list |
| 2.44 | Dirty indicator on unsaved changes | Indicator appears after editing active preset |
| 2.45 | Switch preset with unsaved changes — confirmation | "You have unsaved changes" prompt |
| 2.46 | Import themed preset JSON | Wheel loads preset config |

**Undo / Redo**

| # | Test | Pass criteria |
|---|---|---|
| 2.47 | Change segment colour — Ctrl+Z | Colour reverts |
| 2.48 | Multiple changes — Ctrl+Z several times | Each step back correct |
| 2.49 | Ctrl+Z then Ctrl+Y | Redo re-applies change |
| 2.50 | Ctrl+Shift+Z | Same as Ctrl+Y |
| 2.51 | Drag slider — Ctrl+Z once | Entire drag is one undo step |
| 2.52 | Undo on initial load | No crash, nothing reverts (no undo state before first edit) |
| 2.53 | Load preset — undo/redo stacks cleared | Ctrl+Z does nothing after preset load |
| 2.54 | Undo/redo disabled buttons when stacks empty | ⟲ greyed when nothing to undo, ⟳ greyed when nothing to redo |

**Header & general UI**

| # | Test | Pass criteria |
|---|---|---|
| 2.55 | Auto-save indicator — "Saving…" / "Saved" | Status changes during and after edit |
| 2.56 | Space bar triggers test spin | Spin fires (when not in text input) |
| 2.57 | Space bar in text input does not spin | No accidental spin while typing |
| 2.58 | Disconnect banner appears when server stops | Red banner visible |
| 2.59 | Export config — downloads JSON | Valid JSON, re-importable |
| 2.60 | Import config — select JSON | Config loads, migration runs |
| 2.61 | OBS URL copy button | Clipboard receives `http://localhost:3000/wheel` |
| 2.62 | Upload any file input — sidebar does NOT jump | No scroll-to-focus when clicking upload labels |
| 2.63 | Sidebar overflows vertically — scrollable | Scroll works, no page scroll |

### Sign-off
- [ ] All 2.x tests pass
- [ ] No console errors during editing
- [ ] No layout breaks when expanding large panels

---

## Phase 3 — Platform Integrations

### Prerequisites
Phase 2 passed. Twitch account + Twitch application credentials available. `.env` populated.

**Twitch OAuth**

| # | Test | Pass criteria |
|---|---|---|
| 3.1 | Click "Connect to Twitch" in Integrations panel | Browser opens Twitch auth page |
| 3.2 | Authorise — tab closes, status turns green | Connected status in editor |
| 3.3 | Restart server — still connected | Tokens persisted, no re-auth needed |
| 3.4 | Token refresh — wait for expiry or force refresh | Connection remains active |

**Twitch chat**

| # | Test | Pass criteria |
|---|---|---|
| 3.5 | Enable chat commands — type `!spin` in Twitch chat | Wheel spins, `triggeredBy` shows Twitch username |
| 3.6 | `!spin` twice quickly — second spin queued | Queue indicator shows 1, second spin fires after first finishes |
| 3.7 | Per-user cooldown — same user types `!spin` twice in 30s | Second command ignored |
| 3.8 | Subscriber-only mode — non-sub types `!spin` | Command ignored |
| 3.9 | Mod `!addslice PrizeX` — segment added | New segment appears on wheel live |
| 3.10 | Mod `!removeslice PrizeX` — segment removed | Segment disappears from wheel live |
| 3.11 | Chat feed in editor — messages appear | Incoming messages shown in Integrations panel |

**Twitch Channel Points**

| # | Test | Pass criteria |
|---|---|---|
| 3.12 | Reward ID entered in panel — viewer redeems | Wheel spins, redemption auto-fulfilled in Twitch dashboard |

**Webhook / Stream Deck**

| # | Test | Pass criteria |
|---|---|---|
| 3.13 | `curl POST /api/trigger` with correct secret | Wheel spins, `triggeredBy` = "webhook" (or value passed) |
| 3.14 | Wrong secret | 403 response, no spin |
| 3.15 | No secret in `.env` — POST without secret | Spin fires (dev mode behaviour) |
| 3.16 | Multiple rapid POSTs — spins queue | All spins fire in order |

**Kick via Botrix**

| # | Test | Pass criteria |
|---|---|---|
| 3.17 | Botrix running, `!spin` in Kick chat | Wheel spins via webhook trigger |

### Sign-off
- [ ] All 3.x tests pass
- [ ] Integration status indicators show correct state in editor
- [ ] No token stored in browser (check localStorage — should be empty of OAuth data)

---

## Phase 4 — Polish & Quality of Life

### Prerequisites
Phases 1–3 passed.

**Win history**

| # | Test | Pass criteria |
|---|---|---|
| 4.1 | Spin completes — entry appears in history panel | Label, colour swatch, timestamp, triggered-by visible |
| 4.2 | History updates live — no page refresh needed | New entry appears within 1s of spin complete |
| 4.3 | Hover row — edit (✎) and remove (✕) buttons appear | Buttons visible on hover only |
| 4.4 | Edit row — change label, press Enter | Updated label saved, persists after reload |
| 4.5 | Edit row — press Escape | Edit cancelled, original label restored |
| 4.6 | Remove row | Entry removed from list |
| 4.7 | Clear all button | History cleared |
| 4.8 | Restart server — history still present | Persisted in `history.json` |
| 4.9 | History capped at 200 entries | Oldest entries dropped after 200 |

**Segment image — Reveal mode**

| # | Test | Pass criteria |
|---|---|---|
| 4.10 | Upload image, set mode to Reveal | All segments solid (image hidden) |
| 4.11 | Spin — winning segment reveals image slice | That segment transparent, slice of image visible |
| 4.12 | Editor preview mirrors reveal immediately | Preview updates without page reload |
| 4.13 | Restart server — revealed segments stay revealed | `showImage` flags persisted in `config.json` |
| 4.14 | Reset all reveals — all segments solid | Image fully hidden again |
| 4.15 | Linger 3s with reveal — wheel holds after overlay fades | Image visible for linger duration before next spin |

**Config migration**

| # | Test | Pass criteria |
|---|---|---|
| 4.16 | Import a pre-4e preset JSON (missing ambient fields) | Loads without error, missing fields get defaults |
| 4.17 | Load a preset saved before undo/redo — stacks cleared | No stale undo states from old preset |

**Preset safety**

| # | Test | Pass criteria |
|---|---|---|
| 4.18 | Active preset name shown in header | Correct name displayed |
| 4.19 | Edit active preset — dirty indicator shows | Asterisk or indicator visible |
| 4.20 | Switch preset with dirty changes — confirmation shown | Prompt appears |
| 4.21 | Dismiss prompt — stays on current preset | No switch occurred |

**Fonts**

| # | Test | Pass criteria |
|---|---|---|
| 4.22 | Font dropdown — all 37 options visible | No missing fonts |
| 4.23 | Each font option renders in its own typeface in the dropdown | Options visually distinct |
| 4.24 | CC Zoinks font loads from `public/assets/fonts/` | Renders on wheel without FOUT |

### Sign-off
- [ ] All 4.x tests pass
- [ ] History panel loads and updates correctly under rapid spins
- [ ] Reveal mode works in both editor preview and OBS overlay

---

## Phase 5 — Distribution (Future — Electron)

> This phase is not yet implemented. Items here are pre-flight checks to run once Electron packaging is complete.

| # | Test | Pass criteria |
|---|---|---|
| 5.1 | Build `.exe` installer — install on clean Windows machine | App installs without errors |
| 5.2 | Launch app — editor opens | No "server not running" error |
| 5.3 | OBS Browser Source connects to packaged app | `http://localhost:3000/wheel` works |
| 5.4 | All Phase 1–4 features functional in packaged build | No regressions |
| 5.5 | Auto-updater — simulate update | App downloads and applies update |
| 5.6 | Mac DMG — install and launch | App opens, signs correctly |
| 5.7 | Uninstall — no leftover files in sensitive directories | Clean uninstall |

### Sign-off
- [ ] All 5.x tests pass on clean install (no existing `config.json`)
- [ ] App starts reliably across restarts
- [ ] OBS integration confirmed working with packaged server

---

## Regression Checklist

Run after any significant change. Covers the most common breakage points.

| # | Scenario | Check |
|---|---|---|
| R.1 | Add a new config field | Migration handles missing field in old configs |
| R.2 | Change renderer draw order | Ambient effects, frame overlay, pointer still render correctly |
| R.3 | Modify spin physics | Winner lands correctly under pointer, no NaN angles |
| R.4 | Edit App.tsx history logic | Ctrl+Z on initial load doesn't restore DEFAULT_CONFIG |
| R.5 | Touch any `<input type="file">` label | Sidebar does not jump on click |
| R.6 | Add a new panel with large content | Sidebar scrolls; page does not extend outside viewport |
| R.7 | Modify socket events | Overlay still receives `spin` and `config-update`; editor does not receive `config-update` after load |
| R.8 | Load a preset | OBS overlay updates within 200ms |
| R.9 | Server restart mid-session | Editor reconnects and auto-saves continue working |
| R.10 | Spin with reveal mode active | `showImage` flag saved server-side, editor preview updated via `onReveal` callback |

---

## Full Sign-off

Complete all phases before shipping a release.

- [ ] Phase 0 — Setup & Server: all tests pass
- [ ] Phase 1 — Rendering Engine: all tests pass
- [ ] Phase 2 — Editor UI: all tests pass
- [ ] Phase 3 — Platform Integrations: all tests pass
- [ ] Phase 4 — Polish & QoL: all tests pass
- [ ] Phase 5 — Distribution: all tests pass *(once Electron is implemented)*
- [ ] Regression checklist: all R.x checks pass
- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm test` exits 0
- [ ] No console errors on either page in a clean browser session
- [ ] Tested in Chrome and Chromium (OBS browser engine)
