'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Keyboard, Trophy, RotateCcw, Play, Timer } from 'lucide-react'
import UserAvatar from '@/components/UserAvatar'
import { RomajiMatcher } from '@/lib/romaji'
import { TYPING_WORDS } from '@/lib/typingWords'

const GAME_SECONDS = 60

type Phase = 'ready' | 'countdown' | 'playing' | 'result'
type RankRow = { user_id: number; name: string; avatar: string | null; best: number; plays: number }
type Stats = { weekStart: string; ranking: RankRow[]; myUserId: number; myBest: number | null; myWeekBest: number | null }

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// カタカナ → ひらがな（スマホのかな入力用）
const toHiragana = (c: string) => {
  const code = c.charCodeAt(0)
  return code >= 0x30a1 && code <= 0x30f6 ? String.fromCharCode(code - 0x60) : c
}

export default function TypingPage() {
  const [phase, setPhase] = useState<Phase>('ready')
  const [countdown, setCountdown] = useState(3)
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS)
  const [correct, setCorrect] = useState(0)
  const [miss, setMiss] = useState(0)
  const [words, setWords] = useState(0)
  const [missFlash, setMissFlash] = useState(false)
  const [view, setView] = useState({ text: '', kanaDone: '', kanaRest: '', typed: '', rest: '' })
  const [stats, setStats] = useState<Stats | null>(null)
  const [saving, setSaving] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const queueRef = useRef<typeof TYPING_WORDS>([])
  const wordRef = useRef(TYPING_WORDS[0])
  const matcherRef = useRef<RomajiMatcher>(new RomajiMatcher(TYPING_WORDS[0].kana))
  const composingRef = useRef(false)
  const endAtRef = useRef(0)
  const scoreRef = useRef({ correct: 0, miss: 0, words: 0 })

  const loadStats = useCallback(() => {
    fetch('/api/games/typing').then((r) => (r.ok ? r.json() : null)).then((d) => d && setStats(d))
  }, [])

  useEffect(() => { loadStats() }, [loadStats])

  // 表示用スナップショット（ref は描画中に読まないため state に写す）
  const refreshView = () => {
    const m = matcherRef.current
    const { typed, rest } = m.guide()
    setView({
      text: wordRef.current.text,
      kanaDone: m.kana.slice(0, m.pos),
      kanaRest: m.kana.slice(m.pos),
      typed,
      rest,
    })
  }

  const nextWord = () => {
    if (queueRef.current.length === 0) queueRef.current = shuffle(TYPING_WORDS)
    const w = queueRef.current.shift()!
    wordRef.current = w
    matcherRef.current = new RomajiMatcher(w.kana)
    refreshView()
  }

  const start = () => {
    queueRef.current = shuffle(TYPING_WORDS)
    nextWord()
    scoreRef.current = { correct: 0, miss: 0, words: 0 }
    setCorrect(0); setMiss(0); setWords(0)
    setTimeLeft(GAME_SECONDS)
    setCountdown(3)
    setPhase('countdown')
    inputRef.current?.focus()
  }

  // カウントダウン
  useEffect(() => {
    if (phase !== 'countdown') return
    const t = setTimeout(() => {
      if (countdown > 1) {
        setCountdown((c) => c - 1)
      } else {
        endAtRef.current = Date.now() + GAME_SECONDS * 1000
        setPhase('playing')
      }
    }, 700)
    return () => clearTimeout(t)
  }, [phase, countdown])

  const finish = useCallback(async () => {
    setPhase('result')
    inputRef.current?.blur()
    setSaving(true)
    const { correct, miss, words } = scoreRef.current
    await fetch('/api/games/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: correct, miss, words }),
    }).catch(() => {})
    setSaving(false)
    loadStats()
  }, [loadStats])

  // 残り時間
  useEffect(() => {
    if (phase !== 'playing') return
    const t = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000))
      setTimeLeft(left)
      if (left === 0) {
        clearInterval(t)
        finish()
      }
    }, 100)
    return () => clearInterval(t)
  }, [phase, finish])

  const typeChar = (raw: string) => {
    if (phase !== 'playing') return
    const c = toHiragana(raw.toLowerCase())
    const m = matcherRef.current
    let ok: boolean
    if (/^[a-z-]$/.test(c)) ok = m.input(c)
    else if (/^[ぁ-ゖー]$/.test(c)) ok = m.inputKana(c)
    else return // 空白などは無視

    if (ok) {
      scoreRef.current.correct++
      setCorrect(scoreRef.current.correct)
      if (m.done) {
        scoreRef.current.words++
        setWords(scoreRef.current.words)
        nextWord()
      }
    } else {
      scoreRef.current.miss++
      setMiss(scoreRef.current.miss)
      setMissFlash(true)
      setTimeout(() => setMissFlash(false), 150)
    }
    refreshView()
  }

  const handleText = (text: string) => {
    for (const ch of text) typeChar(ch)
  }

  // PC：スペース / Enter でスタート
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((phase === 'ready' || phase === 'result') && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        start()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const total = correct + miss
  const accuracy = total > 0 ? Math.round((correct / total) * 1000) / 10 : 0
  const myRank = stats?.ranking.findIndex((r) => r.user_id === stats.myUserId) ?? -1

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
      <div className="bg-gradient-to-r from-sky-600 to-blue-600 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-200 mb-1">Mini Game</p>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Keyboard size={24} />開通タイピング</h1>
        <p className="text-sm text-sky-100 mt-0.5">{GAME_SECONDS}秒で何文字打てるか挑戦！ 今週のランキングで競おう</p>
      </div>

      {/* 入力受付用（画面外。スマホではタップでキーボードを出す） */}
      <input
        ref={inputRef}
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="タイピング入力"
        className="fixed -left-[9999px] top-0 w-px h-px opacity-0"
        onCompositionStart={() => { composingRef.current = true }}
        onCompositionEnd={(e) => {
          composingRef.current = false
          handleText(e.data)
          e.currentTarget.value = ''
        }}
        onChange={(e) => {
          if (composingRef.current) return
          handleText(e.target.value)
          e.target.value = ''
        }}
      />

      {/* ゲーム画面 */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={`relative bg-white rounded-2xl shadow-sm ring-1 transition-colors ${missFlash ? 'ring-rose-400 bg-rose-50' : 'ring-gray-100'} p-6 min-h-[260px] flex flex-col items-center justify-center text-center`}
      >
        {phase === 'ready' && (
          <>
            <p className="text-gray-600 text-sm mb-1">表示された言葉をローマ字で入力してください</p>
            <p className="text-gray-400 text-xs mb-5">スマホはかな入力でもOK ・ PCは半角英数モードで</p>
            <button onClick={start} className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow hover:bg-blue-700 transition">
              <Play size={18} />スタート
            </button>
            <p className="text-[11px] text-gray-400 mt-3 hidden sm:block">スペースキーでもスタートできます</p>
          </>
        )}

        {phase === 'countdown' && (
          <p className="text-7xl font-black text-blue-600 tabular-nums">{countdown}</p>
        )}

        {phase === 'playing' && (
          <div className="w-full">
            <div className="flex items-center justify-between text-sm mb-4">
              <span className="flex items-center gap-1 font-bold text-gray-700 tabular-nums">
                <Timer size={16} className={timeLeft <= 10 ? 'text-rose-500' : 'text-blue-500'} />{timeLeft}秒
              </span>
              <span className="text-gray-500">スコア <span className="font-bold text-gray-800 tabular-nums">{correct}</span></span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-8">
              <div className="h-full bg-blue-500 transition-all duration-100" style={{ width: `${(timeLeft / GAME_SECONDS) * 100}%` }} />
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 break-words">{view.text}</p>
            <p className="text-lg mb-3">
              <span className="text-blue-500">{view.kanaDone}</span><span className="text-gray-500">{view.kanaRest}</span>
            </p>
            <p className="font-mono text-xl tracking-wider break-all">
              <span className="text-blue-600">{view.typed}</span><span className="text-gray-300">{view.rest}</span>
            </p>
            <p className="text-[11px] text-gray-400 mt-6 sm:hidden">キーボードが出ない場合はここをタップ</p>
          </div>
        )}

        {phase === 'result' && (
          <div className="w-full">
            <p className="text-sm text-gray-500 mb-1">結果</p>
            <p className="text-5xl font-black text-blue-600 tabular-nums mb-4">{correct}<span className="text-lg font-bold text-gray-400 ml-1">点</span></p>
            <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto mb-5 text-sm">
              <div className="bg-gray-50 rounded-lg py-2"><p className="text-xs text-gray-400">単語</p><p className="font-bold text-gray-800">{words}</p></div>
              <div className="bg-gray-50 rounded-lg py-2"><p className="text-xs text-gray-400">ミス</p><p className="font-bold text-gray-800">{miss}</p></div>
              <div className="bg-gray-50 rounded-lg py-2"><p className="text-xs text-gray-400">正確率</p><p className="font-bold text-gray-800">{accuracy}%</p></div>
            </div>
            {saving ? (
              <p className="text-xs text-gray-400 mb-4">記録中...</p>
            ) : stats && myRank >= 0 ? (
              <p className="text-sm text-gray-600 mb-4">今週のランキング <span className="font-bold text-blue-600">{myRank + 1}位</span></p>
            ) : null}
            <button onClick={start} className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow hover:bg-blue-700 transition">
              <RotateCcw size={16} />もう一度
            </button>
          </div>
        )}
      </div>

      {/* 自分の記録 */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">今週のベスト</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{stats.myWeekBest ?? '-'}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">自己ベスト</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{stats.myBest ?? '-'}</p>
          </div>
        </div>
      )}

      {/* 今週のランキング */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
          <Trophy size={16} className="text-amber-500" />
          <h2 className="text-sm font-bold text-gray-700">今週のランキング</h2>
          <span className="text-xs text-gray-400 ml-auto">毎週月曜リセット</span>
        </div>
        {!stats ? (
          <p className="text-sm text-gray-400 text-center py-8">読み込み中...</p>
        ) : stats.ranking.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">まだ記録がありません。一番乗りしよう！</p>
        ) : (
          <ol className="divide-y divide-gray-50">
            {stats.ranking.map((r, i) => (
              <li key={r.user_id} className={`flex items-center gap-3 px-4 py-2.5 ${r.user_id === stats.myUserId ? 'bg-blue-50/60' : ''}`}>
                <span className={`w-6 text-center font-bold tabular-nums ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-400' : 'text-gray-400'}`}>{i + 1}</span>
                <UserAvatar name={r.name} avatar={r.avatar} size="sm" />
                <span className="text-sm font-medium text-gray-800 flex-1 truncate">{r.name}</span>
                <span className="text-xs text-gray-400">{r.plays}回</span>
                <span className="text-sm font-bold text-gray-900 tabular-nums w-12 text-right">{r.best}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
