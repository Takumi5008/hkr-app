import pg from 'pg'
import bcrypt from 'bcryptjs'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

const email = 'komotaku0508@gmail.com'
const password = 'Tanien58#biseki'
const name = '管理者'
const role = 'manager'

// Create tables if not exist
await pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    temp_password TEXT DEFAULT NULL,
    temp_password_expires_at TEXT DEFAULT NULL,
    created_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
  CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
`)

// Seed products
const { rows: productRows } = await pool.query('SELECT COUNT(*) as cnt FROM products')
if (parseInt(productRows[0].cnt) === 0) {
  await pool.query("INSERT INTO products (name, sort_order) VALUES ('So-net光', 0), ('WiMAX', 1) ON CONFLICT DO NOTHING")
  console.log('✅ 商材を追加しました')
}

// Seed admin user
const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email])
if (existing.length > 0) {
  console.log('既にユーザーが存在します:', email)
} else {
  const hash = await bcrypt.hash(password, 10)
  await pool.query('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)', [name, email, hash, role])
  console.log('✅ 管理者ユーザーを作成しました:', email)
}

await pool.end()
