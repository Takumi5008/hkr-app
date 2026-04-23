import { Pool } from 'pg'

const dbUrl = process.env.DATABASE_URL || ''
const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes('.render.com') ? { rejectUnauthorized: false } : false,
})

let initialized = false

async function initDb() {
  if (initialized) return
  initialized = true
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id           SERIAL PRIMARY KEY,
      name         TEXT    NOT NULL,
      email        TEXT    NOT NULL UNIQUE,
      password     TEXT    NOT NULL,
      role         TEXT    NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'viewer', 'manager')),
      temp_password TEXT   DEFAULT NULL,
      temp_password_expires_at TEXT DEFAULT NULL,
      created_at   TEXT    NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    );
    CREATE TABLE IF NOT EXISTS records (
      id               SERIAL PRIMARY KEY,
      user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      year             INTEGER NOT NULL,
      month            INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
      product          TEXT    NOT NULL,
      cancel_count     INTEGER NOT NULL DEFAULT 0 CHECK (cancel_count >= 0),
      activation_count INTEGER NOT NULL DEFAULT 0 CHECK (activation_count >= 0),
      created_at       TEXT    NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      updated_at       TEXT    NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      UNIQUE(user_id, year, month, product)
    );
    CREATE TABLE IF NOT EXISTS products (
      id         SERIAL PRIMARY KEY,
      name       TEXT    NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    );
    CREATE TABLE IF NOT EXISTS invite_tokens (
      id         SERIAL PRIMARY KEY,
      token      TEXT    NOT NULL UNIQUE,
      used       INTEGER NOT NULL DEFAULT 0,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT    NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      expires_at TEXT    NOT NULL
    );
    CREATE TABLE IF NOT EXISTS shifts (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      year       INTEGER NOT NULL,
      month      INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
      work_dates TEXT    NOT NULL DEFAULT '[]',
      submitted  INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT    NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      UNIQUE(user_id, year, month)
    );
    CREATE TABLE IF NOT EXISTS shift_deadlines (
      id          SERIAL PRIMARY KEY,
      year        INTEGER NOT NULL,
      month       INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
      deadline_at TEXT    NOT NULL,
      UNIQUE(year, month)
    );
    CREATE TABLE IF NOT EXISTS mtg_attendance (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date       TEXT    NOT NULL,
      status     TEXT    NOT NULL CHECK (status IN ('present', 'absent', 'late')),
      reason     TEXT    NOT NULL DEFAULT '',
      late_time  TEXT    NOT NULL DEFAULT '',
      updated_at TEXT    NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      UNIQUE(user_id, date)
    );
    CREATE TABLE IF NOT EXISTS mtg_deadlines (
      id          SERIAL PRIMARY KEY,
      date        TEXT    NOT NULL UNIQUE,
      deadline_at TEXT    NOT NULL
    );
    CREATE TABLE IF NOT EXISTS mtg_month_deadlines (
      id          SERIAL PRIMARY KEY,
      year        INTEGER NOT NULL,
      month       INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
      deadline_at TEXT    NOT NULL,
      UNIQUE(year, month)
    );
  `)
  // 初期商材データ
  const { rows } = await pool.query('SELECT COUNT(*) as cnt FROM products')
  if (parseInt(rows[0].cnt) === 0) {
    await pool.query("INSERT INTO products (name, sort_order) VALUES ('So-net光', 0), ('WiMAX', 1) ON CONFLICT DO NOTHING")
  }
}

export async function dbQuery<T = any>(sql: string, params?: any[]): Promise<T[]> {
  await initDb()
  const { rows } = await pool.query(sql, params)
  return rows
}

export async function dbQueryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  await initDb()
  const { rows } = await pool.query(sql, params)
  return rows[0] ?? null
}

export async function dbRun(sql: string, params?: any[]): Promise<{ id?: number; rowCount: number }> {
  await initDb()
  const result = await pool.query(sql, params)
  return { id: result.rows[0]?.id, rowCount: result.rowCount ?? 0 }
}

export async function dbTransaction(fn: (client: import('pg').PoolClient) => Promise<void>): Promise<void> {
  await initDb()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await fn(client)
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}
