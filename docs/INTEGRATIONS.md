# Platform Integration Research — StreamSpin

## Overview

StreamSpin connects to streaming platforms via chat APIs or webhooks to listen for spin triggers. This document covers the approach, implementation details, and gotchas for each platform, plus OBS Browser Source considerations.

---

## OBS / Streamlabs Browser Source

### How It Works
OBS and Streamlabs embed a Chromium browser engine for Browser Sources. The overlay page at `http://localhost:3000/wheel` is loaded in this embedded Chromium instance — full HTML/CSS/JS, WebSockets included.

### URL to Use
`http://localhost:3000/wheel` — always this URL, both in dev and production.

In dev mode, Express redirects this to `http://localhost:5173/overlay.html` (the Vite dev server). OBS Browser Source follows HTTP redirects automatically.

In production (`npm run build && npm start`), Express serves `dist/overlay.html` directly.

### Recommended Browser Source Settings
- **Width**: 1920, **Height**: 1080 (or match your stream resolution)
- **Custom CSS**: leave blank (the page sets `background: transparent` itself)
- **Shutdown source when not visible**: **OFF** — this kills the WebSocket connection and breaks live updates
- **Refresh browser when scene becomes active**: optional, harmless

### WebSockets from Browser Source
Chromium in OBS has no special restrictions on `ws://localhost` connections. Socket.io works without any configuration changes.

### Streamlabs vs OBS Studio
Both use embedded Chromium. Target ES2020+ syntax for maximum compatibility. No known differences that affect StreamSpin.

### Gotcha: VMs and Remote OBS
If OBS runs inside a VM or on a separate machine, `localhost` in that environment is not the host machine. Streamers in this setup must use the host machine's local network IP instead (e.g. `http://192.168.x.x:3000/wheel`). The server currently only binds to `127.0.0.1` — binding to `0.0.0.0` would be needed for this use case but introduces a security consideration.

---

## Twitch

### Overview
Twitch has the most complete streaming integration API. StreamSpin uses two separate Twitch systems:
1. **Chat** — IRC via `tmi.js`, for `!spin` style commands
2. **EventSub** — WebSocket-based, for Channel Points redemptions

### Chat — tmi.js (Phase 3)

**Library**: `tmi.js` — de-facto standard Twitch IRC wrapper
```bash
npm install tmi.js && npm install -D @types/tmi.js
```

Connects to `irc.chat.twitch.tv` via WebSocket. Requires a bot account OAuth token.

**Required OAuth scopes**: `chat:read`, `chat:edit`

**Auth flow**:
1. Register a Twitch app at `dev.twitch.tv`
2. Visit `http://localhost:3000/auth/twitch` in a browser (stub route exists)
3. Server exchanges code for access + refresh tokens
4. Tokens stored in `.env`

**Rate limits**: 20 messages/30s for regular bots. Implement cooldowns to stay well clear.

**Permission checking**: `tags['mod']`, `tags['badges']?.broadcaster` — use these to gate moderator-only commands.

**Gotcha**: tmi.js reconnects automatically. Do not add reconnect logic on top — it causes duplicate event handlers.

### Channel Points — EventSub (Phase 3)

**Event type**: `channel.channel_points_custom_reward_redemption.add`

**Additional scope**: `channel:read:redemptions`, `channel:manage:redemptions`

**Getting the Reward ID**: Create the reward in the Twitch dashboard, then fetch it via `GET https://api.twitch.tv/helix/channel_points/custom_rewards`. The UUID goes in the Editor's Integrations panel.

**Implementation notes**:
- EventSub WebSocket sessions need keepalives every ~10 minutes
- Auto-fulfil redemptions via `PATCH /helix/channel_points/custom_rewards/redemptions` to clear the queue

### Full OAuth Scope List
```
chat:read
chat:edit
channel:read:redemptions
channel:manage:redemptions
```

---

## Kick

### Overview
Kick has no official public bot API as of Q1 2026. Rather than implementing a fragile reverse-engineered integration, StreamSpin uses **Botrix** as a bridge.

### Recommended Approach: Botrix Bridge

[Botrix](https://botrix.live) is a chatbot that officially supports Kick and allows **custom JavaScript** in command handlers. It runs as an Electron app (Node.js runtime), so `fetch()` to `localhost` works without restriction.

**Setup:**

1. Install Botrix and connect it to your Kick channel
2. Create a `!spin` command in Botrix
3. Set the action to **Custom JavaScript** with this snippet:

```javascript
fetch('http://localhost:3000/api/trigger', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ secret: 'YOUR_WEBHOOK_SECRET', triggeredBy: 'kick:' + username })
});
```

4. Paste your `WEBHOOK_SECRET` from StreamSpin's `.env` into the snippet

**Why this works:**
- Botrix handles all Kick authentication, reconnection, and command parsing
- StreamSpin only needs its existing `POST /api/trigger` endpoint — same one used by Stream Deck and manual triggers
- No Kick-specific code needed in StreamSpin
- Botrix handles bot chat responses itself — configure them in Botrix

**Limitation**: Botrix must be running alongside StreamSpin. Document this dependency clearly in the setup guide (Phase 3 editor panel).

### Kick Official API (Status)
Kick launched an official API program in 2024. As of Q1 2026, OAuth for bots is in limited beta. Monitor [kick.com/developers](https://kick.com/developers) — if a stable API ships, a native integration can be added without changing the StreamSpin architecture (just implement the integration module interface).

---

## OnlyFans

### Status
OnlyFans has no public API for live streaming, chat, or tip events as of Q1 2026.

### Why Browser Automation Is Not an Option
Some tools attempt Puppeteer-based scraping of the OnlyFans web UI:
- Violates OnlyFans ToS (risk of account suspension)
- Fragile — breaks on any UI update
- Session management is unreliable
- Not a supportable integration path

### Recommended Workflow for OnlyFans Streamers
1. Keep the StreamSpin Editor open in a browser tab during streams
2. Use the **Test Spin** button (or the sidebar "Spin Now" button — Phase 3) to trigger manually in response to tips/subscriptions
3. Alternatively, map a **Stream Deck** button to `POST /api/trigger` via the Web Requests plugin

This is ergonomically appropriate for OF streams — streamers are already watching the OF UI for tip notifications.

### Future
If OnlyFans introduces a public events API, the integration module stub at `src/integrations/` is ready to be filled in.

---

## Webhook / Stream Deck

### POST /api/trigger

Universal spin trigger. Any tool that can make an HTTP POST can fire the wheel.

```bash
curl -X POST http://localhost:3000/api/trigger \
  -H "Content-Type: application/json" \
  -d '{"secret": "YOUR_WEBHOOK_SECRET", "triggeredBy": "stream-deck"}'
```

**Body fields:**
- `secret` — must match `WEBHOOK_SECRET` in `.env` (if unset, any POST is accepted)
- `triggeredBy` — optional label shown in spin-complete logs (e.g. `"twitch:username"`, `"kick:username"`, `"webhook"`)

**Response:** `{ "ok": true, "queued": true }`

### Stream Deck Setup
1. Install the **Web Requests** plugin from the Elgato Marketplace (free)
2. Add a button → Web Requests action
3. URL: `http://localhost:3000/api/trigger`
4. Method: POST
5. Header: `Content-Type: application/json`
6. Body: `{"secret": "YOUR_WEBHOOK_SECRET"}`

Stream Deck integration is the recommended trigger method for OnlyFans streamers.

---

## Third-Party Aggregators

These services provide a unified chat API across platforms and can relay triggers to StreamSpin via the webhook endpoint.

### StreamElements
- REST API at `api.streamelements.com/kappa/v2/`
- Supports Twitch and YouTube natively, Kick unofficially
- Custom overlay widgets can call external APIs — a StreamElements widget could call `POST /api/trigger`

### Streamlabs
- Similar to StreamElements for multi-platform support
- Less actively maintained API

### Recommendation
Implement native Twitch integration first (Phase 3). StreamElements/Streamlabs webhook approach is a documented advanced option for users who already use those platforms, not a primary integration path.

---

## Summary Table

| Platform | Chat trigger | Bot responses | Auth | Stability |
|---|---|---|---|---|
| Twitch chat | `tmi.js` (Phase 3) | ✅ tmi.js | OAuth 2.0 | High |
| Twitch Channel Points | EventSub (Phase 3) | Auto-fulfil | OAuth 2.0 | High |
| Kick | Botrix bridge | Botrix handles it | Botrix handles it | High (Botrix-dependent) |
| OnlyFans | — | — | — | N/A |
| Webhook (any) | `POST /api/trigger` | — | Shared secret | High |
| Stream Deck | Web Requests plugin | — | Shared secret | High |
| StreamElements | Custom widget → webhook | — | StreamElements auth | Medium |

---

## References

- Twitch Dev Portal: `dev.twitch.tv`
- Twitch EventSub Docs: `dev.twitch.tv/docs/eventsub`
- Twitch Channel Points API: `dev.twitch.tv/docs/api/reference/#get-custom-reward`
- tmi.js GitHub: `github.com/tmijs/tmi.js`
- Botrix: `botrix.live`
- Kick Dev Portal: `kick.com/developers`
- OBS Browser Source: `obsproject.com/wiki/Sources-Guide#browser-source`
- Elgato Web Requests Plugin: Elgato Marketplace
