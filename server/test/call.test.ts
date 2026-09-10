import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';

process.env.DB_PATH = ':memory:';

import { initDatabase, closeDatabase, db } from '../src/db.js';
import {
  createCall,
  listCalls,
  getCall,
  getCallsSince,
  updateCallStatus,
  recordDtmf,
} from '../src/services/call.js';

describe('call service', () => {
  beforeAll(() => {
    initDatabase();
  });

  afterAll(() => {
    closeDatabase();
  });

  beforeEach(() => {
    db.exec('DELETE FROM calls');
  });

  it('creates a call in ringing state with correct mapping', () => {
    const call = createCall('ACcall', {
      To: '+19998887777',
      From: '+15556667777',
      Twiml: '<Response><Say>hi</Say></Response>',
    });

    expect(call.sid).toMatch(/^CA[0-9a-f]{32}$/);
    expect(call.status).toBe('ringing');
    expect(call.direction).toBe('outbound-api');
    expect(call.duration).toBe(0);
    expect(call.twiml).toContain('<Say>');
    expect(call.voice_url).toBeNull();
  });

  it('listCalls supports pagination, filters, newest first', async () => {
    createCall('ACp', { To: '+1', From: '+2', Twiml: '<Response/>' });
    await new Promise(r => setTimeout(r, 2));
    createCall('ACp', { To: '+3', From: '+2', Twiml: '<Response/>' });
    await new Promise(r => setTimeout(r, 2));
    createCall('ACp', { To: '+4', From: '+5', Twiml: '<Response/>' });

    const res = listCalls('ACp', { pageSize: 2, page: 1 });
    expect(res.total).toBe(3);
    expect(res.calls.length).toBe(2);
    expect(res.calls[0].to).toBe('+4'); // newest

    const filtered = listCalls('ACp', { from: '2' });
    expect(filtered.total).toBe(2);
  });

  it('getCall respects account sid', () => {
    const c = createCall('ACown', { To: '+1', From: '+2', Twiml: 'x' });
    expect(getCall('ACown', c.sid)).toBeTruthy();
    expect(getCall('NOPE', c.sid)).toBeNull();
  });

  it('updateCallStatus to terminal computes duration and end_time', () => {
    const c = createCall('ACdur', { To: '+1', From: '+2', Twiml: '<Say/>' });
    // move forward in time by faking via direct update of start_time then call update fn
    const past = new Date(Date.now() - 7300).toISOString();
    db.prepare('UPDATE calls SET start_time = ? WHERE sid = ?').run(past, c.sid);

    const updated = updateCallStatus('ACdur', c.sid, 'completed');
    expect(updated).toBeTruthy();
    expect(updated!.status).toBe('completed');
    expect(updated!.duration).toBeGreaterThanOrEqual(7);
    expect(updated!.end_time).toBeTruthy();
  });

  it('recordDtmf appends digits and updates timestamp', () => {
    const c = createCall('ACdt', { To: '+1', From: '+2', Twiml: 'x' });
    const d1 = recordDtmf('ACdt', c.sid, '1');
    const d2 = recordDtmf('ACdt', c.sid, '9');
    expect(d2!.digits).toBe('19');
  });

  it('getCallsSince works', async () => {
    const ts = new Date().toISOString();
    await new Promise(r => setTimeout(r, 1));
    createCall('ACs', { To: '+x', From: '+y', Twiml: '<Response/>' });
    const later = getCallsSince('ACs', ts);
    expect(later.length).toBe(1);
  });
});
