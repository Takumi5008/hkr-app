// 初期管理者ユーザーを作成するスクリプト
// 実行: npx tsx scripts/seed.ts
import bcrypt from 'bcryptjs'
import { getDb } from '../lib/db'

const db = getDb()

const email = 'admin@example.com'
const password = 'password123'
const name = '管理者'
const role = 'manager'

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
if (existing) {
  console.log('既にユーザーが存在します:', email)
  process.exit(0)
}

const hash = bcrypt.hashSync(password, 10)
db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(name, email, hash, role)

console.log('✅ 管理者ユーザーを作成しました')
console.log('  メール:', email)
console.log('  パスワード:', password)
console.log('  ログイン後、管理画面からメンバーを追加してください')
