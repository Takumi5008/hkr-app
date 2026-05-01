'use client'

import { useState, useEffect } from 'react'

type Role = 'member' | 'viewer' | 'manager' | 'shift_viewer'

interface Section {
  title: string
  icon: string
  color: string
  items: { label: string; desc: string }[]
}

const MEMBER_SECTIONS: Section[] = [
  {
    title: 'ダッシュボード',
    icon: '🏠',
    color: 'bg-indigo-50 border-indigo-200',
    items: [
      { label: '月間HKR実績', desc: '今月の商材ごとのキャンセル数・開通数・HKR率が一目で確認できます。' },
      { label: '2ヶ月前の確認', desc: '毎月1〜10日は2ヶ月前の開通確定結果が上部に表示されます。' },
    ],
  },
  {
    title: 'HKR入力',
    icon: '✏️',
    color: 'bg-violet-50 border-violet-200',
    items: [
      { label: '実績を入力する', desc: '商材ごとに「キャンセル数」と「開通数」を入力して保存します。入力した月は画面上部のセレクターで切り替えできます。' },
      { label: 'ポイント付与', desc: '開通1件 +5pt、解除1件 +1pt が自動で加算されます。' },
    ],
  },
  {
    title: '行動表',
    icon: '📋',
    color: 'bg-sky-50 border-sky-200',
    items: [
      { label: '日別実績を入力', desc: '日付行をタップして稼働時間・ピンポン数・対面数・成約数などを入力します。自動保存されます。' },
      { label: '転換率タブ', desc: '「転換率」タブでピンポン→対面→成約の転換率を確認できます。' },
    ],
  },
  {
    title: '開通表',
    icon: '⚡',
    color: 'bg-amber-50 border-amber-200',
    items: [
      { label: 'フォロー管理', desc: 'So-net / WiMAX後送り / WiMAX直せちのタブを切り替えて、各お客様のフォロー状況を管理します。' },
      { label: '⭕️で対応済みにする', desc: '対応が完了したフォロー項目の「⭕️」ボタンをタップすると対応済みになりポイントが加算されます。' },
      { label: 'フォロー項目', desc: 'FM（ファーストメール）・獲得1週間後・工事日前日・工事日当日・受取日前日・受取日当日・受取1週間後の7項目があります。' },
      { label: '未確認リマインダー', desc: 'その日が期日のフォローが未確認の場合、毎日20時にプッシュ通知が届きます。' },
    ],
  },
  {
    title: '個人進捗',
    icon: '📊',
    color: 'bg-emerald-50 border-emerald-200',
    items: [
      { label: '目標達成状況', desc: '今月の目標に対して何件アドバンテージ／ビハインドしているかを確認できます。' },
      { label: 'アド・ビハの見方', desc: '「アド〇」= 目標より〇件先行、「ビハ〇」= 〇件遅れ、「オンタイム」= ちょうど目標通りです。' },
    ],
  },
  {
    title: 'マイ推移',
    icon: '📈',
    color: 'bg-teal-50 border-teal-200',
    items: [
      { label: '月別グラフ', desc: '自分のHKR実績（開通数・キャンセル数・HKR率）の月別推移をグラフで確認できます。' },
    ],
  },
  {
    title: 'シフト入力',
    icon: '📅',
    color: 'bg-green-50 border-green-200',
    items: [
      { label: '稼働日を選ぶ', desc: '翌月の稼働予定日を日付ボタンでタップして選択します。全日（●）・午前（前）・午後（後）の3種類から選べます。' },
      { label: '提出する', desc: '「提出する」ボタンをタップして完了。管理者が設定した締切日までに提出してください。' },
      { label: '締切リマインダー', desc: '締切1時間前に未提出の場合、プッシュ通知が届きます。提出済みだと +1pt 加算されます。' },
    ],
  },
  {
    title: 'MTG出欠',
    icon: '🗓️',
    color: 'bg-rose-50 border-rose-200',
    items: [
      { label: '出欠を入力する', desc: '毎週金曜のMTGに対して「出席」「欠席」「遅刻」のいずれかを選択します。遅刻の場合は到着予定時刻も入力します。' },
      { label: '締切リマインダー', desc: '締切1時間前に未入力の場合、プッシュ通知が届きます。期限内に提出すると +1pt 加算されます。' },
    ],
  },
  {
    title: 'タスク管理',
    icon: '✅',
    color: 'bg-purple-50 border-purple-200',
    items: [
      { label: 'タスクを追加', desc: 'タスク名と任意の期日を入力して追加します。' },
      { label: '完了にする', desc: 'チェックボックスをタップすると完了になります。完了済みタスクは「完了」タブで確認できます。' },
    ],
  },
  {
    title: 'スケジュール',
    icon: '🗓️',
    color: 'bg-cyan-50 border-cyan-200',
    items: [
      { label: '予定を登録', desc: '日付・タイトル・開始/終了時刻・メモを入力して個人の予定を登録できます。' },
    ],
  },
  {
    title: 'メモ',
    icon: '📝',
    color: 'bg-yellow-50 border-yellow-200',
    items: [
      { label: '自由にメモ', desc: 'タイトルと本文を入力して保存します。業務メモや覚書などに活用してください。' },
    ],
  },
  {
    title: 'チャレンジ',
    icon: '🏆',
    color: 'bg-orange-50 border-orange-200',
    items: [
      { label: 'チームチャレンジ', desc: 'チーム全体の今月の開通数と目標達成状況を確認できます。' },
      { label: 'ボスイベント', desc: 'チームの開通総数でボスにダメージを与えます。スライム→オーク→ドラゴン→ラスボスの4フェーズあり、チームで200件達成すると全ボス撃破です。詳細は「ミッション」ページのボスタブで確認できます。' },
      { label: '今週の開通ランキング', desc: '今週（月〜日）の開通件数ランキングが表示されます。' },
      { label: '個人別月次ランキング', desc: '今月の個人別開通件数ランキングが確認できます。' },
    ],
  },
  {
    title: 'ミッション',
    icon: '⚔️',
    color: 'bg-fuchsia-50 border-fuchsia-200',
    items: [
      { label: 'クエスト', desc: '毎週月曜にリセットされる5つのクエストに挑戦できます。達成後「報酬を受け取る」ボタンでポイントを獲得してください。' },
      { label: 'ボスタブ', desc: 'チームの今月の開通総数でボスのHPを削ります。4フェーズのボスを順番に撃破していきます。' },
      { label: 'バッジ', desc: 'ログイン日数・連続ログイン・レベル・開通数・クエスト達成などの条件を満たすとバッジを獲得できます。獲得数がタブに表示されます。' },
    ],
  },
  {
    title: 'ポイント交換',
    icon: '🎁',
    color: 'bg-pink-50 border-pink-200',
    items: [
      { label: 'ポイントの貯め方', desc: '開通・解除のHKR入力や開通表のフォロー対応、シフト提出、MTG出欠入力でポイントが貯まります。' },
      { label: 'レベルアップ', desc: '「⬆️ レベル」タブからレベルアップを申請します。Lv.n への昇格に必要なポイントは 100×n pt です（最大Lv.100）。ボタンを押した時点でポイントが消費されてレベルが上がります。' },
      { label: 'ガチャ', desc: '「🎰 ガチャ」タブから200ptでガチャを1回引けます。レアリティに応じてアイテムが当たります。' },
      { label: 'アイテム交換', desc: '管理者が設定したアイテムと保有ポイントを交換できます。交換申請後に管理者が承認します。' },
      { label: 'ポイント付加ルール', desc: '「ポイント付加一覧」タブで、どの行動に何ポイント付くかを確認できます。' },
    ],
  },
  {
    title: '通知の設定',
    icon: '🔔',
    color: 'bg-slate-50 border-slate-200',
    items: [
      { label: 'iPhoneの場合', desc: 'Safariでアプリを開き、共有ボタン →「ホーム画面に追加」でインストール。ホーム画面のアイコンから起動し、サイドバー下部の「通知を有効にする」をタップして許可してください。' },
      { label: '通知の種類', desc: '①開通フォローリマインダー（毎日20時）②シフト締切リマインダー（締切1時間前）③MTG締切リマインダー（締切1時間前）' },
    ],
  },
  {
    title: 'プロフィール設定',
    icon: '⚙️',
    color: 'bg-gray-50 border-gray-200',
    items: [
      { label: 'アバター設定', desc: 'サイドバー下部の自分の名前をタップ → 設定ページでアバター画像を変更できます。' },
      { label: 'パスワード変更', desc: '設定ページから現在のパスワードを入力して変更できます。' },
    ],
  },
]

const MANAGER_EXTRA_SECTIONS: Section[] = [
  {
    title: 'チーム全体',
    icon: '👥',
    color: 'bg-teal-50 border-teal-200',
    items: [
      { label: 'HKR一覧', desc: '全メンバーの月別HKR実績（キャンセル・開通・HKR率）を一覧で確認できます。月を切り替えて過去データも閲覧可能。' },
      { label: 'ランキング', desc: 'HKR率の上位・要フォローメンバーを商材別に確認できます。' },
      { label: '委託費集計', desc: 'チーム合計の開通数から委託費（開通1件 × ¥15,000）を自動計算して表示します。' },
    ],
  },
  {
    title: 'メンバー招待',
    icon: '✉️',
    color: 'bg-indigo-50 border-indigo-200',
    items: [
      { label: '招待リンクを発行', desc: '管理ページ →「ユーザー・商材」タブ →「招待リンクを生成」ボタンで有効期限7日・1回限りの招待URLを発行できます。URLをコピーして新メンバーに共有してください。' },
    ],
  },
  {
    title: 'ロール変更',
    icon: '🔑',
    color: 'bg-blue-50 border-blue-200',
    items: [
      { label: 'ロールの種類', desc: '「メンバー」自分のデータのみ / 「閲覧者」全員閲覧可 / 「マネージャー」全機能管理可 / 「シフト管理者」シフトのみ閲覧可' },
      { label: '変更方法', desc: '管理ページ →「ユーザー・商材」タブ → メンバー一覧のドロップダウンから選択すると自動保存されます。自分自身のロールは変更できません。' },
    ],
  },
  {
    title: '商材管理',
    icon: '📦',
    color: 'bg-violet-50 border-violet-200',
    items: [
      { label: '商材の追加・削除', desc: '管理ページ →「ユーザー・商材」タブ →「取扱商材」セクションで追加・削除できます。HKR入力・推移グラフに反映されます。' },
      { label: '注意', desc: '商材を削除すると、その商材に関連するHKRデータが閲覧できなくなります。' },
    ],
  },
  {
    title: 'シフト管理',
    icon: '📅',
    color: 'bg-emerald-50 border-emerald-200',
    items: [
      { label: '提出状況の確認', desc: '管理ページ →「シフト管理」タブで全員の提出状況を確認できます。' },
      { label: '締切設定', desc: '「提出締切の設定」で日時を入力して保存すると、締切前にメンバーへ自動通知されます。' },
      { label: 'シフトの修正', desc: 'メンバー名の横の✏️アイコンをタップ → 修正モーダルで稼働日を変更して保存できます（全日/午前/午後）。' },
    ],
  },
  {
    title: 'MTG管理',
    icon: '🗓️',
    color: 'bg-rose-50 border-rose-200',
    items: [
      { label: '出欠の確認', desc: '管理ページ →「MTG管理」タブで全員の出欠状況を一覧で確認できます。' },
      { label: '締切設定', desc: '「提出締切の設定」で日時を入力して保存します。' },
      { label: '出欠の修正', desc: '一覧のセルをタップすると「出席/欠席/遅刻」のポップアップが表示され、即時修正できます。' },
    ],
  },
  {
    title: '個人進捗の確認',
    icon: '📊',
    color: 'bg-orange-50 border-orange-200',
    items: [
      { label: '全員の進捗を確認', desc: '管理ページ →「個人進捗」タブで全メンバーの今月の目標・実績・アド/ビハを一括確認できます。' },
    ],
  },
  {
    title: 'ポイント手動付与',
    icon: '⭐',
    color: 'bg-amber-50 border-amber-200',
    items: [
      { label: '付与方法', desc: 'ポイント交換ページ →「ポイントを手動付与」セクションでメンバーを選択し、ポイント数（マイナス可）と理由を入力して付与できます。' },
      { label: 'レベルランキング', desc: 'ポイント交換ページ → 交換一覧タブの下部に「🏆レベルランキング」が表示されます。レベルが高い順、同レベルはポイントが多い順に並びます。' },
    ],
  },
  {
    title: '通知送信',
    icon: '📣',
    color: 'bg-purple-50 border-purple-200',
    items: [
      { label: '手動送信', desc: '管理ページ →「ユーザー・商材」タブ →「今すぐ通知を送る」ボタンで開通フォローリマインダーを任意のタイミングで全員に送信できます。' },
      { label: '自動通知の種類', desc: '①開通フォローリマインダー（毎日20時）②シフト締切1時間前③MTG締切1時間前。通知はサイドバー下部の「通知を有効にする」から有効化できます。' },
    ],
  },
]

const SHIFT_VIEWER_EXTRA_SECTIONS: Section[] = [
  {
    title: 'シフト管理（閲覧・修正）',
    icon: '📅',
    color: 'bg-emerald-50 border-emerald-200',
    items: [
      { label: '全員のシフト確認', desc: '管理ページ（サイドバー「シフト管理」）で全メンバーの提出状況を月別に確認できます。' },
      { label: 'シフトの修正', desc: 'メンバー名の横の✏️アイコンをタップ → 修正モーダルで稼働日を変更できます（全日/午前/午後）。' },
      { label: '締切設定', desc: '「提出締切の設定」で締切日時を設定できます。締切1時間前に未提出メンバーへ通知が届きます。' },
    ],
  },
]

const ROLE_LABEL: Record<Role, string> = {
  member: 'メンバー',
  viewer: '閲覧者',
  manager: 'マネージャー',
  shift_viewer: 'シフト管理者',
}

const ROLE_COLOR: Record<Role, string> = {
  member: 'from-indigo-600 to-blue-500',
  viewer: 'from-blue-600 to-cyan-500',
  manager: 'from-slate-700 to-slate-600',
  shift_viewer: 'from-emerald-600 to-teal-500',
}

export default function HowtoPage() {
  const [role, setRole] = useState<Role | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setRole(d.role ?? 'member'))
  }, [])

  if (!role) return null

  const isManager = role === 'manager' || role === 'viewer'
  const isShiftViewer = role === 'shift_viewer'

  const sections = [
    ...MEMBER_SECTIONS,
    ...(isManager ? MANAGER_EXTRA_SECTIONS : []),
    ...(isShiftViewer ? SHIFT_VIEWER_EXTRA_SECTIONS : []),
  ]

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className={`mb-6 bg-gradient-to-r ${ROLE_COLOR[role]} rounded-2xl px-6 py-5 shadow-md text-white`}>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-1">How to use</p>
        <h1 className="text-2xl font-bold">使い方ガイド</h1>
        <p className="text-sm text-white/70 mt-1">
          {ROLE_LABEL[role]}向けの操作説明です
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.title} className={`rounded-2xl border p-5 ${section.color}`}>
            <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>{section.icon}</span>
              {section.title}
            </h2>
            <div className="space-y-3">
              {section.items.map((item) => (
                <div key={item.label}>
                  <p className="text-sm font-semibold text-gray-700 mb-0.5">{item.label}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isManager && (
        <p className="mt-6 text-xs text-gray-400 text-center">
          管理者向け詳細マニュアルは <a href="/help/manager" className="text-indigo-500 underline">こちら</a>
        </p>
      )}
      {!isManager && (
        <p className="mt-6 text-xs text-gray-400 text-center">
          メンバー向け詳細マニュアルは <a href="/help/member" className="text-indigo-500 underline">こちら</a>
        </p>
      )}
    </div>
  )
}
