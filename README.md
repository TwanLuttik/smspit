# SMSPit

A mock Twilio SMS server with a web UI for developers. SMSPit intercepts SMS messages sent via the Twilio API and displays them in a real-time web interface, similar to how [Mailpit](https://github.com/axllent/mailpit) works for email.

## Features

- **Mock Twilio API** - Fully compatible with the Twilio Node.js SDK
- **Web UI** - View all sent SMS messages with filtering
- **Real-time updates** - Automatic polling every 2 seconds
- **SQLite storage** - Persistent message storage
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

### Internal API (Web UI)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/messages` | List all messages |
| `GET` | `/api/messages?lastPoll=<timestamp>` | Poll for new messages |
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

Messages are automatically set to `delivered` status. Supported statuses:

- `queued`
- `sending`
- `sent`
- `delivered`
- `failed`
- `undelivered`
- `received`

## License

MIT