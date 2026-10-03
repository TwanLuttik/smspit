import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';

process.env.DB_PATH = ':memory:';

import { initDatabase, closeDatabase, db } from '../src/db.js';
import { messagesRoutes } from '../src/routes/messages.js';
import { callsRoutes } from '../src/routes/calls.js';
import { healthRoutes } from '../src/routes/health.js';

async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify();
  // replicate the form parser from index.ts (minimal)
  app.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string' },
    (req, body, done) => {
      const params = new URLSearchParams(body as string);
      const obj: Record<string, string> = {};
      params.forEach((v, k) => (obj[k] = v));
      done(null, obj);
    }
  );
  await app.register(messagesRoutes);
  await app.register(callsRoutes);
  await app.register(healthRoutes);
  return app;
}

describe('API routes (messages + calls + health)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    initDatabase();
    app = await buildServer();
  });

  afterAll(async () => {
    await app.close();
    closeDatabase();
  });

  beforeEach(() => {
    db.exec('DELETE FROM messages; DELETE FROM calls;');
  });

  it('POST /Messages.json validates required fields (To + From + Body)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/2010-04-01/Accounts/ACr/Messages.json',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'To=%2B100', // missing From + Body
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.code).toBe(21201);
  });

  it('creates message via Twilio-style POST and returns 201 + shape', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/2010-04-01/Accounts/ACr/Messages.json',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: new URLSearchParams({ From: '+1', To: '+2', Body: 'hi routes' }).toString(),
    });
    expect(res.statusCode).toBe(201);
    const msg = JSON.parse(res.body);
    expect(msg.sid).toMatch(/^SM/);
    expect(msg.body).toBe('hi routes');
  });

  it('GET messages list + individual + delete', async () => {
    // seed
    await app.inject({
      method: 'POST',
      url: '/2010-04-01/Accounts/ACr/Messages.json',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'From=%2B1&To=%2B2&Body=testlist',
    });

    const list = await app.inject({ method: 'GET', url: '/2010-04-01/Accounts/ACr/Messages.json' });
    const parsed = JSON.parse(list.body);
    expect(parsed.messages.length).toBe(1);
    const sid = parsed.messages[0].sid;

    const single = await app.inject({ method: 'GET', url: `/2010-04-01/Accounts/ACr/Messages/${sid}.json` });
    expect(single.statusCode).toBe(200);

    const del = await app.inject({ method: 'DELETE', url: `/2010-04-01/Accounts/ACr/Messages/${sid}.json` });
    expect(del.statusCode).toBe(204);
  });

  it('POST /Calls.json requires To + From + (Url|Twiml|ApplicationSid)', async () => {
    const bad = await app.inject({
      method: 'POST',
      url: '/2010-04-01/Accounts/ACc/Calls.json',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'To=%2B1&From=%2B2',
    });
    expect(bad.statusCode).toBe(400);

    const good = await app.inject({
      method: 'POST',
      url: '/2010-04-01/Accounts/ACc/Calls.json',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: new URLSearchParams({ From: '+1', To: '+2', Twiml: '<Response/>' }).toString(),
    });
    expect(good.statusCode).toBe(201);
  });

  it('GET /Calls + individual + status update + dtmf', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/2010-04-01/Accounts/ACc/Calls.json',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'From=%2B1&To=%2B2&Twiml=%3CResponse%2F%3E',
    });
    const call = JSON.parse(create.body);
    expect(call.status).toBe('ringing');

    const list = await app.inject({ method: 'GET', url: '/2010-04-01/Accounts/ACc/Calls.json' });
    expect(JSON.parse(list.body).calls.length).toBe(1);

    const upd = await app.inject({
      method: 'POST',
      url: `/2010-04-01/Accounts/ACc/Calls/${call.sid}.json`,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'Status=completed',
    });
    expect(upd.statusCode).toBe(200);
    expect(JSON.parse(upd.body).status).toBe('completed');

    // internal api
    const apiCalls = await app.inject({ method: 'GET', url: '/api/calls' });
    expect(apiCalls.statusCode).toBe(200);
  });

  it('health + /api/messages (internal)', async () => {
    const h = await app.inject({ method: 'GET', url: '/health' });
    expect(h.statusCode).toBe(200);
    expect(JSON.parse(h.body).status).toBe('ok');

    const msgs = await app.inject({ method: 'GET', url: '/api/messages' });
    expect(msgs.statusCode).toBe(200);
  });

  it('GET /api/messages?to= filters the inbox', async () => {
    await app.inject({
      method: 'POST',
      url: '/2010-04-01/Accounts/ACr/Messages.json',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'From=%2B1&To=%2B15550001111&Body=keep',
    });
    await app.inject({
      method: 'POST',
      url: '/2010-04-01/Accounts/ACr/Messages.json',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'From=%2B1&To=%2B15550002222&Body=skip',
    });

    const filtered = await app.inject({ method: 'GET', url: '/api/messages?to=%2B15550001111' });
    expect(filtered.statusCode).toBe(200);
    const body = JSON.parse(filtered.body);
    expect(body.total).toBe(1);
    expect(body.messages[0].body).toBe('keep');
  });

  it('DELETE /api/messages purges the inbox', async () => {
    await app.inject({
      method: 'POST',
      url: '/2010-04-01/Accounts/ACr/Messages.json',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'From=%2B1&To=%2B2&Body=purge-me',
    });

    const del = await app.inject({ method: 'DELETE', url: '/api/messages' });
    expect(del.statusCode).toBe(200);
    expect(JSON.parse(del.body).deleted).toBe(1);

    const list = await app.inject({ method: 'GET', url: '/api/messages' });
    expect(JSON.parse(list.body).total).toBe(0);
  });

  it('POST Messages.json rejects magic To numbers with 21211 / 21614', async () => {
    const invalid = await app.inject({
      method: 'POST',
      url: '/2010-04-01/Accounts/ACr/Messages.json',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: new URLSearchParams({ From: '+1', To: '+12025550001', Body: 'nope' }).toString(),
    });
    expect(invalid.statusCode).toBe(400);
    expect(JSON.parse(invalid.body).code).toBe(21211);

    const undeliverable = await app.inject({
      method: 'POST',
      url: '/2010-04-01/Accounts/ACr/Messages.json',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: new URLSearchParams({ From: '+1', To: '2025550009', Body: 'nope' }).toString(),
    });
    expect(undeliverable.statusCode).toBe(400);
    expect(JSON.parse(undeliverable.body).code).toBe(21614);

    const leftover = await app.inject({ method: 'GET', url: '/api/messages' });
    expect(JSON.parse(leftover.body).total).toBe(0);
  });

  it('POST Messages.json accepts WhatsApp and rejects a mixed channel pair', async () => {
    const ok = await app.inject({
      method: 'POST',
      url: '/2010-04-01/Accounts/ACr/Messages.json',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: new URLSearchParams({
        From: 'whatsapp:+15551234567',
        To: 'WhatsApp:+15559876543',
        Body: 'wa hello',
      }).toString(),
    });
    expect(ok.statusCode).toBe(201);
    const created = JSON.parse(ok.body);
    expect(created.from).toBe('whatsapp:+15551234567');
    expect(created.to).toBe('whatsapp:+15559876543');
    expect(created.direction).toBe('outbound-api');

    const mixed = await app.inject({
      method: 'POST',
      url: '/2010-04-01/Accounts/ACr/Messages.json',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: new URLSearchParams({
        From: '+15551234567',
        To: 'whatsapp:+15559876543',
        Body: 'nope',
      }).toString(),
    });
    expect(mixed.statusCode).toBe(400);
    expect(JSON.parse(mixed.body).code).toBe(21910);
  });

  it('POST Messages.json keeps WhatsApp ContentSid and ContentVariables', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/2010-04-01/Accounts/ACr/Messages.json',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: new URLSearchParams({
        From: 'whatsapp:+15554253191',
        To: 'whatsapp:+16722000498',
        ContentSid: 'HXticketcode',
        ContentVariables: JSON.stringify({ '1': 'Night Owl', '2': '4821' }),
      }).toString(),
    });
    expect(res.statusCode).toBe(201);
    const msg = JSON.parse(res.body);
    expect(msg.body).toBe('');
    expect(msg.content_sid).toBe('HXticketcode');
    expect(JSON.parse(msg.content_variables)).toEqual({ '1': 'Night Owl', '2': '4821' });
  });

  it('POST /api/messages receives an inbound WhatsApp message', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/messages',
      headers: { 'content-type': 'application/json' },
      payload: {
        From: '+15550001111',
        To: '+15551234567',
        Body: 'arrived on WhatsApp',
        Channel: 'whatsapp',
      },
    });
    expect(res.statusCode).toBe(201);
    const msg = JSON.parse(res.body);
    expect(msg.direction).toBe('inbound');
    expect(msg.status).toBe('received');
    expect(msg.from).toBe('whatsapp:+15550001111');
    expect(msg.to).toBe('whatsapp:+15551234567');
    expect(msg.body).toBe('arrived on WhatsApp');

    const missing = await app.inject({
      method: 'POST',
      url: '/api/messages',
      headers: { 'content-type': 'application/json' },
      payload: { From: '+1', Channel: 'whatsapp' },
    });
    expect(missing.statusCode).toBe(400);
    expect(JSON.parse(missing.body).code).toBe(21201);

    const badChannel = await app.inject({
      method: 'POST',
      url: '/api/messages',
      headers: { 'content-type': 'application/json' },
      payload: { From: '+1', To: '+2', Body: 'x', Channel: 'fax' },
    });
    expect(badChannel.statusCode).toBe(400);
  });

  it('covers not-found, lastPoll, invalid call status update', async () => {
    // message 404
    const nf = await app.inject({ method: 'GET', url: '/2010-04-01/Accounts/ACx/Messages/SMdoesnotexist.json' });
    expect(nf.statusCode).toBe(404);

    // call 404
    const cn = await app.inject({ method: 'GET', url: '/2010-04-01/Accounts/ACx/Calls/CAdonot.json' });
    expect(cn.statusCode).toBe(404);

    // invalid status update
    const c = await app.inject({
      method: 'POST',
      url: '/2010-04-01/Accounts/ACx/Calls.json',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'From=%2B1&To=%2B2&Twiml=%3CResponse/%3E',
    });
    const sid = JSON.parse(c.body).sid;

    const badStatus = await app.inject({
      method: 'POST',
      url: `/2010-04-01/Accounts/ACx/Calls/${sid}.json`,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'Status=foo',
    });
    expect(badStatus.statusCode).toBe(400);

    // lastPoll paths
    const pollMsg = await app.inject({ method: 'GET', url: '/api/messages?lastPoll=2020-01-01T00:00:00.000Z' });
    expect(pollMsg.statusCode).toBe(200);
    const pollCall = await app.inject({ method: 'GET', url: '/api/calls?lastPoll=2020-01-01T00:00:00.000Z' });
    expect(pollCall.statusCode).toBe(200);

    await app.inject({
      method: 'POST',
      url: '/2010-04-01/Accounts/ACx/Messages.json',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'From=%2B1&To=%2B15550001111&Body=poll-keep',
    });
    const pollTo = await app.inject({
      method: 'GET',
      url: '/api/messages?lastPoll=2020-01-01T00:00:00.000Z&to=%2B15550001111',
    });
    expect(JSON.parse(pollTo.body).messages.length).toBe(1);
  });
});
