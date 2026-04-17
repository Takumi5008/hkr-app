import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DB_DIR, 'hkr.db')

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (_db) return _db

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
  }

  _db = new Database(DB_PATH)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')

  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT    NOT NULL,
      email        TEXT    NOT NULL UNIQUE,
      password     TEXT    NOT NULL,
      role         TEXT    NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'viewer', 'manager')),
      temp_password TEXT   DEFAULT NULL,
      temp_password_expires_at TEXT DEFAULT NULL,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS records (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      year             INTEGER NOT NULL,
      month            INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
      product          TEXT    NOT NULL,
      cancel_count     INTEGER NOT NULL DEFAULT 0 CHECK (cancel_count >= 0),
      activation_count INTEGER NOT NULL DEFAULT 0 CHECK (activation_count >= 0),
      created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, year, month, product)
    );

    CREATE TABLE IF NOT EXISTS products (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invite_tokens (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      token      TEXT    NOT NULL UNIQUE,
      used       INTEGER NOT NULL DEFAULT 0,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT    NOT NULL
    );
  `)

  // recordsテーブルのマイグレーション: product CHECK制約の削除 + 旧商材名の変換
  const recordsDdl = (_db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='records'").get() as any)?.sql ?? ''
  if (recordsDdl.includes("CHECK (product IN")) {
    _db.exec(`
      CREATE TABLE records_new (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        year             INTEGER NOT NULL,
        month            INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
        product          TEXT    NOT NULL,
        cancel_count     INTEGER NOT NULL DEFAULT 0 CHECK (cancel_count >= 0),
        activation_count INTEGER NOT NULL DEFAULT 0 CHECK (activation_count >= 0),
        created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at       TEXT    NOT NULL DEFAULT (datetime('now')),
        UNIQUE(user_id, year, month, product)
      );
      INSERT INTO records_new (id, user_id, year, month, product, cancel_count, activation_count, created_at, updated_at)
        SELECT id, user_id, year, month,
          CASE product WHEN '回線1' THEN 'So-net光' WHEN '回線2' THEN 'WiMAX' ELSE product END,
          cancel_count, activation_count, created_at, updated_at
        FROM records;
      DROP TABLE records;
      ALTER TABLE records_new RENAME TO records;
    `)
  }

  // productsテーブルに初期データ投入（空の場合のみ）
  const productCount = (_db.prepare("SELECT COUNT(*) as cnt FROM products").get() as any)?.cnt ?? 0
  if (productCount === 0) {
    _db.prepare("INSERT INTO products (name, sort_order) VALUES (?, ?)").run('So-net光', 0)
    _db.prepare("INSERT INTO products (name, sort_order) VALUES (?, ?)").run('WiMAX', 1)
  }

  // 既存DBへのマイグレーション（カラムが無ければ追加）
  const cols = _db.prepare("PRAGMA table_info(users)").all() as any[]
  const colNames = cols.map((c) => c.name)
  if (!colNames.includes('temp_password')) {
    _db.exec("ALTER TABLE users ADD COLUMN temp_password TEXT DEFAULT NULL")
  }
  if (!colNames.includes('temp_password_expires_at')) {
    _db.exec("ALTER TABLE users ADD COLUMN temp_password_expires_at TEXT DEFAULT NULL")
  }

  return _db
}
