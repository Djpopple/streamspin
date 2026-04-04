# Platform Integration Research — StreamSpin

## Overview

StreamSpin connects to streaming platforms via their official (or best-available) chat APIs to listen for commands. This document covers the approach, gotchas, and alternatives for each platform, as well as OBS browser source considerations.

---

## OBS / Streamlabs Browser Source

### How it Works
OBS and Streamlabs both embed a Chromium browser engine for Browser Sources. Any URL you enter is loaded in this embedded Chromium instance, which renders HTML/CSS/JS just like a regular browser.

### Serving the Overlay
StreamSpin runs a local Express server. The overlay page at `http://localhost:3000/wheel` is entered as the Browser Source URL. This avoids all `file://` protocol restrictions (which block WebSockets, fetch calls, and CORS entirely).

### Key Settings for OBS Browser Source
- **Width**: 1920, **Height**: 1080 (or match stream resolution)
- **Custom CSS**: `body { background: transparent !important; }` (or leave blank — the page does this itself)
- **Shutdown source when not visible**: OFF — this would kill the WebSocket connection
- **Refresh browser when scene becomes active**: optional, harmless

### WebSocket from Browser Source
Chromium in OBS has no special restrictions on `ws://localhost` connections. Socket.io works without any configuration changes. The overlay page connects to `ws://localhost:3000` just as a regular browser tab would.

### Streamlabs vs OBS
Both use Chromium. Streamlabs Desktop is Electron-based and may have a slightly older Chromium version. Target ES2020 for maximum compatibility.

### Gotcha: Multiple Monitors / Virtual Machines
If OBS runs inside a VM, `localhost` in the VM is not the host machine. Streamers running OBS in a VM will need to use the host machine's local IP instead. Document this clearly in the setup guide.

---

## Twitch

### Overview
Twitch has the best-documented streaming API of the three platforms. There are two separate systems:
1. **Chat** — IRC-based, accessed via `tmi.js`
2. **EventSub** — webhook or WebSocket-based event system for channel events (subscriptions, channel points, etc.)

### Chat — tmi.js

**Library**: [`tmi.js`](https://github.com/tmijs/tmi.js) (MIT licence, 3k+ stars, actively maintained)

```bash
npm install tmi.js
npm install @types/tmi.js -D
```

**Connection**: Connects to `irc.chat.twitch.tv` via WebSocket (Twitch wraps IRC in WS).

**Auth**: Requires a bot account with an OAuth token. Minimum scope: `chat:read` for reading only, `chat:edit` to send responses.

**Setup flow**:
1. Streamer registers a Twitch Developer Application at `dev.twitch.tv`
2. StreamSpin redirects to Twitch OAuth (`/auth/twitch`) with scopes: `chat:read chat:edit channel:read:redemptions`
3. Twitch redirects back with an authorization code
4. Server exchanges code for access + refresh tokens
5. Tokens stored in `config.json` — never exposed to browser

**Rate Limits (as of 2025)**:
- Regular bot: 20 messages per 30 seconds per channel
- Verified bot: 500 messages per 30 seconds per channel
- Command responses should use a cooldown to avoid hitting limits

**Command Parsing Best Practice**:
```typescript
client.on('message', (channel, tags, message, self) => {
  if (self) return; // ignore own messages
  if (!message.startsWith('!')) return;
  const [command, ...args] = message.slice(1).split(' ');
  // handle command
});
```

**User Permission Check**: `tags['mod']`, `tags['badges']?.broadcaster` — use these to gate moderator-only commands.

**Gotcha**: tmi.js reconnects automatically. Don't implement your own reconnect logic on top of it — it causes duplicate event handlers.

### Channel Points — EventSub

**Approach**: Twitch's EventSub over WebSocket (introduced 2023, replaces PubSub).

**Relevant subscription type**: `channel.channel_points_custom_reward_redemption.add`

**Auth**: Requires `channel:read:redemptions` scope on the broadcaster's token.

**How to get the Reward ID**: Streamers create a custom Channel Point reward in their Twitch dashboard. The Reward ID is a UUID that can be retrieved via `GET https://api.twitch.tv/helix/channel_points/custom_rewards`.

**Implementation notes**:
- EventSub WebSocket sessions expire after ~10 minutes of inactivity — must send keepalives
- Use Twitch's official `twitch-eventsub-ws` approach or implement the reconnect flow manually
- Auto-fulfil redemptions via `PATCH /helix/channel_points/custom_rewards/redemptions` to avoid a queue backlog

**Alternative**: StreamElements/Streamlabs bots can relay channel point events via their own webhooks, but this adds a dependency.

### Recommended OAuth Scopes
```
chat:read
chat:edit
channel:read:redemptions
channel:manage:redemptions
moderator:read:chat_settings
```

---

## Kick

### Overview
Kick is a newer platform (launched 2022) with a rapidly evolving and not fully documented API. As of Q1 2026, there is **no official bot API** with OAuth, but chat is readable without authentication.

### Chat Reading — Pusher WebSocket

Kick uses [Pusher](https://pusher.com) as their WebSocket infrastructure for chat delivery. This is discoverable by inspecting Kick's network traffic in a browser.

**Library**: `pusher-js` (official Pusher client — works in Node.js and browser)

```bash
npm install pusher-js
```

**Connection**:
```typescript
import Pusher from 'pusher-js';

const pusher = new Pusher('32cbd69e4b950bf97679', {
  cluster: 'us2',
  forceTLS: true,
});

const channel = pusher.subscribe(`chatrooms.${chatroomId}.v2`);
channel.bind('App\\Events\\ChatMessageEvent', (data) => {
  // data.content is the message text
  // data.sender.username is the sender
  // data.sender.is_moderator for mod check
});
```

**Getting the Chatroom ID**: Fetch `https://kick.com/api/v1/channels/{channelSlug}` — the response includes `chatroom.id`. This does NOT require authentication.

**Gotcha**: The Pusher app key `32cbd69e4b950bf97679` and cluster `us2` are Kick's own Pusher credentials — they appear to be stable but are technically undocumented. If Kick changes them, the integration breaks until updated.

**Limitations**:
- **Read-only** — no official way to send messages as a bot to Kick chat without a full browser session
- Cannot send chat responses without browser automation (Puppeteer) — avoid this approach (ToS risk)
- No channel points or redemption system as of Q1 2026

### Kick Official API (v2)
Kick announced an official API program in 2024. As of Q1 2026:
- There is a `kick.com/api/v2` with some public endpoints
- OAuth for bots is in limited beta (apply at `kick.com/developers`)
- Check [kick.com/developers](https://kick.com/developers) for current status before implementation

### Workaround for Chat Responses
If you need to send chat messages from Kick, options are:
1. **Wait for official bot API** (recommended)
2. **Manual notifications** — use StreamSpin's on-screen display instead of chat responses
3. **Nightbot/StreamElements** — these bots have unofficial Kick support; StreamSpin could trigger them via their APIs

---

## OnlyFans

### Overview
OnlyFans does not have a public API for live streaming or chat integration as of Q1 2026. Their platform is primarily content-gated and not designed for third-party integrations.

### What Doesn't Work (and Why)
- **No official live stream API** — OnlyFans live streams are browser-only
- **No chat bot API** — chat is read/write only through the web UI
- **Browser automation (Puppeteer)** — technically possible but: violates ToS, unstable, session management is fragile, and risks account bans
- **Reverse-engineering the API** — possible but legally grey and will break on any platform update

### Recommended Approach: Manual Webhook Trigger
For OnlyFans streamers, the recommended workflow is:

1. Streamer keeps StreamSpin's Editor open in a browser tab during their stream
2. The **"Spin Now"** button in the Editor triggers a spin immediately
3. Alternatively, a physical **Elgato Stream Deck** button can call `POST /api/trigger` via the Stream Deck Web Requests plugin

This is actually ergonomically fine for OnlyFans streams — most OF streamers trigger spins manually in response to tips/subscriptions anyway, which they read from the OF UI.

### Future
Monitor `onlyfans.com/developers` (does not currently exist) and the OF community for any API announcements. The integration module is stubbed out in `src/integrations/onlyfans/` as a webhook receiver, ready to be extended.

---

## Third-Party Aggregators

These services sit between the streaming platforms and StreamSpin and can simplify multi-platform integration:

### Streamlabs Cloudbot
- Has a chat API that works across Twitch, YouTube, and (unofficially) Kick
- Supports custom API calls from chatbot commands
- A Streamlabs command could call `POST /api/trigger` on StreamSpin
- **Limitation**: Adds a dependency on Streamlabs account and internet connection

### StreamElements
- Similar to Streamlabs — supports Twitch, YouTube, Kick
- Has a WebSocket-based "overlay" system — theoretically a StreamElements overlay event could be forwarded to StreamSpin
- More dev-friendly API documentation than Streamlabs

### Recommendation
For **Phase 3**, implement native Twitch and Kick integrations first (most streamers are on one or both). Document the StreamElements/Streamlabs webhook approach as an advanced option for multi-platform streamers. This avoids adding external service dependencies to the core tool.

---

## Stream Deck Integration

Elgato Stream Deck users can trigger spins without any StreamSpin UI interaction:

1. Install the **Web Requests** plugin (free, from Elgato Marketplace)
2. Create a button action: POST to `http://localhost:3000/api/trigger`
3. Set header `Content-Type: application/json` and body `{"secret": "YOUR_WEBHOOK_SECRET"}`

This is worth documenting prominently — Stream Decks are near-universal among professional streamers.

---

## Summary Table

| Feature | Twitch | Kick | OnlyFans |
|---|---|---|---|
| Chat reading | ✅ Official (tmi.js) | ✅ Unofficial (Pusher) | ❌ |
| Chat writing (bot responses) | ✅ Official (tmi.js) | ❌ No official API | ❌ |
| Channel Points / Rewards | ✅ EventSub | ❌ | ❌ |
| OAuth / Auth | ✅ Full OAuth 2.0 | Partial (beta) | ❌ |
| Trigger via webhook | ✅ | ✅ | ✅ (only option) |
| Stability | High | Medium | N/A |
| Implementation complexity | Medium | Low (read-only) | Trivial |

---

## References

- Twitch Dev Portal: `dev.twitch.tv`
- Twitch EventSub Docs: `dev.twitch.tv/docs/eventsub`
- tmi.js GitHub: `github.com/tmijs/tmi.js`
- Kick Dev Portal: `kick.com/developers`
- Pusher JS Docs: `pusher.com/docs/channels/getting_started/javascript`
- OBS Browser Source Docs: `obsproject.com/wiki/Sources-Guide#browser-source`
- Elgato Web Requests Plugin: Elgato Marketplace
