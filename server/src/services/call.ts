import { nanoid } from 'nanoid';
import { db } from '../db.js';
import type {
  TwilioCall,
  CreateCallInput,
  CallRow,
  CallStatus,
  CallDirection,
} from '../types/index.js';

function generateCallSid(): string {
  const chars = '0123456789abcdef';
  let sid = 'CA';
  for (let i = 0; i < 32; i++) {
    sid += chars[Math.floor(Math.random() * chars.length)];
  }
  return sid;
}

function rowToCall(row: CallRow, accountSid: string): TwilioCall {
  return {
    sid: row.sid,
    account_sid: row.account_sid,
    from: row.from,
    to: row.to,
    status: row.status as CallStatus,
    direction: row.direction as CallDirection,
    duration: row.duration,
    start_time: row.start_time,
    end_time: row.end_time,
    price: row.price,
    price_unit: row.price_unit,
    voice_url: row.voice_url,
    voice_method: row.voice_method,
    twiml: row.twiml,
    application_sid: row.application_sid,
    digits: row.digits || null,
    date_created: row.created_at,
    date_updated: row.updated_at,
    api_version: '2010-04-01',
    uri: `/2010-04-01/Accounts/${accountSid}/Calls/${row.sid}.json`,
    subresource_uris: {
      notifications: `/2010-04-01/Accounts/${accountSid}/Calls/${row.sid}/Notifications.json`,
      recordings: `/2010-04-01/Accounts/${accountSid}/Calls/${row.sid}/Recordings.json`,
      feedback: `/2010-04-01/Accounts/${accountSid}/Calls/${row.sid}/Feedback.json`,
    },
  };
}

export function createCall(
  accountSid: string,
  input: CreateCallInput
): TwilioCall {
  const sid = generateCallSid();
  const now = new Date().toISOString();

  // Determine voice_url or twiml
  const voiceUrl = input.Url || null;
  const twiml = input.Twiml || null;
  const appSid = input.ApplicationSid || null;
  const voiceMethod = input.Method || 'POST';

  // New calls start in 'ringing' state to simulate real behavior
  const startTime = now;

  const stmt = db.prepare(`
    INSERT INTO calls (
      sid, account_sid, "from", "to", status, direction, duration,
      start_time, end_time, voice_url, voice_method, twiml, application_sid,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'ringing', 'outbound-api', 0, ?, NULL, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    sid,
    accountSid,
    (input.From || '').trim(),
    input.To.trim(),
    startTime,      // start_time
    voiceUrl,
    voiceMethod,
    twiml,
    appSid,
    now,            // created_at
    now             // updated_at
  );

  const row = db.prepare('SELECT * FROM calls WHERE sid = ?').get(sid) as CallRow;
  return rowToCall(row, accountSid);
}

export function listCalls(
  accountSid: string,
  options: {
    page?: number;
    pageSize?: number;
    from?: string;
    to?: string;
    status?: string;
  } = {}
): { calls: TwilioCall[]; total: number } {
  const page = options.page || 1;
  const pageSize = Math.min(options.pageSize || 50, 100);
  const offset = (page - 1) * pageSize;

  let whereClause = accountSid ? 'WHERE account_sid = ?' : 'WHERE 1=1';
  const params: (string | number)[] = accountSid ? [accountSid] : [];

  if (options.from) {
    whereClause += ' AND "from" LIKE ?';
    params.push(`%${options.from}%`);
  }

  if (options.to) {
    whereClause += ' AND "to" LIKE ?';
    params.push(`%${options.to}%`);
  }

  if (options.status) {
    whereClause += ' AND status = ?';
    params.push(options.status);
  }

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM calls ${whereClause}`);
  const { total } = countStmt.get(...params) as { total: number };

  const selectStmt = db.prepare(`
    SELECT * FROM calls ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `);

  const rows = selectStmt.all(...params, pageSize, offset) as CallRow[];
  const calls = rows.map((row) => rowToCall(row, accountSid || row.account_sid));

  return { calls, total };
}

export function getCall(accountSid: string, sid: string): TwilioCall | null {
  const row = db.prepare('SELECT * FROM calls WHERE sid = ? AND account_sid = ?').get(sid, accountSid) as CallRow | undefined;
  if (!row) return null;
  return rowToCall(row, accountSid);
}

export function getCallsSince(
  accountSid: string,
  since: string
): TwilioCall[] {
  const whereClause = accountSid
    ? 'WHERE account_sid = ? AND updated_at > ?'
    : 'WHERE updated_at > ?';
  const params = accountSid ? [accountSid, since] : [since];

  const rows = db.prepare(`
    SELECT * FROM calls ${whereClause}
    ORDER BY created_at DESC
  `).all(...params) as CallRow[];

  return rows.map((row) => rowToCall(row, accountSid || row.account_sid));
}

export function updateCallStatus(
  accountSid: string,
  sid: string,
  newStatus: CallStatus
): TwilioCall | null {
  const now = new Date().toISOString();

  // Get current call
  const current = db.prepare('SELECT * FROM calls WHERE sid = ? AND account_sid = ?').get(sid, accountSid) as CallRow | undefined;
  if (!current) return null;

  let duration = current.duration;
  let endTime = current.end_time;

  // If moving to a terminal state, calculate duration
  const terminalStatuses: CallStatus[] = ['completed', 'busy', 'failed', 'no-answer', 'canceled'];
  if (terminalStatuses.includes(newStatus) && !current.end_time) {
    const start = new Date(current.start_time || current.created_at);
    const end = new Date(now);
    duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    endTime = now;
  }

  const stmt = db.prepare(`
    UPDATE calls 
    SET status = ?, duration = ?, end_time = ?, updated_at = ?
    WHERE sid = ? AND account_sid = ?
  `);

  stmt.run(newStatus, duration, endTime, now, sid, accountSid);

  const row = db.prepare('SELECT * FROM calls WHERE sid = ?').get(sid) as CallRow;
  return rowToCall(row, accountSid);
}

export function recordDtmf(
  accountSid: string,
  sid: string,
  digit: string
): TwilioCall | null {
  const now = new Date().toISOString();

  const current = db.prepare('SELECT * FROM calls WHERE sid = ? AND account_sid = ?').get(sid, accountSid) as CallRow | undefined;
  if (!current) return null;

  const existing = current.digits || '';
  const newDigits = existing + digit;

  db.prepare(`
    UPDATE calls 
    SET digits = ?, updated_at = ?
    WHERE sid = ? AND account_sid = ?
  `).run(newDigits, now, sid, accountSid);

  const row = db.prepare('SELECT * FROM calls WHERE sid = ?').get(sid) as CallRow;
  return rowToCall(row, accountSid);
}
