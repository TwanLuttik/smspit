import { beforeAll, afterAll, describe, it, expect } from 'vitest';

process.env.DB_PATH = ':memory:';

import { initDatabase, closeDatabase, db } from '../src/db.js';

describe('db initialization', () => {
  beforeAll(() => {
    initDatabase();
  });

  afterAll(() => {
    closeDatabase();
  });

  it('creates messages and calls tables + indexes', () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
    const names = tables.map(t => t.name);
    expect(names).toContain('messages');
    expect(names).toContain('calls');

    // sanity: can insert via the schema
    const ins = db.prepare('INSERT INTO messages (sid, account_sid, body, "from", "to") VALUES (?,?,?,?,?)');
    ins.run('SMtestdb1234567890abcdef1234567890ab', 'ACdb', 'hi', '+1', '+2');
    const row = db.prepare('SELECT * FROM messages WHERE sid = ?').get('SMtestdb1234567890abcdef1234567890ab') as any;
    expect(row).toBeTruthy();
    expect(row.status).toBe('queued'); // default in schema before service overrides
  });

  it('safe migration for digits column does not explode', () => {
    // calling init again is safe
    initDatabase();
    const cols = db.prepare("PRAGMA table_info(calls)").all() as any[];
    const hasDigits = cols.some((c: any) => c.name === 'digits');
    expect(hasDigits).toBe(true);
  });
});
