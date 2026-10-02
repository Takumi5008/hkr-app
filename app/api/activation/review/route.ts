import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQueryOne, dbRun } from '@/lib/db'

// 担当者本人以外の manager/admin が案件を確認したことを記録する。
// 確認解除（取り消し）もこの同じエンドポイントで扱う。
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager' && session.role !== 'admin') {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const { id, confirmed } = await req.json()
  if (!id) return NextResponse.json({ error: 'パラメータ不足' }, { status: 400 })

  const rec = await dbQueryOne<{ user_id: number }>('SELECT user_id FROM activation_records WHERE id = $1', [id])
  if (!rec) return NextResponse.json({ error: '案件が見つかりません' }, { status: 404 })
  if (rec.user_id === session.userId) {
    return NextResponse.json({ error: '担当者本人はこの案件を確認できません' }, { status: 403 })
  }

  if (confirmed === false) {
    await dbRun(
      `UPDATE activation_records SET review_status = '', reviewer_id = NULL, reviewed_at = '' WHERE id = $1`,
      [id]
    )
  } else {
    await dbRun(
      `UPDATE activation_records SET review_status = '○', reviewer_id = $1, reviewed_at = TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') WHERE id = $2`,
      [session.userId, id]
    )
  }

  return NextResponse.json({ ok: true })
}
