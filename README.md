# StreamSpin — Customisable Stream Overlay Spin Wheel

A fully customisable, browser-source-ready spin wheel for live streamers on Twitch, Kick, and more. Runs entirely on your own machine — no cloud, no subscription, no latency.

---

## Features

### Wheel Designer
- Add, remove, drag-and-drop reorder, and weight segments
- Per-segment colour picker (10-colour palette + full hex input) — recently used colours shown at the top of the palette automatically
- Per-segment advanced options: text colour, gradient fill, font override, label position offset
- Smart label sizing — all labels sit at the same radius; font scales automatically so wide segments get bigger text and narrow segments get smaller text, everything stays inside the wheel
- Global font selector — **37 fonts** with live preview (each option rendered in its own typeface), grouped by style: sans-serif, condensed, display, handwriting, serif, gaming, monospace, and custom
- Bold / italic label style toggles
- Border, hub, glow, drop shadow, and background colour controls
- Frame ring width control (reserves space for artist frame overlays)
- Frame overlay upload — drop a transparent PNG designed by your artist on top of the wheel
- **Undo / redo** — Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z) with up to 30 levels; drag bursts collapse into a single undo state

### Segment Image System
- Upload one image that fills the entire wheel circle — segments act as windows into it
- **Five modes:**
  - **None** — no image, normal solid segments
  - **All** — every segment shows the image
  - **Alternating** — even segments show image, odd segments show solid colour
  - **Manual** — per-segment toggle controls which segments show the image
  - **Reveal** — segments start solid; each winning segment permanently reveals its slice of the image, building up the full picture over multiple spins
- Image opacity and **Darken image** (dark veil) sliders
- Reset Reveals button to wipe all segments back to solid and start a new game

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
- **Post-result linger** — hold the wheel on screen for an extra 0–10s after the overlay fades, useful with Reveal mode so viewers can see which slice was uncovered before the next spin fires
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
```

Open `.env` in any text editor and set `WEBHOOK_SECRET` to any random string (e.g. `mysecretword123`). You can fill in Twitch credentials later.

### Run

```bash
npm run dev
```

Open `http://localhost:5173` in your browser — that's the editor. The OBS overlay URL is always `http://localhost:3000/wheel`.

### Clean Restart
Press `Ctrl+C` in the terminal then run `npm run dev` again.

---

## Setting Up in OBS

This is a one-time setup. Once done the wheel appears on stream whenever your scene is active.

### Step 1 — Add a Browser Source

1. In OBS, open the scene you stream from
2. In the **Sources** panel, click the **+** button
3. Choose **Browser Source**
4. Name it something like `StreamSpin Wheel` and click OK

### Step 2 — Configure the Browser Source

Fill in the settings exactly as follows:

| Setting | Value |
|---|---|
| URL | `http://localhost:3000/wheel` |
| Width | `1920` (or your stream canvas width) |
| Height | `1080` (or your stream canvas height) |
| Custom CSS | leave completely blank |
| Shutdown source when not visible | **OFF** — this must be unchecked |
| Refresh browser when scene becomes active | optional, either is fine |

> **Why "Shutdown when not visible" must be OFF:** If this is on, OBS disconnects the wheel from StreamSpin every time you switch scenes. When you switch back, the wheel won't respond to spins until it reconnects, which can take several seconds.

Click **OK**.

### Step 3 — Position the Wheel

The wheel renders with a transparent background so it layers cleanly over your stream layout. Resize and position the browser source however you like — drag it, use the alignment tools, or enter exact coordinates in the Transform panel (`Ctrl+E`).

### Step 4 — Test It

Make sure StreamSpin is running (`npm run dev`), then press **Space** in the editor. The wheel should spin in OBS at the same time.

If the wheel doesn't appear in OBS, right-click the browser source and choose **Refresh** to force a reconnect.

---

## Connecting to Twitch

StreamSpin connects to Twitch in two ways:
- **Chat commands** — viewers type `!spin` in your chat to trigger a spin
- **Channel Points** — a spin triggers automatically when a viewer redeems a custom reward

You need to set up a Twitch application to enable either of these.

### Step 1 — Create a Twitch Application

This is a one-time setup that tells Twitch that StreamSpin is allowed to connect to your channel.

1. Go to [dev.twitch.tv/console](https://dev.twitch.tv/console) and log in with your Twitch account
2. Click **Register Your Application**
3. Fill in the form:
   - **Name**: StreamSpin (or anything you like)
   - **OAuth Redirect URLs**: `http://localhost:3000/auth/twitch/callback`
   - **Category**: Broadcaster Suite
4. Click **Create**
5. On the next page, click **Manage** next to your new application
6. Copy the **Client ID** — you'll need this in a moment
7. Click **New Secret**, copy the **Client Secret** immediately (it's only shown once)

### Step 2 — Add Your Credentials to .env

Open your `.env` file and fill in:

```
TWITCH_CLIENT_ID=paste_your_client_id_here
TWITCH_CLIENT_SECRET=paste_your_client_secret_here
TWITCH_REDIRECT_URI=http://localhost:3000/auth/twitch/callback
```

Save the file and restart StreamSpin (`Ctrl+C` then `npm run dev`).

### Step 3 — Connect Your Channel in the Editor

1. Open the editor at `http://localhost:5173`
2. Open the **Integrations** panel in the sidebar
3. Enter your **Twitch channel name** (the name in your stream URL, e.g. `mychannel`)
4. Click **Connect to Twitch**
5. Your browser will open a Twitch authorisation page — click **Authorise**
6. The browser tab closes automatically and the status in the editor turns green

StreamSpin stores your login tokens locally and refreshes them automatically — you won't need to do this again unless you revoke access.

### Step 4 — Enable Chat Commands (Optional)

In the Integrations panel, turn on **Chat Commands**. Viewers can now type in your chat:

| Command | Who can use it | What it does |
|---|---|---|
| `!spin` | Everyone (if enabled) | Triggers a spin |
| `!addslice <label>` | Moderators and broadcaster | Adds a new segment to the wheel live |
| `!removeslice <label>` | Moderators and broadcaster | Removes a segment from the wheel live |

You can restrict `!spin` to subscribers only from the Integrations panel.

### Step 5 — Set Up Channel Points (Optional)

Channel Points lets viewers spend their points to trigger a spin — no chat command needed.

1. Go to your Twitch dashboard → **Viewer Rewards** → **Channel Points** → **Manage Rewards**
2. Click **Add Custom Reward**
3. Name it (e.g. "Spin the Wheel"), set a point cost, and save
4. Back in the Twitch dashboard, open your browser's developer tools (F12), go to the Network tab, and reload the page — find the `custom_rewards` API call and copy the reward's **ID** from the response. Alternatively, ask a moderator to help find it via the Twitch API explorer at [dev.twitch.tv/docs/api/reference](https://dev.twitch.tv/docs/api/reference)
5. Paste the reward ID into the **Channel Points Reward ID** field in StreamSpin's Integrations panel
6. Enable **Channel Points** in the panel

When a viewer redeems the reward, a spin fires automatically and the redemption is marked as fulfilled.

---

## Connecting to Kick (via Botrix)

Kick doesn't have an official bot API, so StreamSpin uses **Botrix** as a bridge — Botrix handles the Kick side, StreamSpin handles the wheel side.

### Step 1 — Set Up Botrix

1. Download and install [Botrix](https://botrix.live)
2. Connect Botrix to your Kick channel (follow Botrix's own setup guide)

### Step 2 — Create a Spin Command in Botrix

1. In Botrix, go to **Commands** and create a new command called `!spin`
2. Set the action type to **Custom JavaScript**
3. Paste in this code, replacing `YOUR_WEBHOOK_SECRET` with the value from your `.env` file:

```javascript
fetch('http://localhost:3000/api/trigger', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ secret: 'YOUR_WEBHOOK_SECRET', triggeredBy: 'kick:' + username })
});
```

4. Save the command

When a viewer types `!spin` in your Kick chat, Botrix calls StreamSpin's trigger endpoint and the wheel spins. Botrix must be running alongside StreamSpin for this to work.

---

## Using the Editor

### Building Your Wheel

1. Open the **Segments** panel and click **Add Segment** to add prizes
2. Click a segment to expand it — you can change the label, colour, weight (how likely it is to land), and advanced options like gradient, font, and text colour
3. Drag the ⠿ handle on the left of any segment to reorder them
4. Open **Appearance** to change the overall wheel style — background, fonts, shadows, and frame overlay
5. Open **Pointer** to choose or upload a custom pointer
6. Open **Spin Settings** to adjust how long the wheel spins
7. Open **Result Overlay** to configure the winner announcement that appears after each spin

### Saving Presets

The preset bar runs along the top of the editor. Type a name and click **Save** to create a new preset. Click **Update** to save changes to the current preset. Click any preset name to switch to it — the OBS overlay updates immediately.

### Test Spinning

Press **Space** anywhere in the editor (as long as you're not typing in a text field) to trigger a test spin. The wheel spins in both the editor preview and the OBS overlay.

### Segment Images

Open the **Appearance** panel and scroll to the **Segment Image** section.

1. Choose a mode — **All**, **Alternating**, **Manual**, or **Reveal**
2. Upload your image (any format — PNG, JPG, etc.)
3. Adjust **Image opacity** and **Darken image** to taste

**Reveal mode step by step:**

1. Set mode to **Reveal** and upload a hidden image
2. All segments start solid — the image is completely hidden
3. Each time a segment wins, it permanently flips to transparent, revealing that slice of the image
4. Progress is saved automatically — if you restart the stream, the reveal state is preserved
5. When you're ready to start fresh, click **Reset all reveals** to return all segments to solid

> **Tip:** Pair Reveal mode with the **Hold wheel after result** slider in the Result Overlay panel — set it to 2–4 seconds so viewers have time to appreciate each reveal before the next spin starts.

### Win History

Open the **Win History** panel to see a log of every spin result. Hover any row to see two buttons:
- **✎** — click to edit the label or viewer name (useful if you want to note who received a prize)
- **✕** — click to remove the entry (use this to mark prizes as claimed)

History survives restarts. Click **Clear all** to start fresh.

### Importing a Themed Preset

Click **Import** in the editor header and select any `.json` file from the `presets/` folder in the StreamSpin directory. This loads a ready-made theme you can customise from.

| File | Vibe / Features tested |
|---|---|
| `neon-arcade.json` | Glow effect, Orbitron font, neon colours, linger |
| `gradient-vibes.json` | Per-segment gradient fills, Lobster font, bold |
| `streamer-classic.json` | Clean border, hub, drop shadow, Montserrat |
| `bouncy-fast.json` | Bounce physics, fast spin, Bangers font |
| `slow-drift.json` | Very slow expo spin, italic labels, Satisfy font |
| `gaming-pixels.json` | Press Start 2P font, solid background, glow, green tones |
| `weighted-jackpot.json` | Heavily weighted rarity tiers, Russo One font |
| `elegant-evening.json` | Playfair Display italic, Cinzel result font, gold/dark |
| `handwriting-fun.json` | Permanent Marker, bounce, no border, fun labels |
| `big-reveal.json` | Alternating image mode, 5s linger, Fredoka font |
| `remove-winner-gauntlet.json` | Remove winner mode, 10 viewer slots, Nunito |
| `minimal-zen.json` | No border/hub/shadow/glow, very slow, muted palette |
| `blue-asmr.json` | Soft blue ambient particle effects, calm palette |

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Test spin (when not focused on a text input) |
| `Ctrl+Z` | Undo last change |
| `Ctrl+Y` or `Ctrl+Shift+Z` | Redo |

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

## Ambient Effects

Eight particle effects can be layered over the wheel. All effects have an **Intensity** slider (20–100%) and a **scope** toggle:
- **Over wheel** — particles render over the entire canvas including the wheel itself
- **Outside only** — particles are clipped to the area outside the wheel rim, keeping the segments and labels clear

### How they work

All 8 ambient effects are drawn entirely with the **HTML5 Canvas 2D API** — no image files, no external libraries, no assets of any kind. Everything is pure procedural code in [`src/wheel/effects.ts`](src/wheel/effects.ts).

**The architecture in brief:**

- Each effect owns a module-level array of `Particle` objects. Each particle stores: `x`, `y`, `vx`, `vy`, `speed`, `angle`, `radius`, `size`, `opacity`, `phase`, `rotation`, `rotSpeed`, and an optional `color`.
- Every animation frame, `drawAmbientEffects(ctx, effect, intensity, timestamp)` is called from the renderer. It first **updates** all particles (move, recycle out-of-bounds ones), then **draws** them.
- Movement is frame-rate-independent: `dt = currentTimestamp - lastTimestamp` (capped at 50ms to survive tab-switch pauses), and all velocity is applied as `position += velocity * dt / 1000`.
- Smooth oscillation uses `Math.sin(timestamp / 1000 + particle.phase)` — each particle has a random `phase` offset so they pulse out of sync with each other rather than all together.

**The five movement archetypes used across the built-in effects:**

| Pattern | Examples | Mechanism |
|---|---|---|
| Radiate outward | Silver stars | `radius += speed * dt`, recycle past canvas edge |
| Fall downward | Sakura, Snow, Confetti | `y += vy * dt`, recycle when `y > height` |
| Rise upward | Pink hearts | `y += vy * dt` (vy is negative), recycle when `y < 0` |
| Wander / wrap | Fireflies | `angle += rotSpeed * dt`, `x += cos(angle) * speed * dt`, wrap at canvas edges |
| Stationary twinkle | Gold sparkles | No position update — only `globalAlpha` oscillates each frame |

**The Canvas drawing calls used by each effect:**

| Effect | Draw call(s) |
|---|---|
| Silver stars | 8-point star path (`lineTo` loop), `fill` + `stroke` |
| Gold sparkles | 4-line cross (`moveTo` / `lineTo`), `stroke` with `lineCap: round` |
| Sakura | Two `ellipse()` fills (petal + inner sheen) |
| Pink hearts | Two `arc()` calls (top bulges) + two `bezierCurveTo()` (sides to bottom point) |
| Snowflakes | 6 arms via `stroke` in a `rotate` loop, each with two branch lines |
| Confetti | `fillRect()` on a translated+rotated context |
| Fireflies | `createRadialGradient()` + `arc` fill — the gradient does the glow |

---

### Adding a custom ambient effect

This is an 8-step checklist across 3 files. No other files need touching.

**Step 1 — Register the name** in `src/types/config.ts`:

```ts
export type AmbientEffect = 'none' | 'silver-stars' | ... | 'my-effect'
```

**Step 2 — Write a particle factory** in `src/wheel/effects.ts`. The factory receives the canvas `width` and `height`, and a `scattered` flag (true = initial random scatter, false = spawn at natural entry point):

```ts
function makeMyEffect(w: number, h: number, scattered: boolean): Particle {
  return {
    x: rand(0, w),
    y: scattered ? rand(0, h) : -20,  // start off-screen top
    angle: 0, radius: 0,
    vx: rand(-10, 10),
    vy: rand(40, 80),   // falls downward
    speed: 0,
    size: rand(6, 14),
    opacity: rand(0.6, 1.0),
    phase: rand(0, Math.PI * 2),
    rotation: rand(0, Math.PI * 2),
    rotSpeed: rand(-1, 1),
    color: '#ff0000',   // optional — only needed if your draw function uses it
  }
}
```

**Step 3 — Write a draw function.** Use `ctx.save()` / `ctx.restore()` to isolate transforms:

```ts
function drawMyEffect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number, rotation: number, alpha: number
): void {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.rotate(rotation)
  // ... your canvas draw calls here ...
  ctx.restore()
}
```

**Step 4 — Register the factory** in `makeParticle()`:

```ts
function makeParticle(effect: AmbientEffect, w: number, h: number, scattered = false): Particle {
  // ... existing cases ...
  if (effect === 'my-effect') return makeMyEffect(w, h, scattered)
  return makePetal(w, h, scattered)
}
```

**Step 5 — Set a particle count** in `particleCount()`:

```ts
const base = ...
           : effect === 'my-effect' ? 20
           : 14
```

**Step 6 — Add update logic** in the update loop inside `drawAmbientEffects()`:

```ts
if (effect === 'my-effect') {
  p.y += p.vy * dt / 1000
  p.x += p.vx * dt / 1000
  p.rotation += p.rotSpeed * dt / 1000
  if (p.y > height + 30) {
    _particles[i] = makeMyEffect(width, height, false)
  }
}
```

**Step 7 — Add the draw call** in the draw loop (immediately after the update loop in the same function):

```ts
if (effect === 'my-effect') {
  drawMyEffect(ctx, p.x, p.y, p.size, p.rotation, p.opacity)
}
```

**Step 8 — Add the button and description** in `src/app/components/panels/AppearancePanel.tsx`:

```tsx
// In the grid:
{ value: 'my-effect', label: 'My Effect' },

// In the description paragraph:
{wheel.ambientEffect === 'my-effect' && 'Description shown below the scope toggle.'}
```

**Tips:**
- Use `Math.sin(t + p.phase)` (where `t = timestamp / 1000`) to oscillate any property — multiply by how far you want it to swing.
- `createRadialGradient(x, y, 0, x, y, size)` is the easiest way to make anything glow.
- Keep draw calls simple — this runs every animation frame (60fps). Avoid `ctx.shadowBlur` inside per-particle loops; use a gradient instead.
- The `scattered` flag is your friend: on first initialisation it's `true` so particles fill the canvas immediately rather than all pouring in from one edge.
- Test in both "Over wheel" and "Outside only" scope modes — in outside-only, particles inside the wheel radius are clipped away, so effects that only spawn near the centre may appear blank.

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
│   │   │   ├── panels/     Segments, Appearance, Pointer, Spin, Result, Integrations, History
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
│   │   ├── routes/         config, trigger, presets, auth, history
│   │   ├── configStore.ts  Atomic config.json read/write
│   │   ├── migration.ts    Schema migration — runs on every config read
│   │   ├── presetsStore.ts Atomic presets.json read/write
│   │   ├── historyStore.ts Win history — in-memory + history.json persistence
│   │   ├── socketBridge.ts Spin queue + event routing + win recording
│   │   ├── tokenStore.ts   Twitch OAuth token storage + auto-refresh
│   │   └── integrationManager.ts  Twitch chat + EventSub lifecycle
│   ├── integrations/
│   │   └── twitch/         chat.ts (tmi.js) + eventsub.ts (native WS)
│   └── types/
│       ├── config.ts       Master WheelConfig schema + DEFAULT_CONFIG
│       └── events.ts       Socket.io event maps
├── docs/
│   ├── ARCHITECTURE.md
│   ├── INTEGRATIONS.md
│   └── FILE-GUIDE.md       Plain-language guide to every file and folder
├── .env.example
├── CLAUDE.md
└── TODO.md
```

---

## Troubleshooting

**The wheel doesn't appear in OBS**
Right-click the browser source and click **Refresh**. Make sure StreamSpin is running (`npm run dev`).

**The wheel appears but doesn't spin when chat commands are used**
Check the Integrations panel — the Twitch status indicator should be green. If it's red or grey, click Connect again. Make sure your `.env` has the correct Client ID and Secret.

**OBS shows the wheel but it doesn't update when I change settings**
Make sure "Shutdown source when not visible" is **OFF** in your browser source settings. If it is off and it's still not updating, right-click the source and choose Refresh.

**The result overlay doesn't appear**
Open the **Result Overlay** panel in the editor and make sure it's toggled on.

**Spins are queuing up and not firing**
This can happen if the overlay disconnected mid-spin. Right-click the OBS browser source and refresh it to reset the connection.

---

## Roadmap

Phases 0–4 complete including segment images, reveal mode, win history, ambient effects, and undo/redo. Next: Phase 5 — Electron packaging into a single `.exe`.

See [TODO.md](TODO.md) for the full breakdown.

---

## Contributing

PRs welcome. Please read [CLAUDE.md](CLAUDE.md) for development conventions if using AI-assisted coding.

---

## Licence

MIT
