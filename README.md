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

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm run dev
```

3. Start the web UI (in another terminal):
```bash
npm run dev:web
```

4. Open http://localhost:4011 in your browser

### Docker

```bash
docker-compose up --build
```

Access the web UI at http://localhost:4010/web

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

### Internal API (Web UI)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/messages` | List all messages |
| `GET` | `/api/messages` | List messages (initial load) |
| `GET` | `/api/calls` | List calls (initial load) |
| `WS`  | `/ws` | Real-time push of new messages & calls |
| `GET` | `/health` | Health check |
| `GET` | `/web` | Web UI |

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