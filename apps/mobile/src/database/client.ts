import * as SQLite from 'expo-sqlite';

let database: SQLite.SQLiteDatabase | null = null;

export function getDatabase() {
  if (!database) {
    database = SQLite.openDatabaseSync('geora.db');
  }

  return database;
}

export function initDatabase() {
  const db = getDatabase();

  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS local_proofs (
      local_uuid TEXT PRIMARY KEY NOT NULL,
      task_id TEXT NOT NULL,
      image_uri TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      location_accuracy REAL,
      captured_at TEXT NOT NULL,
      remarks TEXT,
      task_version INTEGER,
      report_title TEXT,
      report_text TEXT,
      sync_status TEXT NOT NULL DEFAULT 'QUEUED',
      verification_status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      local_record_id TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'QUEUED',
      next_retry_at TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

  `);

  ensureColumn(db, 'local_proofs', 'task_version', 'INTEGER');
  ensureColumn(db, 'local_proofs', 'report_title', 'TEXT');
  ensureColumn(db, 'local_proofs', 'report_text', 'TEXT');
  ensureColumn(db, 'sync_queue', 'next_retry_at', 'TEXT');
}

function ensureColumn(db: SQLite.SQLiteDatabase, tableName: string, columnName: string, definition: string) {
  const columns = db.getAllSync<{ name: string }>(`PRAGMA table_info(${tableName})`);
  const exists = columns.some((column) => column.name === columnName);

  if (!exists) {
    db.execSync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}
