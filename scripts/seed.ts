// 初期管理者ユーザーを作成するスクリプト
// 実行: npx tsx scripts/seed.ts
import bcrypt from 'bcryptjs'
import { dbQueryOne, dbRun } from '../lib/db'

const email = process.env.ADMIN_EMAIL || 'komotaku0508@gmail.com'
const password = process.env.ADMIN_PASSWORD || 'Tanien58#biseki'
const name = '管理者'
const role = 'manager'

const existing = await dbQueryOne('SELECT id FROM users WHERE email = $1', [email])
if (existing) {
  console.log('既にユーザーが存在します:', email)
  process.exit(0)
}

const hash = await bcrypt.hash(password, 10)
await dbRun('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)', [name, email, hash, role])

console.log('✅ 管理者ユーザーを作成しました')
console.log('  メール:', email)
process.exit(0)
