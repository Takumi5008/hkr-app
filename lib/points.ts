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

// refType + refId の組み合わせでユニーク制約があるため、2重付与されない
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
