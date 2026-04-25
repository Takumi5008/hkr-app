'use client'

import Image from 'next/image'

export default function ManagerHelpPage() {
  return (
    <div className="bg-white min-h-screen font-sans">
      {/* 印刷ボタン */}
      <div className="print:hidden fixed top-4 right-4 z-50">
        <button onClick={() => window.print()}
          className="px-5 py-2 bg-slate-700 text-white text-sm font-semibold rounded-full shadow-lg hover:bg-slate-800 transition">
          PDFで保存 / 印刷
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-10 print:px-6 print:py-6">

        {/* ヘッダー */}
        <div className="rounded-3xl bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 px-10 py-10 mb-10 text-white shadow-xl print:rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-lg">IP</div>
            <span className="text-lg font-semibold opacity-80">インフラ管理システム</span>
          </div>
          <h1 className="text-4xl font-black mb-2 tracking-tight">管理者向け<br />操作マニュアル</h1>
          <p className="text-slate-300 text-sm mt-3">このマニュアルでは、管理者権限で使える機能をわかりやすく説明します。</p>
        </div>

        {/* 権限説明 */}
        <div className="bg-slate-50 rounded-2xl p-6 mb-10 border border-slate-200">
          <h2 className="text-sm font-bold text-slate-600 uppercase tracking-widest mb-4">権限について</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { role: 'メンバー', desc: '自分のデータのみ閲覧・入力', color: 'bg-indigo-50 border-indigo-100 text-indigo-700' },
              { role: '閲覧者', desc: '全メンバーのデータを閲覧可能', color: 'bg-blue-50 border-blue-100 text-blue-700' },
              { role: 'マネージャー', desc: '全機能の閲覧・管理が可能', color: 'bg-slate-800 border-slate-700 text-white' },
            ].map((r) => (
              <div key={r.role} className={`rounded-xl p-3 border text-center ${r.color}`}>
                <p className="text-sm font-bold">{r.role}</p>
                <p className={`text-xs mt-1 ${r.color.includes('slate-800') ? 'text-slate-300' : 'opacity-70'}`}>{r.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 目次 */}
        <div className="bg-slate-50 rounded-2xl p-6 mb-10 border border-slate-100">
          <h2 className="text-sm font-bold text-slate-600 uppercase tracking-widest mb-4">目次</h2>
          <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
            {[
              ['01', 'メンバー招待'],
              ['02', 'ロール変更'],
              ['03', '商材管理'],
              ['04', 'シフト管理'],
              ['05', 'MTG管理'],
              ['06', '個人進捗の確認'],
              ['07', '全員の行動表・転換率'],
              ['08', '全員の開通表'],
              ['09', '通知送信'],
            ].map(([num, title]) => (
              <div key={num} className="flex items-center gap-2">
                <span className="text-slate-400 font-mono text-xs">{num}</span>
                <span>{title}</span>
              </div>
            ))}
          </div>
        </div>

        <Section num="01" title="メンバー招待" color="indigo">
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            新しいメンバーを招待するには、有効期限付きの招待リンクを発行して共有します。
          </p>
          <Steps steps={[
            '管理ページ（サイドバー「管理」）を開く',
            '「ユーザー・商材」タブを選択',
            '「招待リンクを生成」ボタンをタップ',
            '生成されたURLをコピーして新メンバーに共有',
            'メンバーがURLを開いて登録する',
          ]} />
          <Tip>招待リンクは有効期限7日間・1回限り使用可能です。</Tip>
          <Screenshot src="/screenshots/admin.png" caption="管理ページ — ユーザー・商材タブ" />
        </Section>

        <Section num="02" title="ロール変更" color="blue">
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            メンバーのロール（権限）を変更できます。自分自身のロールは変更できません。
          </p>
          <Steps steps={[
            '管理ページ → 「ユーザー・商材」タブ',
            'メンバー一覧からロールを変更したいメンバーを探す',
            'ドロップダウンからロールを選択',
            '自動で保存されます',
          ]} />
        </Section>

        <Section num="03" title="商材管理" color="violet">
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            HKR入力・推移グラフで使用する商材を管理します。
          </p>
          <Steps steps={[
            '管理ページ → 「ユーザー・商材」タブ',
            '「取扱商材」セクションで現在の商材を確認',
            '新商材を追加する場合は入力欄に名前を入力して「追加」',
            '不要な商材は✕ボタンで削除',
          ]} />
          <Tip>商材を削除すると、その商材に関連するHKRデータは閲覧できなくなります。</Tip>
        </Section>

        <Section num="04" title="シフト管理" color="emerald">
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            メンバーのシフト提出状況の確認・締切の設定・シフトの修正ができます。
          </p>
          <Steps steps={[
            '管理ページ → 「シフト管理」タブ',
            '月を切り替えて確認したい月を選ぶ',
            '「提出済み〇/〇人」で提出状況を確認',
            '締切を設定する場合は「提出締切の設定」で日時を入力して保存',
          ]} />
          <div className="mt-3 bg-white rounded-xl p-4 border border-white/80 shadow-sm">
            <p className="text-xs font-bold text-gray-800 mb-2">シフトの修正方法（管理者のみ）</p>
            <ol className="space-y-1">
              {[
                'シフト一覧のメンバー名の横にある ✏️ アイコンをタップ',
                '修正モーダルが開く',
                '日付ボタンをタップして稼働日を変更',
                '「保存」ボタンで確定',
              ].map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">{i+1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
          <Tip>● 全日 / 前 午前 / 後 午後 の3種類で設定できます。</Tip>
          <Screenshot src="/screenshots/shift.png" caption="シフト管理画面" />
        </Section>

        <Section num="05" title="MTG管理" color="rose">
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            MTG出欠の確認・締切設定・出欠の修正ができます。
          </p>
          <Steps steps={[
            '管理ページ → 「MTG管理」タブ',
            '月を切り替えて確認したい月を選ぶ',
            '出欠一覧で各メンバーの状況を確認',
            '締切を設定する場合は「提出締切の設定」で日時を入力して保存',
          ]} />
          <div className="mt-3 bg-white rounded-xl p-4 border border-white/80 shadow-sm">
            <p className="text-xs font-bold text-gray-800 mb-2">出欠の修正方法（管理者のみ）</p>
            <ol className="space-y-1">
              {[
                '出欠一覧の修正したいセルをタップ',
                '「出席」「欠席」「遅刻」のポップアップが表示される',
                '正しい状態を選択すると即時保存される',
              ].map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-[10px]">{i+1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
          <Screenshot src="/screenshots/mtg.png" caption="MTG出欠管理画面" />
        </Section>

        <Section num="06" title="個人進捗の確認" color="orange">
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            全メンバーの今月の目標・実績・進捗をまとめて確認できます。
          </p>
          <Steps steps={[
            '管理ページ → 「個人進捗」タブ',
            '月を切り替えて確認',
            '各メンバーの実績・目標・アドバンテージ/ビハインドを確認',
          ]} />
          <InfoCards items={[
            { label: 'アド 〇', desc: '目標より〇件先行している状態' },
            { label: 'ビハ 〇', desc: '目標より〇件遅れている状態' },
            { label: 'オンタイム', desc: '目標通りに進んでいる状態' },
          ]} />
          <Screenshot src="/screenshots/progress.png" caption="個人進捗確認画面" />
        </Section>

        <Section num="07" title="全員の行動表・転換率" color="sky">
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            管理者は行動表と転換率タブでメンバーセレクターを使って全員のデータを確認できます。
          </p>
          <Steps steps={[
            'サイドバーの「行動表」をタップ',
            '画面上部のメンバー選択ドロップダウンから確認したいメンバーを選ぶ',
            '「行動表」タブで日別の行動実績を確認',
            '「転換率」タブでピンポン→対面→成約の転換率を確認',
          ]} />
          <Tip>自分のデータを見るときは「自分」を選択してください。</Tip>
          <Screenshot src="/screenshots/activity.png" caption="行動表・転換率画面" />
        </Section>

        <Section num="08" title="全員の開通表" color="amber">
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            管理者は全メンバーの開通フォロー状況をまとめて確認できます。
          </p>
          <Steps steps={[
            'サイドバーの「開通表」をタップ',
            '画面上部のメンバー選択から確認したいメンバーを選ぶ',
            '「一覧」タブで全回線の状況を日付順に確認',
          ]} />
          <Screenshot src="/screenshots/activation.png" caption="開通表画面" />
        </Section>

        <Section num="09" title="通知送信" color="purple">
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            管理者は開通フォローリマインダーを任意のタイミングで手動送信できます。
          </p>
          <Steps steps={[
            '管理ページ → 「ユーザー・商材」タブ',
            '「今すぐ通知を送る」ボタンをタップ',
            '送信完了後、件数が表示される',
          ]} />
          <div className="mt-3 space-y-2">
            <NotifItem title="開通表リマインダー（自動）" desc="毎日20時に未確認フォロー項目がある場合に自動送信" />
            <NotifItem title="シフト締切リマインダー（自動）" desc="シフト提出締切の1時間前に未提出メンバーと管理者に自動送信" />
            <NotifItem title="MTG締切リマインダー（自動）" desc="MTG出欠提出締切の1時間前に未提出メンバーと管理者に自動送信" />
            <NotifItem title="手動送信" desc="管理画面から任意のタイミングで今すぐ送信可能" />
          </div>
          <Tip>通知を受け取るにはiPhoneのホーム画面にアプリを追加し、サイドバー下部の「通知を有効にする」をタップして許可してください。</Tip>
        </Section>

        {/* フッター */}
        <div className="mt-12 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">インフラ管理システム　管理者向け操作マニュアル</p>
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
      <Image src={src} alt={caption} width={800} height={500} className="w-full object-cover object-top" style={{ maxHeight: '320px' }} />
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

function NotifItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-white rounded-xl p-3 border border-white/80 shadow-sm flex items-start gap-3">
      <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">通知</span>
      <div>
        <p className="text-xs font-bold text-gray-800">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
    </div>
  )
}
