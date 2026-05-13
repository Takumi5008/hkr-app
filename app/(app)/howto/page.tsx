'use client'

import { useState, useEffect } from 'react'

type Role = 'member' | 'viewer' | 'manager' | 'shift_viewer' | 'admin'

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
      { label: '今日やること', desc: '当日のシフト・開通カレンダー・フォロー対応・月次振り返りなど、その日にやるべきタスクを自動で表示します。タスク行をタップするとチェックが付き、日をまたぐと自動リセットされます。提出済みや入力済みのタスクは自動でチェック済みになります。' },
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
      { label: '期間の切り替え', desc: '「半年」「1年」「2年」ボタンで表示期間を切り替えられます。商材ごとのタブと組み合わせて確認できます。' },
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
    title: '月次振り返り',
    icon: '📋',
    color: 'bg-teal-50 border-teal-200',
    items: [
      { label: '受付期間', desc: '毎月第1月曜日から第1金曜日の間だけ入力・提出できます。前月の振り返りを記入します。期間外は閲覧のみになります。' },
      { label: 'フォームの内容', desc: '①今月の結果 自己評価（達成/ほぼ達成/未達）②良かったこと③課題・反省点④来月の目標⑤アプリの良かった点（任意）⑥アプリへの改善・機能要望（任意）' },
      { label: '提出後の修正', desc: '受付期間中であれば「修正する」から内容を変更して再提出できます。' },
      { label: 'ダッシュボードの通知', desc: '受付期間中は「今日やること」に「月次振り返り提出」が表示されます。提出済みになると自動でチェックが付きます。' },
    ],
  },
  {
    title: 'チャレンジ',
    icon: '🏆',
    color: 'bg-orange-50 border-orange-200',
    items: [
      { label: 'チームチャレンジ', desc: 'チーム全体の今月の開通数と目標達成状況を確認できます。' },
      { label: 'ボスイベント', desc: 'チームの開通総数でボスにダメージを与えます。スライム→オーク→ドラゴン→ラスボスの4フェーズあり、チームで200件達成すると全ボス撃破です。' },
      { label: '次のボス予告', desc: 'まだ出現していない次のボスと「あと何件で出現するか」が一覧表示されます。チームの目標設定の参考にしてください。' },
      { label: '今週の開通ランキング', desc: '今週（月〜日）の開通件数ランキングが表示されます。' },
      { label: '個人別月次ランキング', desc: '今月の個人別開通件数ランキングが確認できます。' },
    ],
  },
  {
    title: '開通双六',
    icon: '🎲',
    color: 'bg-purple-50 border-purple-200',
    items: [
      { label: 'ゲームの進め方', desc: '累計開通件数がそのままサイコロの出目になります。「サイコロを振る」ボタンをタップすると、累計開通数に応じてコマが進みます。' },
      { label: 'ステージ構成', desc: '全10ステージ・合計550マスのボードです。各ステージのマス数は10・20・30…100と段階的に増えていきます。' },
      { label: 'キャラクター', desc: '各ステージをクリアすると専用キャラクターが1体解放されます。合計10体のキャラクターを集めましょう。サイドバーでキャラクターを選択してコマを切り替えられます。' },
      { label: 'イベントマス', desc: '各ステージの中間地点に⭐イベントマスがあります。踏むと特別な演出が発生します。' },
    ],
  },
  {
    title: '知識向上',
    icon: '🎓',
    color: 'bg-violet-50 border-violet-200',
    items: [
      { label: '録音タブ', desc: '営業会議・研修などの音声録音ファイルをアップロード・再生できます。▶ボタンでインライン再生し、シークバーで任意の位置から聴けます。' },
      { label: 'インフラ講座タブ', desc: 'インフラ講座の動画・PDF・テキスト資料をアップロード・閲覧できます。動画はインラインプレイヤーで再生可能です。' },
      { label: 'ダウンロード', desc: 'どのファイルも📥ボタンからダウンロードできます。' },
      { label: 'アップロード（全メンバー可）', desc: '「アップロード」ボタンからタイトル・説明・ファイルを選択してアップロードできます。アップロードしたファイルは全メンバーに共有されます。対応形式：音声（MP3/WAV/M4A）、動画（MP4/MOV）、PDF、テキスト。削除はマネージャー・管理者のみ可能です。' },
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
      { label: 'ロールの種類', desc: '「メンバー」自分のデータのみ / 「閲覧者」全員閲覧可 / 「マネージャー」全機能管理可 / 「シフト管理者」シフトのみ閲覧可 / 「アプリ管理者」全機能＋システム管理可（最上位権限）' },
      { label: '変更方法', desc: '管理ページ →「ユーザー・商材」タブ → メンバー一覧のドロップダウンから選択すると自動保存されます。自分自身のロールは変更できません。' },
    ],
  },
  {
    title: 'アカウントの無効化',
    icon: '🚫',
    color: 'bg-red-50 border-red-200',
    items: [
      { label: '離職者の対応', desc: '管理ページ →「ユーザー・商材」タブ → メンバー一覧の右端の🚫ボタンをタップ → 確認後に無効化できます。無効化したアカウントはログインできなくなり、既存セッションも即時無効になります。' },
      { label: '再有効化', desc: '無効化されたユーザーはグレーアウトして「無効」バッジが表示されます。同じボタン（✅マークに変わります）で再度有効化できます。' },
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
    title: '通知送信',
    icon: '📣',
    color: 'bg-purple-50 border-purple-200',
    items: [
      { label: '手動送信', desc: '管理ページ →「ユーザー・商材」タブ →「今すぐ通知を送る」ボタンで開通フォローリマインダーを任意のタイミングで全員に送信できます。' },
      { label: '自動通知の種類', desc: '①開通フォローリマインダー（毎日20時）②シフト締切1時間前③MTG締切1時間前。通知はサイドバー下部の「通知を有効にする」から有効化できます。' },
    ],
  },
  {
    title: '月次振り返り（提出確認）',
    icon: '📋',
    color: 'bg-teal-50 border-teal-200',
    items: [
      { label: '提出状況の確認（アプリ管理者のみ）', desc: '月次振り返りページの下部に「提出状況（管理者）」セクションが表示されます。年・月を切り替えて全員の提出内容を一覧で確認できます。各メンバーの行をタップすると詳細が展開されます。' },
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
  admin: 'アプリ管理者',
}

const ROLE_COLOR: Record<Role, string> = {
  member: 'from-indigo-600 to-blue-500',
  viewer: 'from-blue-600 to-cyan-500',
  manager: 'from-slate-700 to-slate-600',
  shift_viewer: 'from-emerald-600 to-teal-500',
  admin: 'from-red-700 to-rose-600',
}

export default function HowtoPage() {
  const [role, setRole] = useState<Role | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setRole(d.role ?? 'member'))
  }, [])

  if (!role) return null

  const isManager = role === 'manager' || role === 'viewer' || role === 'admin'
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
