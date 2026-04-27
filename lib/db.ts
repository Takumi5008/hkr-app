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
    CREATE TABLE IF NOT EXISTS monthly_progress (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      year          INTEGER NOT NULL,
      month         INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
      cancel_target INTEGER NOT NULL DEFAULT 0,
      actual_cancel INTEGER NOT NULL DEFAULT 0,
      work_dates    TEXT NOT NULL DEFAULT '[]',
      UNIQUE(user_id, year, month)
    );
    ALTER TABLE monthly_progress ADD COLUMN IF NOT EXISTS actual_cancel INTEGER NOT NULL DEFAULT 0;
    CREATE TABLE IF NOT EXISTS member_performance (
      id                 SERIAL PRIMARY KEY,
      name               TEXT NOT NULL,
      activation_target  INTEGER NOT NULL DEFAULT 0,
      cancel_target      INTEGER NOT NULL DEFAULT 0,
      work_days_target   INTEGER NOT NULL DEFAULT 0,
      period_start       TEXT NOT NULL DEFAULT '',
      period_end         TEXT NOT NULL DEFAULT '',
      total_work         INTEGER NOT NULL DEFAULT 0,
      total_activation   INTEGER NOT NULL DEFAULT 0,
      total_cancel       INTEGER NOT NULL DEFAULT 0,
      note               TEXT NOT NULL DEFAULT '',
      sort_order         INTEGER NOT NULL DEFAULT 0,
      created_at         TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      updated_at         TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    );
    CREATE TABLE IF NOT EXISTS memos (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title      TEXT NOT NULL DEFAULT '',
      content    TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      created_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    );
    CREATE TABLE IF NOT EXISTS schedules (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      date        TEXT NOT NULL,
      start_time  TEXT,
      end_time    TEXT,
      memo        TEXT NOT NULL DEFAULT '',
      created_at  TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title      TEXT NOT NULL,
      due_date   TEXT,
      done       INTEGER NOT NULL DEFAULT 0,
      done_at    TEXT,
      created_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    );
    CREATE TABLE IF NOT EXISTS member_monthly_stats (
      id               SERIAL PRIMARY KEY,
      member_name      TEXT    NOT NULL,
      year             INTEGER NOT NULL,
      month            INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
      total_activation INTEGER NOT NULL DEFAULT 0,
      total_cancel     INTEGER NOT NULL DEFAULT 0,
      work_days        INTEGER NOT NULL DEFAULT 0,
      UNIQUE(member_name, year, month)
    );
    ALTER TABLE member_monthly_stats ADD COLUMN IF NOT EXISTS work_days INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE activation_records ADD COLUMN IF NOT EXISTS delivery_date TEXT NOT NULL DEFAULT '';
    ALTER TABLE activation_records ADD COLUMN IF NOT EXISTS fm_done INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE activation_records ADD COLUMN IF NOT EXISTS week_after_done INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE activation_records ADD COLUMN IF NOT EXISTS day_before_construction_done INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE activation_records ADD COLUMN IF NOT EXISTS construction_date_done INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE activation_records ADD COLUMN IF NOT EXISTS day_before_delivery_done INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE activation_records ADD COLUMN IF NOT EXISTS delivery_date_done INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE activation_records ADD COLUMN IF NOT EXISTS week_after_delivery_done INTEGER NOT NULL DEFAULT 0;
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subscription TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      UNIQUE(user_id)
    );
    CREATE TABLE IF NOT EXISTS monthly_team_stats (
      id           SERIAL PRIMARY KEY,
      year         INTEGER NOT NULL,
      month        INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
      total_activation INTEGER NOT NULL DEFAULT 0,
      total_cancel     INTEGER NOT NULL DEFAULT 0,
      member_count     INTEGER NOT NULL DEFAULT 0,
      note             TEXT NOT NULL DEFAULT '',
      UNIQUE(year, month)
    );
    CREATE TABLE IF NOT EXISTS daily_activity (
      id               SERIAL PRIMARY KEY,
      user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date             TEXT NOT NULL,
      work_hours       TEXT NOT NULL DEFAULT '',
      pin_count        INTEGER NOT NULL DEFAULT 0,
      pingpong_count   INTEGER NOT NULL DEFAULT 0,
      intercom_count   INTEGER NOT NULL DEFAULT 0,
      face_other       INTEGER NOT NULL DEFAULT 0,
      face_unused      INTEGER NOT NULL DEFAULT 0,
      hearing_sheet    INTEGER NOT NULL DEFAULT 0,
      consent_form     INTEGER NOT NULL DEFAULT 0,
      wimax            INTEGER NOT NULL DEFAULT 0,
      sonet            INTEGER NOT NULL DEFAULT 0,
      cancel           INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, date)
    );
    CREATE TABLE IF NOT EXISTS activation_records (
      id                    SERIAL PRIMARY KEY,
      user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      year                  INTEGER NOT NULL,
      month                 INTEGER NOT NULL,
      type                  TEXT NOT NULL,
      name                  TEXT NOT NULL DEFAULT '',
      date                  TEXT NOT NULL DEFAULT '',
      line                  TEXT NOT NULL DEFAULT '',
      cancel                TEXT NOT NULL DEFAULT '',
      neg_apply             TEXT NOT NULL DEFAULT '',
      neg_cancel            TEXT NOT NULL DEFAULT '',
      fm                    TEXT NOT NULL DEFAULT '',
      week_after            TEXT NOT NULL DEFAULT '',
      day_before_construction TEXT NOT NULL DEFAULT '',
      construction_date     TEXT NOT NULL DEFAULT '',
      day_before_delivery   TEXT NOT NULL DEFAULT '',
      delivery_date         TEXT NOT NULL DEFAULT '',
      week_after_delivery   TEXT NOT NULL DEFAULT '',
      activation            TEXT NOT NULL DEFAULT '',
      created_at            TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    );
    CREATE TABLE IF NOT EXISTS mtg_month_deadlines (
      id          SERIAL PRIMARY KEY,
      year        INTEGER NOT NULL,
      month       INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
      deadline_at TEXT    NOT NULL,
      UNIQUE(year, month)
    );
    ALTER TABLE shift_deadlines ADD COLUMN IF NOT EXISTS reminder_sent INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE mtg_month_deadlines ADD COLUMN IF NOT EXISTS reminder_sent INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
    CREATE TABLE IF NOT EXISTS point_items (
      id          SERIAL PRIMARY KEY,
      name        TEXT    NOT NULL,
      description TEXT    NOT NULL DEFAULT '',
      cost        INTEGER NOT NULL CHECK (cost > 0),
      is_active   BOOLEAN NOT NULL DEFAULT true,
      created_at  TEXT    NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    );
    CREATE TABLE IF NOT EXISTS point_rules (
      id         SERIAL PRIMARY KEY,
      action     TEXT    NOT NULL,
      points     INTEGER NOT NULL,
      created_at TEXT    NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    );
    CREATE TABLE IF NOT EXISTS point_exchanges (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_id    INTEGER REFERENCES point_items(id) ON DELETE SET NULL,
      item_name  TEXT    NOT NULL,
      cost       INTEGER NOT NULL,
      status     TEXT    NOT NULL DEFAULT 'pending',
      created_at TEXT    NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    );
    CREATE TABLE IF NOT EXISTS point_transactions (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      delta      INTEGER NOT NULL,
      reason     TEXT NOT NULL DEFAULT '',
      ref_type   TEXT NOT NULL DEFAULT '',
      ref_id     TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      UNIQUE(user_id, ref_type, ref_id)
    );
  `)
  // ポイントを records の全合計から同期（過去分含む）
  await pool.query(`
    UPDATE users u
    SET points = (
      COALESCE((SELECT SUM(r.activation_count) * 5 + SUM(r.cancel_count) * 1 FROM records r WHERE r.user_id = u.id), 0)
      + COALESCE((SELECT SUM(pt.delta) FROM point_transactions pt WHERE pt.user_id = u.id), 0)
    )
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
