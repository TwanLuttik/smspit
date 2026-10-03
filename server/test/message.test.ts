import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';

// IMPORTANT: set DB to memory before importing db/service
process.env.DB_PATH = ':memory:';

import { initDatabase, closeDatabase, db } from '../src/db.js';
import { createMessage, listMessages, getMessage, deleteMessage, getMessagesSince, deleteAllMessages, lookupMagicToError, lookupChannelPairError } from '../src/services/message.js';

describe('message service', () => {
  beforeAll(() => {
    initDatabase();
  });

  afterAll(() => {
    closeDatabase();
  });

  beforeEach(() => {
    // clean between tests
    db.exec('DELETE FROM messages');
  });

  it('creates a message with correct defaults and segments', () => {
    const msg = createMessage('AC123', {
      To: '+15551234567',
      From: '+15559876543',
      Body: 'Hello world from tests',
    });

    expect(msg.sid).toMatch(/^SM[0-9a-f]{32}$/);
    expect(msg.status).toBe('delivered');
    expect(msg.direction).toBe('outbound-api');
    expect(msg.num_segments).toBe(1);
    expect(msg.body).toBe('Hello world from tests');
    expect(msg.account_sid).toBe('AC123');
  });

  it('calculates num_segments > 1 for long bodies', () => {
    const longBody = 'x'.repeat(200);
    const msg = createMessage('AC123', { To: '+1', From: '+2', Body: longBody });
    expect(msg.num_segments).toBeGreaterThan(1);
  });

  it('lists messages newest first with pagination', async () => {
    createMessage('AC1', { To: '+100', From: '+200', Body: 'one' });
    await new Promise(r => setTimeout(r, 2));
    createMessage('AC1', { To: '+100', From: '+200', Body: 'two' });
    await new Promise(r => setTimeout(r, 2));
    createMessage('AC1', { To: '+100', From: '+200', Body: 'three' });

    const page1 = listMessages('AC1', { page: 1, pageSize: 2 });
    expect(page1.messages.length).toBe(2);
    expect(page1.total).toBe(3);
    // newest first (by created_at)
    expect(page1.messages[0].body).toBe('three');

    const page2 = listMessages('AC1', { page: 2, pageSize: 2 });
    expect(page2.messages.length).toBe(1);
  });

  it('filters by from, to, status, bodySearch', () => {
    createMessage('ACx', { To: '+999', From: '+111', Body: 'alpha test' });
    createMessage('ACx', { To: '+888', From: '+222', Body: 'beta' });

    const byFrom = listMessages('ACx', { from: '111' });
    expect(byFrom.total).toBe(1);

    const byBody = listMessages('ACx', { bodySearch: 'alpha' });
    expect(byBody.total).toBe(1);

    const byTo = listMessages('ACx', { to: '888' });
    expect(byTo.total).toBe(1);
  });

  it('getMessage + deleteMessage work and scope to account', () => {
    const m = createMessage('ACscoped', { To: '+1', From: '+2', Body: 'scoped' });
    expect(getMessage('ACscoped', m.sid)).toBeTruthy();
    expect(getMessage('OTHER', m.sid)).toBeNull();

    expect(deleteMessage('ACscoped', m.sid)).toBe(true);
    expect(getMessage('ACscoped', m.sid)).toBeNull();
    expect(deleteMessage('ACscoped', m.sid)).toBe(false);
  });

  it('getMessagesSince returns recent updates', async () => {
    const before = new Date().toISOString();
    // wait a tiny bit to ensure timestamp difference
    await new Promise(r => setTimeout(r, 2));
    createMessage('ACt', { To: '+a', From: '+b', Body: 'recent' });
    const recent = getMessagesSince('ACt', before);
    expect(recent.length).toBe(1);
  });

  it('getMessagesSince filters by to', async () => {
    const before = new Date().toISOString();
    await new Promise(r => setTimeout(r, 2));
    createMessage('ACt', { To: '+15550001111', From: '+b', Body: 'keep' });
    createMessage('ACt', { To: '+15550002222', From: '+b', Body: 'skip' });
    const filtered = getMessagesSince('ACt', before, { to: '0001111' });
    expect(filtered.length).toBe(1);
    expect(filtered[0].body).toBe('keep');
  });

  it('deleteAllMessages purges the inbox', () => {
    createMessage('AC1', { To: '+1', From: '+2', Body: 'one' });
    createMessage('AC2', { To: '+3', From: '+4', Body: 'two' });
    expect(deleteAllMessages()).toBe(2);
    expect(listMessages('').total).toBe(0);
    expect(deleteAllMessages()).toBe(0);
  });

  it('lookupMagicToError maps 21211 / 21614 and ignores other numbers', () => {
    const invalid = lookupMagicToError('+1 202-555-0001');
    expect(invalid?.code).toBe(21211);
    expect(invalid?.message).toContain('+1 202-555-0001');

    const undeliverable = lookupMagicToError('2025550009');
    expect(undeliverable?.code).toBe(21614);

    expect(lookupMagicToError('+15551234567')).toBeNull();
    expect(lookupMagicToError('whatsapp:+12025550001')?.code).toBe(21211);
  });

  it('stores WhatsApp addresses with a lowercase prefix and one segment', () => {
    const msg = createMessage('ACwa', {
      To: 'WhatsApp:+15559876543',
      From: 'whatsapp:+15551234567',
      Body: 'x'.repeat(200),
    });

    expect(msg.from).toBe('whatsapp:+15551234567');
    expect(msg.to).toBe('whatsapp:+15559876543');
    expect(msg.direction).toBe('outbound-api');
    expect(msg.status).toBe('delivered');
    expect(msg.num_segments).toBe(1);
  });

  it('creates an inbound received WhatsApp message', () => {
    const msg = createMessage(
      'ACwa',
      { To: 'whatsapp:+15551234567', From: 'whatsapp:+15550001111', Body: 'ping' },
      { direction: 'inbound', status: 'received' }
    );

    expect(msg.direction).toBe('inbound');
    expect(msg.status).toBe('received');
    expect(msg.from).toBe('whatsapp:+15550001111');
    expect(msg.to).toBe('whatsapp:+15551234567');
  });

  it('stores WhatsApp content templates when Body is omitted', () => {
    const msg = createMessage('ACwa', {
      To: 'whatsapp:+16722000498',
      From: 'whatsapp:+15554253191',
      ContentSid: 'HXticketcode',
      ContentVariables: JSON.stringify({ '1': 'Night Owl', '2': '4821' }),
    });

    expect(msg.body).toBe('');
    expect(msg.content_sid).toBe('HXticketcode');
    expect(msg.content_variables).toBe(JSON.stringify({ '1': 'Night Owl', '2': '4821' }));
    expect(msg.num_media).toBe(0);

    const found = listMessages('ACwa', { bodySearch: 'Night Owl' });
    expect(found.total).toBe(1);
    expect(found.messages[0].sid).toBe(msg.sid);
  });

  it('stores MediaUrl and counts it as media', () => {
    const msg = createMessage('ACwa', {
      To: 'whatsapp:+16722000498',
      From: 'whatsapp:+15554253191',
      MediaUrl: 'https://example.com/ticket.png',
    });
    expect(msg.media_url).toBe('https://example.com/ticket.png');
    expect(msg.num_media).toBe(1);
  });

  it('lookupChannelPairError rejects mixed SMS and WhatsApp addresses', () => {
    expect(lookupChannelPairError('+15551234567', 'whatsapp:+15559876543')?.code).toBe(21910);
    expect(lookupChannelPairError('whatsapp:+15551234567', 'whatsapp:+15559876543')).toBeNull();
    expect(lookupChannelPairError('', 'whatsapp:+15559876543')).toBeNull();
  });
});
