import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, '..', 'smspit.db');

export const db: DatabaseType = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sid TEXT UNIQUE NOT NULL,
      account_sid TEXT NOT NULL,
      body TEXT NOT NULL,
      "from" TEXT NOT NULL,
      "to" TEXT NOT NULL,
      status TEXT DEFAULT 'queued',
      num_segments INTEGER DEFAULT 1,
      num_media INTEGER DEFAULT 0,
      error_code INTEGER,
      error_message TEXT,
      direction TEXT DEFAULT 'outbound-api',
      price REAL,
      price_unit TEXT,
      messaging_service_sid TEXT,
      content_sid TEXT,
      content_variables TEXT,
      media_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sent_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_messages_account_sid ON messages(account_sid);
    CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
    CREATE INDEX IF NOT EXISTS idx_messages_from ON messages("from");
    CREATE INDEX IF NOT EXISTS idx_messages_to ON messages("to");
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

    CREATE TABLE IF NOT EXISTS calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sid TEXT UNIQUE NOT NULL,
      account_sid TEXT NOT NULL,
      "from" TEXT NOT NULL,
      "to" TEXT NOT NULL,
      status TEXT DEFAULT 'queued',
      direction TEXT DEFAULT 'outbound-api',
      duration INTEGER DEFAULT 0,
      start_time DATETIME,
      end_time DATETIME,
      voice_url TEXT,
      voice_method TEXT,
      twiml TEXT,
      application_sid TEXT,
      price REAL,
      price_unit TEXT,
      digits TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_calls_account_sid ON calls(account_sid);
    CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
    CREATE INDEX IF NOT EXISTS idx_calls_from ON calls("from");
    CREATE INDEX IF NOT EXISTS idx_calls_to ON calls("to");
    CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);
  `);

  // Safe migration: add 'digits' column for users who had the database before this feature
  try {
    db.exec(`ALTER TABLE calls ADD COLUMN digits TEXT DEFAULT ''`);
  } catch (e) {
    // Column already exists — ignore the error
  }

  // WhatsApp content templates send ContentSid / ContentVariables instead of Body.
  for (const column of ['content_sid TEXT', 'content_variables TEXT', 'media_url TEXT']) {
    try {
      db.exec(`ALTER TABLE messages ADD COLUMN ${column}`);
    } catch (e) {
      // Column already exists — ignore the error
    }
  }

  console.log('Database initialized');
}

export function closeDatabase(): void {
  db.close();
}