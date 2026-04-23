/**
 * シフトアプリのデータをインフラアプリのDBに移行するスクリプト
 *
 * 使い方:
 *   SHIFT_DB_URL="postgresql://..." INFRA_DB_URL="postgresql://..." node scripts/migrate-shift-data.mjs
 *
 * SHIFT_DB_URL  : Railway（シフトアプリ）のPostgreSQLの外部接続URL
 * INFRA_DB_URL  : Render（インフラアプリ）のPostgreSQLの外部接続URL
 */

import pg from 'pg'
const { Pool } = pg

const SHIFT_DB_URL = process.env.SHIFT_DB_URL
const INFRA_DB_URL = process.env.INFRA_DB_URL

if (!SHIFT_DB_URL || !INFRA_DB_URL) {
  console.error('SHIFT_DB_URL と INFRA_DB_URL の環境変数を設定してください')
  process.exit(1)
}

const shiftPool = new Pool({
  connectionString: SHIFT_DB_URL,
  ssl: { rejectUnauthorized: false },
})

const infraPool = new Pool({
  connectionString: INFRA_DB_URL,
  ssl: INFRA_DB_URL.includes('.render.com') ? { rejectUnauthorized: false } : false,
})

async function migrate() {
  console.log('移行を開始します...')

  // 1. シフトアプリのユーザー取得
  const { rows: shiftUsers } = await shiftPool.query('SELECT * FROM users ORDER BY id')
  console.log(`シフトアプリのユーザー数: ${shiftUsers.length}`)

  // 2. インフラアプリの既存ユーザー取得（メールで照合）
  const { rows: infraUsers } = await infraPool.query('SELECT * FROM users ORDER BY id')
  const infraUserMap = Object.fromEntries(infraUsers.map((u) => [u.email, u]))

  // 3. ユーザーIDのマッピング（シフトapp ID → インフラapp ID）
  const userIdMap = {}
  for (const su of shiftUsers) {
    if (infraUserMap[su.email]) {
      userIdMap[su.id] = infraUserMap[su.email].id
      console.log(`  ユーザー照合: ${su.name} (${su.email}) → インフラID: ${infraUserMap[su.email].id}`)
    } else {
      // インフラアプリに存在しないユーザーは新規作成
      const { rows } = await infraPool.query(
        `INSERT INTO users (name, email, password, role, created_at)
         VALUES ($1, $2, $3, $4, TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
         ON CONFLICT (email) DO UPDATE SET name = $1
         RETURNING id`,
        [su.name, su.email, su.password, su.role === 'admin' ? 'manager' : 'member']
      )
      userIdMap[su.id] = rows[0].id
      console.log(`  ユーザー新規作成: ${su.name} → インフラID: ${rows[0].id}`)
    }
  }

  // 4. シフトデータの移行
  const { rows: shiftData } = await shiftPool.query('SELECT * FROM shifts ORDER BY id')
  console.log(`\nシフトデータ数: ${shiftData.length}`)
  let shiftCount = 0
  for (const s of shiftData) {
    const infraUserId = userIdMap[s.user_id]
    if (!infraUserId) { console.log(`  スキップ: user_id=${s.user_id} はマッピングなし`); continue }
    await infraPool.query(
      `INSERT INTO shifts (user_id, year, month, work_dates, submitted, updated_at)
       VALUES ($1, $2, $3, $4, $5, TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
       ON CONFLICT (user_id, year, month) DO UPDATE SET work_dates = $4, submitted = $5`,
      [infraUserId, s.year, s.month, s.work_dates, s.submitted]
    )
    shiftCount++
  }
  console.log(`  移行完了: ${shiftCount}件`)

  // 5. 締切データの移行
  const { rows: deadlines } = await shiftPool.query('SELECT * FROM deadlines ORDER BY id')
  console.log(`\n締切データ数: ${deadlines.length}`)
  for (const d of deadlines) {
    await infraPool.query(
      `INSERT INTO shift_deadlines (year, month, deadline_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (year, month) DO UPDATE SET deadline_at = $3`,
      [d.year, d.month, d.deadline_at]
    )
  }
  console.log(`  移行完了: ${deadlines.length}件`)

  // 6. MTG出欠データの移行
  const { rows: mtgRows } = await shiftPool.query('SELECT * FROM mtg_attendance ORDER BY id')
  console.log(`\nMTG出欠データ数: ${mtgRows.length}`)
  let mtgCount = 0
  for (const m of mtgRows) {
    const infraUserId = userIdMap[m.user_id]
    if (!infraUserId) { continue }
    await infraPool.query(
      `INSERT INTO mtg_attendance (user_id, date, status, reason, late_time, updated_at)
       VALUES ($1, $2, $3, $4, $5, TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
       ON CONFLICT (user_id, date) DO UPDATE SET status = $3, reason = $4, late_time = $5`,
      [infraUserId, m.date, m.status, m.reason ?? '', m.late_time ?? '']
    )
    mtgCount++
  }
  console.log(`  移行完了: ${mtgCount}件`)

  // 7. MTG締切データの移行
  const { rows: mtgDeadlines } = await shiftPool.query('SELECT * FROM mtg_deadlines ORDER BY id')
  console.log(`\nMTG締切データ数: ${mtgDeadlines.length}`)
  for (const d of mtgDeadlines) {
    await infraPool.query(
      `INSERT INTO mtg_deadlines (date, deadline_at)
       VALUES ($1, $2)
       ON CONFLICT (date) DO UPDATE SET deadline_at = $2`,
      [d.date, d.deadline_at]
    )
  }
  console.log(`  移行完了: ${mtgDeadlines.length}件`)

  console.log('\n✅ 移行完了！')
  await shiftPool.end()
  await infraPool.end()
}

migrate().catch((err) => {
  console.error('移行エラー:', err)
  process.exit(1)
})
