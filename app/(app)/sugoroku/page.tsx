'use client'

import { useState, useEffect, useRef } from 'react'
import PixelChar from '@/components/PixelChar'
import { CHARACTERS, SUGOROKU_STAGES, STAGE_EVENTS, getCharStageIndex } from '@/lib/characters'

interface GameState {
  character: string | null
  steps: number
  collected: string[]
  totalOpenings: number
  stageThresholds: number[]
  events: Record<string, number[]>
}

function getStageName(stageIndex: number) {
  return ['森の始まり', '砂漠の試練', '海の彼方', '天空の城', '最終決戦'][stageIndex] ?? `ステージ${stageIndex + 1}`
}

interface ChestReward { type: string; amount: number; message: string; emoji: string; newSteps?: number }

export default function SugorokuPage() {
  const [state, setState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(false)
  const [tab, setTab] = useState<'board' | 'collection'>('board')
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'event' | 'clear' | 'error' } | null>(null)
  const [animation, setAnimation] = useState<'idle' | 'move' | 'event' | 'clear'>('idle')
  const [chest, setChest] = useState<{ open: boolean; opening: boolean; reward: ChestReward | null }>({ open: false, opening: false, reward: null })
  const boardRef = useRef<HTMLDivElement>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/sugoroku')
    if (res.ok) setState(await res.json())
    setLoading(false)
  }

  async function selectCharacter(id: string) {
    await fetch('/api/sugoroku', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'select_character', characterId: id }),
    })
    await load()
  }

  async function advance() {
    if (!state || advancing) return
    setAdvancing(true)
    const res = await fetch('/api/sugoroku', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'advance' }),
    })
    const data = await res.json()
    if (!res.ok) {
      showToast(data.error, 'error')
      setAdvancing(false)
      return
    }

    setAnimation('move')
    setTimeout(() => {
      setAnimation('idle')
      if (data.newCharacter) {
        setAnimation('clear')
        showToast(`ステージクリア！「${CHARACTERS.find(c => c.id === data.newCharacter)?.name}」をゲット！`, 'clear')
      } else if (data.isEvent) {
        setAnimation('event')
        setChest({ open: true, opening: false, reward: null })
      }
      load()
      setAdvancing(false)
    }, 600)
  }

  async function openChest() {
    if (chest.opening) return
    setChest(c => ({ ...c, opening: true }))
    const res = await fetch('/api/sugoroku', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'open_chest' }),
    })
    const data = await res.json()
    setTimeout(() => {
      setChest({ open: true, opening: false, reward: data.reward })
      if (data.reward?.newSteps !== undefined) load()
    }, 800)
  }

  function closeChest() {
    setChest({ open: false, opening: false, reward: null })
  }

  function showToast(msg: string, type: typeof toast extends null ? never : NonNullable<typeof toast>['type']) {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">読み込み中...</div>
  if (!state) return <div className="p-6 text-red-500">エラーが発生しました</div>

  const { character, steps, collected, totalOpenings } = state

  // Calculate board position
  const totalSize = SUGOROKU_STAGES.reduce((a, b) => a + b, 0)
  let currentStageIdx = 0
  let stepsBeforeStage = 0
  let runningTotal = 0
  for (let i = 0; i < SUGOROKU_STAGES.length; i++) {
    if (steps <= runningTotal + SUGOROKU_STAGES[i]) {
      currentStageIdx = i
      stepsBeforeStage = runningTotal
      break
    }
    runningTotal += SUGOROKU_STAGES[i]
  }
  const stepsInStage = steps - stepsBeforeStage
  const stageSize = SUGOROKU_STAGES[currentStageIdx]

  const selectedChar = character ? CHARACTERS.find(c => c.id === character) : null
  const charStageIndex = getCharStageIndex(totalOpenings)
  const canAdvance = steps < totalOpenings && steps < totalSize

  // Build board cells for current stage
  const stageEvents = STAGE_EVENTS[currentStageIdx] ?? []
  const cols = 5
  const rows = Math.ceil((stageSize + 1) / cols)

  // Build grid: boustrophedon (snake) layout
  const cells: { pos: number; isEvent: boolean; isPlayer: boolean; isGoal: boolean }[] = []
  for (let pos = 0; pos <= stageSize; pos++) {
    const row = Math.floor(pos / cols)
    const col = row % 2 === 0 ? pos % cols : cols - 1 - (pos % cols)
    cells.push({
      pos,
      isEvent: stageEvents.includes(pos),
      isPlayer: pos === stepsInStage,
      isGoal: pos === stageSize,
    })
  }

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto">

      {/* チェストモーダル */}
      {chest.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={chest.reward ? closeChest : undefined}>
          <div className="bg-white rounded-3xl p-8 mx-6 text-center shadow-2xl max-w-xs w-full" onClick={e => e.stopPropagation()}>
            {!chest.reward ? (
              <>
                <div className={`text-7xl mb-4 select-none transition-transform duration-200 ${chest.opening ? 'animate-bounce' : 'cursor-pointer hover:scale-110'}`}
                  onClick={openChest}>
                  {chest.opening ? '📦' : '🎁'}
                </div>
                <p className="text-lg font-black text-gray-800 mb-2">イベントマス！</p>
                <p className="text-sm text-gray-500 mb-5">チェストをタップして開ける</p>
                <button onClick={openChest} disabled={chest.opening}
                  className="w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-white font-black rounded-2xl shadow hover:shadow-lg active:scale-95 transition-all disabled:opacity-50">
                  {chest.opening ? '開けてる...' : '✨ 開ける！'}
                </button>
              </>
            ) : (
              <>
                <div className="text-7xl mb-3 animate-bounce">{chest.reward.emoji}</div>
                <p className="text-2xl font-black text-gray-800 mb-2">{chest.reward.message}</p>
                {chest.reward.type === 'steps' && (
                  <p className="text-sm text-violet-500 font-bold mb-4">自動で{chest.reward.amount}マス進んだ！</p>
                )}
                {chest.reward.type === 'message' && (
                  <p className="text-sm text-gray-400 mb-4">はずれ... でも応援してるよ！</p>
                )}
                <button onClick={closeChest}
                  className="w-full py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-black rounded-2xl shadow hover:shadow-lg active:scale-95 transition-all">
                  閉じる
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {/* Header */}
      <div className="mb-5 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-1">Mini Game</p>
        <h1 className="text-2xl font-bold">開通双六</h1>
        <div className="flex items-center gap-4 mt-2 text-sm">
          <span className="text-violet-200">累計開通 <span className="font-black text-white text-base">{totalOpenings}</span> 件</span>
          <span className="text-violet-200">進んだマス <span className="font-black text-white text-base">{steps}</span> / {totalSize}</span>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-bold text-center shadow transition-all ${
          toast.type === 'error' ? 'bg-red-100 text-red-700' :
          toast.type === 'clear' ? 'bg-amber-100 text-amber-700' :
          toast.type === 'event' ? 'bg-sky-100 text-sky-700' :
          'bg-green-100 text-green-700'
        }`}>
          {toast.type === 'clear' && '🎉 '}{toast.type === 'event' && '✨ '}{toast.msg}
        </div>
      )}

      {/* No character selected */}
      {!character && (
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 mb-5 text-center">
          <p className="text-sm font-bold text-violet-700 mb-3">キャラクターを選んでください</p>
          <div className="grid grid-cols-5 gap-2">
            {CHARACTERS.filter(c => collected.includes(c.id)).map(c => (
              <button key={c.id} onClick={() => selectCharacter(c.id)}
                className="flex flex-col items-center gap-1 p-2 rounded-xl border border-violet-200 bg-white hover:bg-violet-50 active:scale-95 transition-all">
                <PixelChar char={c} stageIndex={charStageIndex} size={40} />
                <span className="text-[9px] font-bold text-gray-600 truncate w-full text-center">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl">
        {([['board', '🎲 ボード'], ['collection', `📦 コレクション (${collected.length})`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'board' && (
        <>
          {/* Current character + stage info */}
          {selectedChar && (
            <div className="flex items-center gap-4 mb-4 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className={`transition-transform duration-300 ${animation === 'move' ? 'translate-y-[-6px]' : animation === 'event' ? 'scale-110' : animation === 'clear' ? 'rotate-12 scale-125' : ''}`}>
                <PixelChar char={selectedChar} stageIndex={charStageIndex} size={56} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800">{selectedChar.name}</p>
                <p className="text-xs text-gray-500">{selectedChar.stages[charStageIndex].name}</p>
                <p className="text-xs text-violet-600 font-semibold mt-1">
                  {getStageName(currentStageIdx)} — {stepsInStage}/{stageSize}マス
                </p>
              </div>
              <button onClick={() => selectCharacter('')} className="text-xs text-gray-400 underline">変更</button>
            </div>
          )}

          {/* Progress bar for stage */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>ステージ {currentStageIdx + 1}/5: {getStageName(currentStageIdx)}</span>
              <span>{stepsInStage}/{stageSize}</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${(stepsInStage / stageSize) * 100}%` }} />
            </div>
          </div>

          {/* Sugoroku board */}
          <div ref={boardRef} className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-3 mb-4 overflow-hidden">
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {Array.from({ length: rows }).map((_, row) => {
                const isReverse = row % 2 !== 0
                const rowCells = []
                for (let col = 0; col < cols; col++) {
                  const pos = row * cols + (isReverse ? cols - 1 - col : col)
                  if (pos > stageSize) {
                    rowCells.push(<div key={col} />)
                    continue
                  }
                  const isEvent = stageEvents.includes(pos)
                  const isPlayer = pos === stepsInStage
                  const isGoal = pos === stageSize
                  const isPassed = pos < stepsInStage

                  rowCells.push(
                    <div key={col} className={`relative rounded-lg flex items-center justify-center aspect-square text-sm font-bold border transition-all
                      ${isPlayer ? 'bg-violet-500 border-violet-600 shadow-md scale-105' :
                        isGoal ? 'bg-gradient-to-br from-yellow-400 to-amber-500 border-amber-500' :
                        isEvent ? 'bg-gradient-to-br from-sky-200 to-blue-300 border-blue-300' :
                        isPassed ? 'bg-violet-100 border-violet-200 opacity-60' :
                        'bg-white border-gray-200'}`}>
                      {isPlayer && selectedChar ? (
                        <PixelChar char={selectedChar} stageIndex={charStageIndex} size={24} />
                      ) : isGoal ? (
                        <span className="text-lg">🏁</span>
                      ) : isEvent ? (
                        <span className="text-sm">✨</span>
                      ) : (
                        <span className={`text-[10px] ${isPassed ? 'text-violet-400' : 'text-gray-400'}`}>{pos}</span>
                      )}
                    </div>
                  )
                }
                return rowCells
              })}
            </div>
          </div>

          {/* Advance button */}
          {steps < totalSize ? (
            <button
              onClick={advance}
              disabled={!character || !canAdvance || advancing}
              className="w-full py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-black text-lg rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {advancing ? '移動中...' :
               !character ? 'キャラクターを選んでください' :
               !canAdvance ? `次の開通まで待とう (あと${steps - totalOpenings < 0 ? totalOpenings - steps : 0}件)` :
               '🎲 1マス進む'}
            </button>
          ) : (
            <div className="w-full py-4 bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-black text-lg rounded-2xl text-center shadow-lg">
              🏆 全ステージクリア！
            </div>
          )}

          {!canAdvance && character && steps < totalSize && (
            <p className="text-center text-xs text-gray-400 mt-2">
              累計開通数 ({totalOpenings}) 分だけ進めます。あと {steps - totalOpenings} 件開通すれば進めます！
            </p>
          )}
        </>
      )}

      {tab === 'collection' && (
        <div>
          <p className="text-xs text-gray-400 mb-4">{collected.length}/{CHARACTERS.length} 体獲得</p>
          <div className="grid grid-cols-2 gap-3">
            {CHARACTERS.map(c => {
              const owned = collected.includes(c.id)
              const isCurrent = character === c.id
              return (
                <div key={c.id}
                  className={`rounded-2xl border p-4 ${owned ? 'bg-white border-violet-200' : 'bg-gray-50 border-gray-200 opacity-40 grayscale'}
                    ${isCurrent ? 'ring-2 ring-violet-400' : ''}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <PixelChar char={c} stageIndex={owned ? charStageIndex : 0} size={40} />
                    <div>
                      <p className="text-sm font-bold text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-500">{owned ? c.stages[charStageIndex].name : '???'}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">{owned ? c.desc : 'ステージクリアで解放'}</p>
                  {owned && !isCurrent && (
                    <button onClick={() => selectCharacter(c.id)}
                      className="mt-2 w-full py-1.5 text-xs font-bold text-violet-600 border border-violet-300 rounded-lg hover:bg-violet-50 transition-colors">
                      このキャラを使う
                    </button>
                  )}
                  {isCurrent && (
                    <p className="mt-2 text-center text-xs font-bold text-violet-500">✓ 使用中</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
