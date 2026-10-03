# SMSPit

A mock Twilio SMS & Voice server with a web UI for developers. SMSPit intercepts SMS messages and voice calls sent via the Twilio API and displays them in a real-time web interface (similar to [Mailpit](https://github.com/axllent/mailpit) for email).

## Features

- **Mock Twilio API** - Fully compatible with the Twilio Node.js SDK (Messages + Calls)
- **Web UI** - View SMS conversations and voice calls with tabs, filtering, and details
- **Real-time updates** - WebSocket (`/ws`) push for new messages and calls (no polling)
- **SQLite storage** - Persistent storage for messages and calls
- **Docker support** - Easy deployment via Docker

## Quick Start

### Development

1. Install dependencies (using pnpm):
```bash
pnpm install
```

2. Start both the API server and web UI (single command):
```bash
pnpm dev
```

3. Open http://localhost:4011 in your browser

Individual scripts are also available:
- `pnpm dev:server` – API server only
- `pnpm dev:web` – web UI only

### Docker

Published image: `ghcr.io/twanluttik/smspit:1.1.0` (also tagged `latest` on `main`).

```bash
docker compose up
```

Until that tag exists on GHCR, build locally:

```bash
docker compose up --build
```

Or from another compose file (e2e / CI):

```yaml
smspit:
  image: ghcr.io/twanluttik/smspit:1.1.0
  ports:
    - "4010:4010"
  healthcheck:
    test: ["CMD", "wget", "-q", "--spider", "http://localhost:4010/health"]
```

Temporary fallback before the image is public:

```yaml
smspit:
  build: https://github.com/TwanLuttik/smspit.git
  ports:
    - "4010:4010"
```

Access the API at http://localhost:4010 and the standalone web UI at http://localhost:4011

## Usage

### Configure Twilio SDK

Point your Twilio client to SMSPit instead of the real Twilio API. The Twilio SDK supports a `host` and `port` option directly in the constructor — no manual `baseUrl` overrides needed:

```javascript
import twilio from 'twilio';

const client = twilio('ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'your_auth_token', {
  host: 'localhost',
  port: 4010,
  timeout: 30000,
});

await client.messages.create({
  body: 'Hello from SMSPit!',
  from: '+1234567890',
  to: '+0987654321',
});
```

WhatsApp uses the same Messages API. Prefix both numbers with `whatsapp:` (Twilio's channel address). A mixed SMS/WhatsApp pair is rejected with error `21910`.

Template sends omit `Body` and pass `ContentSid` plus `ContentVariables` instead. SMSPit stores both and shows the variable values in the thread. A `MediaUrl` is stored and linked from the bubble.

```javascript
await client.messages.create({
  body: 'Hello on WhatsApp',
  from: 'whatsapp:+14155238886',
  to: 'whatsapp:+15005550006',
});
```

To simulate a message a handset sends you, `POST /api/messages` with `Channel=whatsapp`. That stores an inbound message (`direction: inbound`, `status: received`) and pushes it over the WebSocket. The sidebar shows the WhatsApp mark on that conversation.

```bash
curl -X POST http://localhost:4010/api/messages \
  -H 'Content-Type: application/json' \
  -d '{"From":"+15005550006","To":"+14155238886","Body":"hi","Channel":"whatsapp"}'
```

You can also create voice calls:

```javascript
await client.calls.create({
  to: '+0987654321',
  from: '+1234567890',
  url: 'https://demo.twilio.com/docs/voice.xml',
  // or: twiml: '<Response><Say>Hello from SMSPit!</Say></Response>'
});
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TWILIO_HOST` | `0.0.0.0` | Server bind address |
| `TWILIO_PORT` | `4010` | API server port |
| `WEB_PORT` | `4011` | Web UI port (embedded) |
| `DB_PATH` | `./smspit.db` | SQLite database path |

## API Endpoints

### Twilio Compatible API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/2010-04-01/Accounts/:accountSid/Messages.json` | Send SMS |
| `GET` | `/2010-04-01/Accounts/:accountSid/Messages.json` | List messages |
| `GET` | `/2010-04-01/Accounts/:accountSid/Messages/:sid.json` | Get message |
| `DELETE` | `/2010-04-01/Accounts/:accountSid/Messages/:sid.json` | Delete message |
| `POST` | `/2010-04-01/Accounts/:accountSid/Calls.json` | Create call |
| `GET` | `/2010-04-01/Accounts/:accountSid/Calls.json` | List calls |
| `GET` | `/2010-04-01/Accounts/:accountSid/Calls/:sid.json` | Get call |

### Internal API (Web UI / e2e)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/messages` | List messages (optional `?to=` and `?lastPoll=`) |
| `POST` | `/api/messages` | Receive an inbound message (`From`, `To`, `Body`, optional `Channel=sms\|whatsapp`) |
| `DELETE` | `/api/messages` | Purge all messages (`{ deleted: N }`) |
| `GET` | `/api/calls` | List calls (initial load / `?lastPoll=`) |
| `WS`  | `/ws` | Real-time push of new messages & calls |
| `GET` | `/health` | Health check |

`GET /api/messages?to=` filters the inbox the same way Twilio `To=` does (substring match on the stored number). Use this from Playwright / poll helpers; the Twilio list path already accepted `To=`.

`DELETE /api/messages` is the Mailpit-style inbox reset.

### Magic numbers (Twilio error codes)

These destination numbers are rejected on `POST .../Messages.json` so e2e can drop a client-side Twilio mock:

| To (any common formatting) | HTTP | Code | Meaning |
|----------------------------|------|------|---------|
| `+1 202-555-0001` | 400 | `21211` | Invalid destination |
| `+1 202-555-0009` | 400 | `21614` | Not a mobile / cannot receive SMS |

No message row is stored. Other numbers still auto-`delivered`.

`From` and `To` must be the same channel. SMS uses E.164 (`+15551234567`). WhatsApp uses `whatsapp:+15551234567`. A mismatch returns `21910` and stores nothing. The `whatsapp:` prefix is matched case-insensitively and stored in lowercase.

## Project Structure

```
smspit/
├── server/           # Fastify backend
│   ├── src/
│   │   ├── index.ts       # Server entry point
│   │   ├── db.ts          # SQLite connection
│   │   ├── types/         # TypeScript types
│   │   ├── routes/        # API routes
│   │   └── services/      # Business logic
│   └── package.json
├── web/              # Vite + React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks
│   │   └── types/         # TypeScript types
│   └── package.json
├── docker-compose.yml
├── Dockerfile
└── package.json      # Workspace root
```

## Message Status

Messages are automatically set to `delivered` status. Supported statuses: `queued`, `sending`, `sent`, `delivered`, `failed`, `undelivered`, `received`, etc.

## Call Status

Calls are captured on creation and immediately marked `completed` with a synthetic duration (5-50s). Supported statuses:

- `queued`, `initiated`, `ringing`, `in-progress`, `answered`, `completed`
- `busy`, `failed`, `no-answer`, `canceled`

The UI shows the Voice URL / TwiML / Application SID used when the call was created.

## License

MIT