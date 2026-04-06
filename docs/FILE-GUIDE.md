# StreamSpin — What Every File and Folder Does

A plain-language guide. No coding knowledge required.

---

## The Big Picture

The app has three main parts that work together:

1. **The editor** — the page you open in your browser to set up the wheel
2. **The overlay** — the page you paste into OBS as a browser source (the actual spinning wheel)
3. **The server** — the invisible engine running in the background that connects everything

---

## Root Folder (top level)

| File / Folder | What it does |
|---|---|
| `index.html` | The starting point for the editor page |
| `overlay.html` | The starting point for the OBS overlay page |
| `config.json` | Saves your current wheel settings (colours, segments, fonts, etc.) |
| `presets.json` | Saves all your named wheel presets |
| `history.json` | Saves the list of spin results (win history) |
| `config.json.example` | A sample config file for reference — not used by the app |
| `package.json` | The app's ingredient list — lists every tool and library it depends on |
| `README.md` | The main introduction and setup guide |
| `TODO.md` | The development roadmap — what's done, what's next |
| `CLAUDE.md` | Instructions specifically for the AI assistant working on this project |
| `public/` | Files served directly to the browser without any processing |
| `presets/` | Ready-made themed wheel files you can import (Halloween, Christmas, etc.) |
| `src/` | All the actual code for the app |
| `docs/` | Extra documentation files |
| `node_modules/` | Downloaded libraries the app uses — never edit this manually |

The following files are configuration for the build tools — you rarely need to touch them:

- `vite.config.ts` — settings for the tool that builds and runs the editor
- `tailwind.config.js` — settings for the styling system
- `postcss.config.js` — part of the styling pipeline
- `tsconfig.json` / `tsconfig.server.json` — settings that check the code for mistakes
- `eslint.config.js` — rules that enforce consistent code style
- `vitest.config.ts` — settings for running automated tests

---

## `public/`

Files here are handed straight to the browser as-is.

| File / Folder | What it does |
|---|---|
| `assets/fonts/` | Custom font files (e.g. CC Zoinks) so the browser can display them |
| `wheel.html` | Unused legacy file — can be ignored |

---

## `presets/`

Ready-to-import wheel themes. Each file is a complete wheel setup that a streamer can import via the editor to instantly get a themed look.

| File | Theme |
|---|---|
| `halloween.json` | Dark orange and purple spooky theme |
| `goth.json` | Black, deep red, and silver aesthetic |
| `cutesy.json` | Pastel pinks and soft colours |
| `cottage-core.json` | Earthy greens and warm naturals |
| `christmas.json` | Red, green, and gold festive theme |

---

## `docs/`

Extra documentation that didn't fit in the README.

| File | What it covers |
|---|---|
| `ARCHITECTURE.md` | A deeper technical explanation of how the parts connect |
| `INTEGRATIONS.md` | How to set up Twitch, Kick, and webhook connections |
| `FILE-GUIDE.md` | This file |

---

## `src/` — The Code

Everything is split into folders by responsibility.

---

### `src/types/`

Definitions of the shapes of data used across the whole app. Think of these as the agreed blueprints — if the editor says a segment has a "label" and a "color", this is where that agreement is written down so every part of the app stays in sync.

| File | What it defines |
|---|---|
| `config.ts` | The complete shape of a wheel config — every setting, with its default value |
| `events.ts` | The messages that the editor and overlay send to each other in real time |

---

### `src/wheel/`

The pure drawing engine. This code has no idea it's inside a web app — it just knows how to draw a wheel onto a canvas. It's kept separate so it can be reused in both the editor preview and the live overlay without any changes.

| File | What it does |
|---|---|
| `renderer.ts` | Draws a single frame of the wheel — segments, labels, colours, shadows, gradients, pointer, frame overlay |
| `physics.ts` | Calculates how the wheel spins — speed, deceleration, and which segment wins |
| `pointers.ts` | Draws the built-in pointer shapes (arrow, triangle, pin, etc.) directly onto the canvas |

---

### `src/overlay/`

The code that runs inside OBS.

| File | What it does |
|---|---|
| `main.ts` | Connects to the server, listens for spin commands, and runs the wheel animation in OBS |

---

### `src/app/`

The editor — the page you open in your browser to customise the wheel.

| File | What it does |
|---|---|
| `main.tsx` | The entry point that starts the editor page |
| `index.css` | Global styles — custom fonts, scrollbar appearance, animations |
| `App.tsx` | The root of the editor — holds all the settings in memory, saves them automatically, connects to the server via socket, and handles the Space bar shortcut for test spins |

#### `src/app/lib/`

Small helper utilities used by the editor.

| File | What it does |
|---|---|
| `configApi.ts` | Handles loading, saving, importing, and exporting wheel settings to/from the server |
| `constants.ts` | Shared lists used across the editor — available colours, fonts, and easing styles |

#### `src/app/components/`

The visual building blocks of the editor page.

| File | What it does |
|---|---|
| `WheelPreview.tsx` | The live canvas preview in the editor — shows the wheel and the result overlay after a spin |
| `PresetManager.tsx` | The preset bar at the top — lets you save, load, rename, and switch between wheel setups; remembers which preset you had open when you reload the page |

#### `src/app/components/panels/`

Each panel is one collapsible section in the editor sidebar.

| File | What it controls |
|---|---|
| `SegmentsPanel.tsx` | Adding, removing, reordering, and styling individual wheel segments — labels, colours, gradients, fonts, position |
| `AppearancePanel.tsx` | Overall wheel look — background colour, font size, bold/italic, drop shadow, glow, frame overlay image, frame ring width |
| `PointerPanel.tsx` | The pointer style — built-in shapes or a custom image, plus rotation adjustment |
| `SpinSettingsPanel.tsx` | How the wheel spins — minimum and maximum spin duration, easing curve, and any spin delays |
| `ResultPanel.tsx` | The winner announcement that appears after a spin — text, colours, font, display duration |
| `IntegrationsPanel.tsx` | Twitch and Kick chat connections — enter your channel name and tokens to let viewers trigger spins via chat commands or channel points |
| `HistoryPanel.tsx` | The win history log — shows every spin result, lets you remove entries (mark as claimed) and edit the label or viewer name |

#### `src/app/components/ui/`

Small reusable building blocks used inside the panels. These are the individual controls, not whole sections.

| File | What it is |
|---|---|
| `Panel.tsx` | The collapsible section wrapper with a title and open/close toggle |
| `ColorInput.tsx` | A colour swatch that opens the colour picker plus a hex code text field |
| `Slider.tsx` | A draggable slider for number values |
| `NumberInput.tsx` | A plain number text field |
| `Toggle.tsx` | An on/off switch (dot left = off, dot right = on) |
| `Select.tsx` | A dropdown picker |

---

### `src/server/`

The background engine. This runs on your computer and is never visible to viewers — it holds everything together.

| File | What it does |
|---|---|
| `index.ts` | Starts the server, connects all the routes, and begins listening for connections |
| `configStore.ts` | Reads and writes your wheel settings to `config.json` safely, so the file is never corrupted mid-write |
| `presetsStore.ts` | Reads and writes your named presets to `presets.json` in the same safe way |
| `historyStore.ts` | Keeps the win history in memory while the app is running and saves it to `history.json` — capped at 200 entries, newest first |
| `migration.ts` | When you load an old config or preset, this fills in any missing settings with sensible defaults so nothing breaks |
| `socketBridge.ts` | Manages the real-time connection between the editor and the overlay — queues up spin requests, fires them in order, records wins when complete |
| `integrationManager.ts` | Starts and stops the Twitch and Kick connections based on your settings |
| `tokenStore.ts` | Stores your Twitch login tokens securely on your machine and refreshes them automatically when they expire |

#### `src/server/routes/`

Each file here handles a specific set of web requests from the editor.

| File | What requests it handles |
|---|---|
| `config.ts` | Loading and saving the current wheel settings |
| `presets.ts` | Creating, renaming, loading, and deleting named presets |
| `history.ts` | Fetching the win history, removing individual entries, editing entries, and clearing all history |
| `trigger.ts` | Receiving external spin triggers — from a Stream Deck, a webhook, or another tool |
| `auth.ts` | The Twitch login flow — handles the back-and-forth of connecting your Twitch account |
| `integrations.ts` | Starting and stopping Twitch/Kick connections on demand from the editor |

---

### `src/integrations/twitch/`

The Twitch connection code.

| File | What it does |
|---|---|
| `chat.ts` | Listens to your Twitch chat for commands like `!spin`, `!addslice`, and `!removeslice`; enforces per-viewer cooldowns |
| `eventsub.ts` | Listens for Channel Point redemptions from Twitch and triggers a spin automatically when one happens |
