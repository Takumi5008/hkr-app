'use client'

import Image from 'next/image'

export default function MemberHelpPage() {
  return (
    <div className="bg-white min-h-screen font-sans">
      {/* 印刷ボタン（印刷時非表示） */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <button onClick={() => window.print()}
          className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-full shadow-lg hover:bg-indigo-700 transition">
          PDFで保存 / 印刷
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-10 print:px-6 print:py-6">

        {/* ヘッダー */}
        <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-500 px-10 py-10 mb-10 text-white shadow-xl print:rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-lg">IP</div>
            <span className="text-lg font-semibold opacity-80">インフラ管理システム</span>
          </div>
          <h1 className="text-4xl font-black mb-2 tracking-tight">メンバー向け<br />操作マニュアル</h1>
          <p className="text-indigo-100 text-sm mt-3">このマニュアルでは、日々の業務で使う機能をわかりやすく説明します。</p>
        </div>

        {/* 目次 */}
        <div className="bg-indigo-50 rounded-2xl p-6 mb-10 border border-indigo-100">
          <h2 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-4">目次</h2>
          <div className="grid grid-cols-2 gap-2 text-sm text-indigo-800">
            {[
              ['01', 'ログイン方法'],
              ['02', 'ダッシュボード'],
              ['03', 'HKR入力'],
              ['04', '行動表'],
              ['05', '開通表'],
              ['06', 'シフト入力'],
              ['07', 'MTG出欠'],
              ['08', 'その他機能'],
              ['09', '通知について'],
            ].map(([num, title]) => (
              <div key={num} className="flex items-center gap-2">
                <span className="text-indigo-300 font-mono text-xs">{num}</span>
                <span>{title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* セクション */}
        <Section num="01" title="ログイン方法" color="indigo">
          <Steps steps={[
            'ブラウザでアプリのURLを開く',
            'メールアドレスとパスワードを入力する',
            '「ログイン」ボタンをタップ',
          ]} />
          <Tip>iPhoneの場合はSafariで開き、共有ボタン→「ホーム画面に追加」でアイコンから起動できます。</Tip>
        </Section>

        <Section num="02" title="ダッシュボード" color="blue">
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            ログイン後に最初に表示される画面です。今月のHKR実績・目標進捗・タスクの状況を一目で確認できます。
          </p>
          <InfoCards items={[
            { label: '月間実績', desc: '今月のキャンセル・開通数を表示' },
            { label: '進捗状況', desc: '目標に対する達成率をグラフで確認' },
            { label: 'タスク', desc: '本日のタスクや期限が近いものを表示' },
          ]} />
          <Screenshot src="/screenshots/dashboard.png" caption="ダッシュボード画面" />
        </Section>

        <Section num="03" title="HKR入力" color="violet">
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            日々の営業実績（キャンセル数・開通数）を商材別に入力します。
          </p>
          <Steps steps={[
            'サイドバーの「HKR入力」をタップ',
            '年月が正しいか確認する',
            '商材ごとにキャンセル数・開通数を入力',
            '「保存」ボタンをタップして完了',
          ]} />
          <Tip>入力した数値は翌月以降も累積で確認できます。</Tip>
          <Screenshot src="/screenshots/input.png" caption="HKR入力画面" />
        </Section>

        <Section num="04" title="行動表" color="sky">
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            日ごとの行動実績（ピンポン数・対面数・聴取シートなど）を入力します。転換率の計算にも使われます。
          </p>
          <Steps steps={[
            'サイドバーの「行動表」をタップ',
            '入力したい日付の行をタップ',
            '各項目（稼働時間・ピンポン・対面など）を入力',
            '自動で保存されます',
          ]} />
          <InfoCards items={[
            { label: '稼働時間', desc: '例：8.5（時間単位で入力）' },
            { label: 'ピンポン', desc: 'その日に訪問したドア数' },
            { label: '対面', desc: '実際に話せた件数' },
            { label: 'WiMAX・So-net', desc: '商品ごとの成約数' },
          ]} />
          <Screenshot src="/screenshots/activity.png" caption="行動表画面" />
        </Section>

        <Section num="05" title="開通表" color="amber">
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            So-net・WiMAX後送り・WiMAX直せちの開通フォロー管理表です。各フォロー日に⭕️をつけることで対応済みにできます。
          </p>
          <Steps steps={[
            'サイドバーの「開通表」をタップ',
            '回線種別（So-net / WiMAX後送り / WiMAX直せち）のタブを選ぶ',
            '該当のお客様の行を確認する',
            'フォロー対応が完了したら「⭕️」ボタンをタップ',
            '「一覧」タブで全回線を日付順に確認できる',
          ]} />
          <Tip>その日が期日の未確認フォローがある場合、20時以降にアプリ上部に通知バナーが表示されます。</Tip>
          <div className="mt-4 bg-amber-50 rounded-xl p-4 border border-amber-100">
            <p className="text-xs font-bold text-amber-700 mb-2">フォロー項目一覧</p>
            <div className="grid grid-cols-2 gap-1 text-xs text-amber-800">
              {['FM（ファーストメール）', '獲得1週間後', '工事日前日', '工事日当日', '受取日前日', '受取日当日', '受取1週間後'].map((item) => (
                <div key={item} className="flex items-center gap-1">
                  <span className="text-amber-400">●</span>{item}
                </div>
              ))}
            </div>
          </div>
          <Screenshot src="/screenshots/activation.png" caption="開通表画面" />
        </Section>

        <Section num="06" title="シフト入力" color="emerald">
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            翌月のシフト（稼働日）を入力して提出します。管理者が設定した締切日までに提出してください。
          </p>
          <Steps steps={[
            'サイドバーの「シフト入力」をタップ',
            '翌月の稼働日を日付ボタンでタップして選択',
            '● 全日 / 前 午前 / 後 午後 の3種類から選べます',
            '「提出する」ボタンをタップして完了',
          ]} />
          <Tip>締切1時間前になると通知が届きます。締切後は提出できません。</Tip>
          <Screenshot src="/screenshots/shift.png" caption="シフト入力画面" />
        </Section>

        <Section num="07" title="MTG出欠" color="rose">
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            毎週金曜のMTGの出欠を入力します。管理者が設定した締切日までに入力してください。
          </p>
          <Steps steps={[
            'サイドバーの「MTG出欠」をタップ',
            '該当の金曜日の行を確認する',
            '「出席」「欠席」「遅刻」のいずれかを選択',
            '遅刻の場合は到着予定時刻も入力',
          ]} />
          <Tip>締切1時間前になると通知が届きます。</Tip>
          <Screenshot src="/screenshots/mtg.png" caption="MTG出欠画面" />
        </Section>

        <Section num="08" title="その他機能" color="purple">
          <InfoCards items={[
            { label: 'タスク管理', desc: 'やることリストを管理。期日設定や完了チェックができます' },
            { label: 'スケジュール', desc: '個人の予定を登録・管理できます' },
            { label: 'メモ', desc: '自由に書けるメモ帳。業務メモなどに活用できます' },
            { label: 'マイ推移', desc: '自分のHKR実績の月別推移グラフを確認できます' },
            { label: '個人進捗', desc: '今月の目標に対する進捗状況を確認できます' },
          ]} />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Screenshot src="/screenshots/tasks.png" caption="タスク管理" />
            <Screenshot src="/screenshots/trends.png" caption="マイ推移" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Screenshot src="/screenshots/schedule.png" caption="スケジュール" />
            <Screenshot src="/screenshots/memo.png" caption="メモ" />
          </div>
        </Section>

        <Section num="09" title="通知について" color="orange">
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            アプリはiPhoneのホーム画面に追加することでプッシュ通知を受け取れます。
          </p>
          <div className="space-y-3">
            <NotifItem color="amber" title="開通表リマインダー" desc="毎日20時に、その日の未確認フォロー項目がある場合に通知されます" />
            <NotifItem color="rose" title="シフト締切リマインダー" desc="シフト提出締切の1時間前に、未提出の場合に通知されます" />
            <NotifItem color="rose" title="MTG締切リマインダー" desc="MTG出欠提出締切の1時間前に、未提出の場合に通知されます" />
          </div>
          <Tip>iPhoneの場合：Safariで開く → 共有ボタン → ホーム画面に追加 → アイコンから起動 → 通知を許可</Tip>
        </Section>

        {/* フッター */}
        <div className="mt-12 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">インフラ管理システム　メンバー向け操作マニュアル</p>
        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 15mm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  )
}

function Screenshot({ src, caption }: { src: string; caption: string }) {
  return (
    <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 shadow-sm print:break-inside-avoid">
      <Image src={src} alt={caption} width={800} height={500} className="w-full object-cover object-top" style={{ maxHeight: '280px' }} />
      <p className="text-xs text-gray-500 text-center py-2 bg-gray-50">{caption}</p>
    </div>
  )
}

function Section({ num, title, color, children }: { num: string; title: string; color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-600', blue: 'bg-blue-500', violet: 'bg-violet-500',
    sky: 'bg-sky-500', amber: 'bg-amber-500', emerald: 'bg-emerald-500',
    rose: 'bg-rose-500', purple: 'bg-purple-500', orange: 'bg-orange-500',
  }
  const lightColors: Record<string, string> = {
    indigo: 'bg-indigo-50 border-indigo-100', blue: 'bg-blue-50 border-blue-100',
    violet: 'bg-violet-50 border-violet-100', sky: 'bg-sky-50 border-sky-100',
    amber: 'bg-amber-50 border-amber-100', emerald: 'bg-emerald-50 border-emerald-100',
    rose: 'bg-rose-50 border-rose-100', purple: 'bg-purple-50 border-purple-100',
    orange: 'bg-orange-50 border-orange-100',
  }
  return (
    <div className="mb-8 print:break-inside-avoid">
      <div className="flex items-center gap-3 mb-4">
        <span className={`${colors[color]} text-white text-xs font-black px-3 py-1 rounded-full`}>{num}</span>
        <h2 className="text-xl font-black text-gray-900">{title}</h2>
      </div>
      <div className={`${lightColors[color]} rounded-2xl p-5 border`}>
        {children}
      </div>
    </div>
  )
}

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-2 mb-3">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
          <span className="shrink-0 w-6 h-6 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">{i + 1}</span>
          <span className="pt-0.5">{step}</span>
        </li>
      ))}
    </ol>
  )
}

function InfoCards({ items }: { items: { label: string; desc: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <div key={item.label} className="bg-white rounded-xl p-3 border border-white/80 shadow-sm">
          <p className="text-xs font-bold text-gray-800 mb-0.5">{item.label}</p>
          <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
        </div>
      ))}
    </div>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 mt-3 bg-white/70 rounded-xl px-4 py-3 border border-white">
      <span className="text-base shrink-0">💡</span>
      <p className="text-xs text-gray-600 leading-relaxed">{children}</p>
    </div>
  )
}

function NotifItem({ color, title, desc }: { color: string; title: string; desc: string }) {
  const colors: Record<string, string> = { amber: 'bg-amber-100 text-amber-700', rose: 'bg-rose-100 text-rose-700' }
  return (
    <div className="bg-white rounded-xl p-4 border border-white/80 shadow-sm flex items-start gap-3">
      <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${colors[color]}`}>通知</span>
      <div>
        <p className="text-sm font-bold text-gray-800">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
    </div>
  )
}
