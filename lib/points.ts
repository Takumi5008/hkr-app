import { dbRun } from './db'

export async function syncUserPoints(userId: number): Promise<void> {
  await dbRun(
    `UPDATE users SET points = (
      COALESCE((SELECT SUM(r.activation_count) * 5 + SUM(r.cancel_count) * 1 FROM records r WHERE r.user_id = $1), 0)
      + COALESCE((SELECT SUM(pt.delta) FROM point_transactions pt WHERE pt.user_id = $1), 0)
    ) WHERE id = $1`,
    [userId]
  )
}

export async function addPointTransaction(
  userId: number, delta: number, reason: string, refType: string, refId: string
): Promise<void> {
  await dbRun(
    `INSERT INTO point_transactions (user_id, delta, reason, ref_type, ref_id)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, ref_type, ref_id) DO NOTHING`,
    [userId, delta, reason, refType, refId]
  )
  await syncUserPoints(userId)
}

// トランザクションを削除してポイントを戻す（トグルOFF用）
export async function removePointTransaction(
  userId: number, refType: string, refId: string
): Promise<void> {
  await dbRun(
    `DELETE FROM point_transactions WHERE user_id = $1 AND ref_type = $2 AND ref_id = $3`,
    [userId, refType, refId]
  )
  await syncUserPoints(userId)
}
