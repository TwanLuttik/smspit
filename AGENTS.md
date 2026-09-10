# AGENTS.md

This file provides guidance to AI coding agents (and human developers) when working with the SMSPit codebase.

## Project Overview

SMSPit is a mock Twilio SMS + Voice server for local development and testing, inspired by Mailpit. It provides a drop-in compatible Twilio REST API (messages + calls) and a real-time web UI for inspecting traffic.

- **Backend**: Fastify (Node.js), TypeScript, better-sqlite3 (WAL mode), nanoid (not used for SIDs), native WebSocket via @fastify/websocket.
- **Frontend**: Vite + React 19 + TypeScript + Tailwind CSS v4. Custom UI (migrating toward shadcn/ui patterns).
- **Package manager**: pnpm (workspaces). Root `package.json` defines `server` and `web` packages.
- **Storage**: Single SQLite file (`smspit.db` or `$DB_PATH`). Messages and calls are stored with Twilio-like shapes.
- **Real-time**: WebSocket `/ws` broadcasts `new_message`, `new_call`, `call_updated`, `dtmf`, `connected`.
- **Compatibility**: Accepts `application/x-www-form-urlencoded` (Twilio SDK style) and returns JSON exactly as Twilio does (with some simplifications).

## Key Commands

```bash
pnpm install                 # install all workspaces
pnpm dev                     # run both server + web in parallel
pnpm dev:server              # only backend (Fastify on :4010)
pnpm dev:web                 # only frontend (Vite on :4011)
pnpm --filter @smspit/server build
pnpm --filter @smspit/web build
pnpm --filter @smspit/server test
pnpm --filter @smspit/server test:cov   # with coverage
```

Docker: `docker-compose up --build` (web UI served at /web from the API container).

Environment variables (see README):
- `TWILIO_HOST`, `TWILIO_PORT` (default 4010)
- `WEB_PORT` (4011 for standalone web)
- `DB_PATH`

## Architecture & Important Details

### Backend (server/src)

- `index.ts`: Creates Fastify instance, registers CORS + WS plugin, content-type parser for form-urlencoded, registers route plugins, serves root info, starts listener. Also handles graceful DB close on SIGTERM/SIGINT.
- `db.ts`: Creates singleton `better-sqlite3` instance. `initDatabase()` runs DDL (CREATE TABLE + indexes) + a safe ALTER migration for the `digits` column. `closeDatabase()`.
  - For tests you can set `process.env.DB_PATH = ':memory:'` (or a temp file) **before** importing modules that pull in `db`.
- `services/message.ts` + `services/call.ts`: Core business logic.
  - SID generation is custom (SM + 32 hex chars, CA + 32 hex). Not nanoid.
  - Message: auto `delivered`, segments calculated (160/153 rule).
  - Call: starts as `ringing`, duration calculated on terminal status transitions in `updateCallStatus`.
  - `recordDtmf` appends digits (used by simulator).
  - `get*Since` used by the internal polling fallback + WS initial load.
- `routes/messages.ts`, `routes/calls.ts`, `routes/health.ts`:
  - Full Twilio-style error responses (status + code + more_info links).
  - Validation for required params (To/From/Body or Twiml/Url etc.).
  - Internal `/api/messages` and `/api/calls` support `?lastPoll=...` for polling clients.
  - Call update POST accepts limited terminal + in-progress statuses.
- `ws.ts`: Simple in-memory Set of sockets. Broadcast helpers. Registers the `/ws` route.
- `types/index.ts`: Source of truth for Twilio* shapes, Create*Input, row types, status unions. Web also has a slimmed `web/src/types`.

**Never** mutate the DB directly outside services. All Twilio response shaping lives in `rowTo*` mappers.

### Frontend (web/src)

- Main layout is a two-pane (list + detail) + optional simulator sidebar. Tabbed between Messages / Calls.
- Data source: `useWebSocket` hook (preferred — real-time). There's a legacy `usePolling` hook (not used in current App).
- All components currently use heavy inline `style` objects (legacy). New work should prefer Tailwind + `cn()` utility.
- Simulators (SMSSimulator, CallSimulator): allow sending test messages/calls + interactive DTMF without leaving the UI. They can be floating or docked.
- Theme: `useTheme` + class-based dark. We now default to dark + sharp + compact aesthetic.
- shadcn/ui: `components.json` is present with aliases (`@/components/ui`). Add new components under `web/src/components/ui/` following the shadcn pattern (cva + `cn` + CSS vars). Current primitives to favor: Button, Input, Textarea, Badge, Card, Dialog (simple or radix).
- No heavy external component library — keep footprint small.

### Testing (Backend)

- Use Vitest (see server/package.json after setup).
- Preferred patterns:
  - Services: unit test pure functions + side effects against an isolated DB (use `:memory:` or temp file + truncate between tests).
  - Routes: Use Fastify's `.inject()` API — no real HTTP server required. Register only the route plugin(s) you need after calling `initDatabase()`.
  - Always clean up: `closeDatabase()` in afterAll when using file DBs.
- Aim for 85%+ statement/branch coverage on services + routes. Focus on:
  - Validation branches
  - Pagination + filters
  - Status transitions + duration math
  - DTMF accumulation
  - Error response shapes
- Do not test the `start()` server bootstrap unless via integration smoke.

### Docs Site

- Static site lives in `/docs`. It is designed to be served directly by GitHub Pages (point Pages at the `/docs` folder on main, or use a simple `docs.yml` workflow if desired).
- Keep it self-contained (no build step). Update HTML/CSS/JS together.
- Include usage examples for both Node and at least one other language, full API tables, Docker, and screenshots placeholders.

### UI Styling Conventions (Post Redesign)

- Dark-first, sharp corners (`rounded-sm` / `rounded` or explicit `rounded-[2px]`), compact density.
- Spacing scale: use `gap-1` / `gap-2`, `p-2` `px-2.5` `py-1.5`, `text-sm` / `text-xs` as primary.
- Prefer CSS variables from `:root` / `.dark` (or shadcn tokens `--background`, `--foreground`, `--card`, `--border`, `--accent` etc.).
- Use the `cn()` helper from `@/lib/utils` when merging classes.
- Remove or drastically reduce inline `style={{}}` in new code.

### Common Pitfalls

- SID generation and segment calculation have specific business logic — match them exactly in tests.
- Form-urlencoded parser lives only in `index.ts`; route tests that POST must send body as string or let Fastify test helpers handle it.
- The call "simulator" in UI fakes ringing/answer timing and speechSynthesis; the backend call record is immediately created in `ringing`.
- WebSocket hook dedupes by SID on arrival.
- Database migration for `digits` column is intentionally defensive (catch + ignore).
- When adding new API fields, update both server `types`, the row mapper, the DB create/select, and the web `types/index.ts`.

## Contribution / AI Agent Workflow

1. Make focused changes. Prefer editing one concern at a time (e.g. only a service + its tests).
2. For UI: first update CSS vars + create/reuse ui/ primitive, then port one component.
3. Run `pnpm --filter @smspit/server test:cov` locally before considering backend work done. Keep coverage in the 80-90%+ band.
4. If you touch routes, also exercise validation error cases.
5. Update README.md when public behavior or env vars change.
6. The docs/ site must remain a working static site — test by simply opening `docs/index.html` in a browser.
7. Never commit `smspit.db`, `node_modules/`, or `dist/`.

Happy mocking!
