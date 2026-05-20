import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQueryOne, dbRun, dbQuery } from '@/lib/db'
import {
  CHARACTERS,
  SUGOROKU_STAGES,
  STAGE_EVENTS,
  STAGE_CLEAR_REWARDS,
  getStarterIds,
} from '@/lib/characters'

// GET: return current game state
export async function GET() {
  const session = await getSession()
  if (!session.userId) {
    return NextResponse.json({ error: '未認証' }, { status: 401 })
  }

  const user = await dbQueryOne<{
    game_character: string | null
    game_steps: number
    game_collected: string
  }>(
    'SELECT game_character, game_steps, game_collected FROM users WHERE id = $1',
    [session.userId]
  )

  // Total cumulative openings from opening_calendar
  const openRow = await dbQueryOne<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM opening_calendar WHERE user_id = $1 AND status = '○'`,
    [session.userId]
  )
  const totalOpenings = openRow?.total ?? 0

  const collected: string[] = JSON.parse(user?.game_collected ?? '[]')
  const starters = getStarterIds()
  // Add starters to collected if not already there
  const allCollected = Array.from(new Set([...starters, ...collected]))

  return NextResponse.json({
    character: user?.game_character ?? null,
    steps: user?.game_steps ?? 0,
    collected: allCollected,
    totalOpenings,
    stageThresholds: SUGOROKU_STAGES,
    events: STAGE_EVENTS,
  })
}

// POST: actions — select_character, advance
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) {
    return NextResponse.json({ error: '未認証' }, { status: 401 })
  }

  const body = await req.json()
  const { action } = body

  if (action === 'select_character') {
    const { characterId } = body
    if (!characterId) {
      await dbRun('UPDATE users SET game_character = NULL WHERE id = $1', [session.userId])
      return NextResponse.json({ ok: true })
    }
    const char = CHARACTERS.find(c => c.id === characterId)
    if (!char) return NextResponse.json({ error: '不正なキャラクター' }, { status: 400 })

    // Check if collected
    const user = await dbQueryOne<{ game_collected: string }>(
      'SELECT game_collected FROM users WHERE id = $1',
      [session.userId]
    )
    const collected: string[] = JSON.parse(user?.game_collected ?? '[]')
    const starters = getStarterIds()
    const allCollected = new Set([...starters, ...collected])
    if (!allCollected.has(characterId)) {
      return NextResponse.json({ error: 'このキャラクターはまだ解放されていません' }, { status: 400 })
    }

    await dbRun('UPDATE users SET game_character = $1 WHERE id = $2', [characterId, session.userId])
    return NextResponse.json({ ok: true })
  }

  if (action === 'advance') {
    const user = await dbQueryOne<{
      game_character: string | null
      game_steps: number
      game_collected: string
    }>(
      'SELECT game_character, game_steps, game_collected FROM users WHERE id = $1',
      [session.userId]
    )

    if (!user?.game_character) {
      return NextResponse.json({ error: 'キャラクターを選んでください' }, { status: 400 })
    }

    // Get total openings to determine max allowed steps (GETと同じソース)
    const openRow = await dbQueryOne<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM opening_calendar WHERE user_id = $1 AND status = '○'`,
      [session.userId]
    )
    const totalOpenings = openRow?.total ?? 0

    const currentSteps = user.game_steps
    const totalBoardSize = SUGOROKU_STAGES.reduce((a, b) => a + b, 0) // 100
    if (currentSteps >= totalOpenings) {
      return NextResponse.json({ error: '開通数以上は進めません' }, { status: 400 })
    }
    if (currentSteps >= totalBoardSize) {
      return NextResponse.json({ error: 'ゴール済みです！' }, { status: 400 })
    }

    // Roll dice 1-6, capped by remaining openings and board size
    const diceRoll = Math.floor(Math.random() * 6) + 1
    const maxAdvance = Math.min(totalOpenings - currentSteps, totalBoardSize - currentSteps)
    const actualAdvance = Math.min(diceRoll, maxAdvance)
    const newSteps = currentSteps + actualAdvance

    const collected: string[] = JSON.parse(user.game_collected ?? '[]')
    const starters = getStarterIds()
    const allCollected = new Set([...starters, ...collected])

    // Check all stage boundaries crossed by this roll
    const newCharacters: string[] = []
    let runningTotal = 0
    for (let i = 0; i < SUGOROKU_STAGES.length; i++) {
      runningTotal += SUGOROKU_STAGES[i]
      if (currentSteps < runningTotal && newSteps >= runningTotal) {
        const rewardId = STAGE_CLEAR_REWARDS[i]
        if (rewardId && !allCollected.has(rewardId)) {
          allCollected.add(rewardId)
          newCharacters.push(rewardId)
        }
      }
    }

    // Check if final position is an event square
    let isEvent = false
    runningTotal = 0
    for (let i = 0; i < SUGOROKU_STAGES.length; i++) {
      const stageStart = runningTotal
      runningTotal += SUGOROKU_STAGES[i]
      if (newSteps > stageStart && newSteps <= runningTotal) {
        const posInStage = newSteps - stageStart
        if ((STAGE_EVENTS[i] ?? []).includes(posInStage)) {
          isEvent = true
        }
        break
      }
    }

    const newCollectedArr = Array.from(allCollected).filter(id => !starters.includes(id))

    await dbRun(
      'UPDATE users SET game_steps = $1, game_collected = $2 WHERE id = $3',
      [newSteps, JSON.stringify(newCollectedArr), session.userId]
    )

    return NextResponse.json({
      ok: true,
      newSteps,
      diceRoll,
      actualAdvance,
      newCharacters,
      isEvent,
    })
  }

  if (action === 'open_chest') {
    const user = await dbQueryOne<{ game_steps: number }>(
      'SELECT game_steps FROM users WHERE id = $1',
      [session.userId]
    )
    const currentSteps = user?.game_steps ?? 0
    const totalBoardSize = SUGOROKU_STAGES.reduce((a, b) => a + b, 0)

    const CHEST_REWARDS = [
      { type: 'steps', amount: 1, message: '+1マス進む！', emoji: '🎁', weight: 35 },
      { type: 'steps', amount: 2, message: '+2マス進む！', emoji: '✨', weight: 30 },
      { type: 'steps', amount: 3, message: '+3マス進む！', emoji: '💫', weight: 20 },
      { type: 'steps', amount: 5, message: '+5マス進む！', emoji: '🌟', weight: 10 },
      { type: 'message', amount: 0, message: '今日も開通頑張ろう！', emoji: '💪', weight: 5 },
    ]
    const totalWeight = CHEST_REWARDS.reduce((s, r) => s + r.weight, 0)
    let rand = Math.random() * totalWeight
    let reward = CHEST_REWARDS[0]
    for (const r of CHEST_REWARDS) {
      rand -= r.weight
      if (rand <= 0) { reward = r; break }
    }

    // Apply extra steps (capped at board size)
    if (reward.type === 'steps' && reward.amount > 0) {
      const newSteps = Math.min(currentSteps + reward.amount, totalBoardSize)
      await dbRun('UPDATE users SET game_steps = $1 WHERE id = $2', [newSteps, session.userId])
      return NextResponse.json({ ok: true, reward: { ...reward, newSteps } })
    }

    return NextResponse.json({ ok: true, reward })
  }

  return NextResponse.json({ error: '不明なアクション' }, { status: 400 })
}
