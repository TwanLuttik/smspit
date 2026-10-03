import { nanoid } from 'nanoid';
import { db } from '../db.js';
import type {
  TwilioMessage,
  CreateMessageInput,
  MessageRow,
  MessageStatus,
} from '../types/index.js';

function generateSid(): string {
  const chars = '0123456789abcdef';
  let sid = 'SM';
  for (let i = 0; i < 32; i++) {
    sid += chars[Math.floor(Math.random() * chars.length)];
  }
  return sid;
}

export type MessageChannel = 'sms' | 'whatsapp';

const WHATSAPP_PREFIX = /^whatsapp:/i;

export function channelOfAddress(address: string): MessageChannel {
  return WHATSAPP_PREFIX.test(address.trim()) ? 'whatsapp' : 'sms';
}

/** Store Twilio channel addresses with a lowercase `whatsapp:` prefix, or as a plain number. */
export function normalizeAddress(address: string, channel: MessageChannel): string {
  const stripped = address.trim().replace(WHATSAPP_PREFIX, '');
  return channel === 'whatsapp' ? `whatsapp:${stripped}` : stripped;
}

/**
 * Twilio 21910 — From and To must use the same channel
 * (`+E.164` for SMS, `whatsapp:+E.164` for WhatsApp).
 */
export function lookupChannelPairError(from: string, to: string): MagicToError | null {
  if (!from.trim() || channelOfAddress(from) === channelOfAddress(to)) return null;
  return {
    code: 21910,
    message: 'Invalid From and To pair. From and To should be of the same channel.',
    more_info: 'https://www.twilio.com/docs/api/errors/21910',
  };
}

function numSegmentsFor(body: string, channel: MessageChannel): number {
  const length = body.length;
  if (channel === 'whatsapp') {
    return length <= 1600 ? 1 : Math.ceil(length / 1600);
  }
  return length <= 160 ? 1 : Math.ceil(length / 153);
}

function rowToMessage(row: MessageRow, accountSid: string): TwilioMessage {
  return {
    sid: row.sid,
    account_sid: row.account_sid,
    body: row.body,
    from: row.from,
    to: row.to,
    status: row.status as MessageStatus,
    num_segments: row.num_segments,
    num_media: row.num_media,
    error_code: row.error_code,
    error_message: row.error_message,
    direction: row.direction as TwilioMessage['direction'],
    price: row.price,
    price_unit: row.price_unit,
    messaging_service_sid: row.messaging_service_sid,
    content_sid: row.content_sid,
    content_variables: row.content_variables,
    media_url: row.media_url,
    date_created: row.created_at,
    date_sent: row.sent_at,
    date_updated: row.updated_at,
    api_version: '2010-04-01',
    uri: `/2010-04-01/Accounts/${accountSid}/Messages/${row.sid}.json`,
    subresource_uris: {
      media: `/2010-04-01/Accounts/${accountSid}/Messages/${row.sid}/Media.json`,
    },
  };
}

export interface CreateMessageOptions {
  direction?: TwilioMessage['direction'];
  status?: MessageStatus;
}

export function createMessage(
  accountSid: string,
  input: CreateMessageInput,
  options: CreateMessageOptions = {}
): TwilioMessage {
  const sid = generateSid();
  const now = new Date().toISOString();

  const fromRaw = (input.From || '').trim();
  const toRaw = input.To.trim();
  const fromChannel = fromRaw ? channelOfAddress(fromRaw) : channelOfAddress(toRaw);
  const toChannel = channelOfAddress(toRaw);
  const channel: MessageChannel =
    toChannel === 'whatsapp' && (!fromRaw || fromChannel === 'whatsapp') ? 'whatsapp' : 'sms';
  const body = (input.Body || '').trim();
  const contentSid = (input.ContentSid || '').trim() || null;
  const contentVariables = (input.ContentVariables || '').trim() || null;
  const mediaUrl = (input.MediaUrl || '').trim() || null;
  const status = options.status ?? 'delivered';
  const direction = options.direction ?? 'outbound-api';

  const stmt = db.prepare(`
    INSERT INTO messages (
      sid, account_sid, body, "from", "to", status, num_segments,
      num_media, direction, messaging_service_sid, content_sid,
      content_variables, media_url, created_at, sent_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    sid,
    accountSid,
    body,
    fromRaw ? normalizeAddress(fromRaw, fromChannel) : '',
    normalizeAddress(toRaw, toChannel),
    status,
    numSegmentsFor(body, channel),
    mediaUrl ? 1 : 0,
    direction,
    input.MessagingServiceSid || null,
    contentSid,
    contentVariables,
    mediaUrl,
    now,
    now,
    now
  );

  const row = db.prepare('SELECT * FROM messages WHERE sid = ?').get(sid) as MessageRow;
  return rowToMessage(row, accountSid);
}

export function listMessages(
  accountSid: string,
  options: {
    page?: number;
    pageSize?: number;
    from?: string;
    to?: string;
    status?: string;
    bodySearch?: string;
  } = {}
): { messages: TwilioMessage[]; total: number } {
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

  if (options.bodySearch) {
    whereClause += ' AND (body LIKE ? OR content_variables LIKE ? OR content_sid LIKE ?)';
    params.push(`%${options.bodySearch}%`, `%${options.bodySearch}%`, `%${options.bodySearch}%`);
  }

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM messages ${whereClause}`);
  const { total } = countStmt.get(...params) as { total: number };

  const selectStmt = db.prepare(`
    SELECT * FROM messages ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `);

  const rows = selectStmt.all(...params, pageSize, offset) as MessageRow[];
  const messages = rows.map((row) => rowToMessage(row, accountSid || row.account_sid));

  return { messages, total };
}

export function getMessage(accountSid: string, sid: string): TwilioMessage | null {
  const row = db.prepare('SELECT * FROM messages WHERE sid = ? AND account_sid = ?').get(sid, accountSid) as MessageRow | undefined;
  if (!row) return null;
  return rowToMessage(row, accountSid);
}

export function deleteMessage(accountSid: string, sid: string): boolean {
  const result = db.prepare('DELETE FROM messages WHERE sid = ? AND account_sid = ?').run(sid, accountSid);
  return result.changes > 0;
}

export function getMessagesSince(
  accountSid: string,
  since: string,
  options: { to?: string } = {}
): TwilioMessage[] {
  let whereClause = accountSid
    ? 'WHERE account_sid = ? AND updated_at > ?'
    : 'WHERE updated_at > ?';
  const params: (string | number)[] = accountSid ? [accountSid, since] : [since];

  if (options.to) {
    whereClause += ' AND "to" LIKE ?';
    params.push(`%${options.to}%`);
  }

  const rows = db.prepare(`
    SELECT * FROM messages ${whereClause}
    ORDER BY created_at DESC
  `).all(...params) as MessageRow[];

  return rows.map((row) => rowToMessage(row, accountSid || row.account_sid));
}

export function deleteAllMessages(): number {
  const result = db.prepare('DELETE FROM messages').run();
  return result.changes;
}

/** +1 202-555-0001 — Twilio 21211 (invalid destination). */
const REJECT_TO_DIGITS = new Set(['12025550001', '2025550001']);
/** +1 202-555-0009 — Twilio 21614 (not a mobile / cannot receive SMS). */
const UNDELIVERABLE_TO_DIGITS = new Set(['12025550009', '2025550009']);

export interface MagicToError {
  code: number;
  message: string;
  more_info: string;
}

/**
 * Twilio-compatible magic numbers so e2e can exercise 21211 / 21614
 * without a client-side mock. Digit-normalized; other numbers pass.
 */
export function lookupMagicToError(to: string): MagicToError | null {
  const digits = to.replace(/\D/g, '');
  if (REJECT_TO_DIGITS.has(digits)) {
    return {
      code: 21211,
      message: `The 'To' number ${to} is not a valid phone number.`,
      more_info: 'https://www.twilio.com/docs/errors/21211',
    };
  }
  if (UNDELIVERABLE_TO_DIGITS.has(digits)) {
    return {
      code: 21614,
      message: `The 'To' number ${to} is not a valid mobile number.`,
      more_info: 'https://www.twilio.com/docs/errors/21614',
    };
  }
  return null;
}