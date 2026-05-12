import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQueryOne, dbRun, dbQuery } from '@/lib/db'
import {
  CHARACTERS,
  SUGOROKU_STAGES,
  STAGE_EVENTS,
  getCharStageIndex,
  getCollectibleIds,
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

    // Get total openings to determine max allowed steps
    const openRow = await dbQueryOne<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM activation_records WHERE user_id = $1 AND activation = '○'`,
      [session.userId]
    )
    const totalOpenings = openRow?.total ?? 0

    const currentSteps = user.game_steps
    const totalBoardSize = SUGOROKU_STAGES.reduce((a, b) => a + b, 0) // 150
    if (currentSteps >= totalOpenings) {
      return NextResponse.json({ error: '開通数以上は進めません' }, { status: 400 })
    }
    if (currentSteps >= totalBoardSize) {
      return NextResponse.json({ error: 'ゴール済みです！' }, { status: 400 })
    }

    const newSteps = currentSteps + 1
    const collected: string[] = JSON.parse(user.game_collected ?? '[]')
    const starters = getStarterIds()
    const allCollected = new Set([...starters, ...collected])

    // Check if this step is a stage clear
    let newCharacter: string | null = null
    let stageClearedIndex: number | null = null
    let runningTotal = 0
    for (let i = 0; i < SUGOROKU_STAGES.length; i++) {
      runningTotal += SUGOROKU_STAGES[i]
      if (newSteps === runningTotal && i < SUGOROKU_STAGES.length - 1) {
        stageClearedIndex = i
        break
      }
    }

    if (stageClearedIndex !== null) {
      // Award a random uncollected character
      const collectibles = getCollectibleIds()
      const uncollected = collectibles.filter(id => !allCollected.has(id))
      if (uncollected.length > 0) {
        const idx = Math.floor(Math.random() * uncollected.length)
        newCharacter = uncollected[idx]
        allCollected.add(newCharacter)
      }
    }

    // Check if this step is an event square
    let isEvent = false
    let eventStageIndex = -1
    let eventPosInStage = -1
    runningTotal = 0
    for (let i = 0; i < SUGOROKU_STAGES.length; i++) {
      const stageStart = runningTotal
      runningTotal += SUGOROKU_STAGES[i]
      if (newSteps > stageStart && newSteps <= runningTotal) {
        const posInStage = newSteps - stageStart
        if ((STAGE_EVENTS[i] ?? []).includes(posInStage)) {
          isEvent = true
          eventStageIndex = i
          eventPosInStage = posInStage
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
      newCharacter,
      isEvent,
      eventStageIndex,
      eventPosInStage,
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
