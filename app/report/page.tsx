export default function ReportPage() {
  const tireColor: Record<string, string> = {
    Tire1: 'bg-yellow-100 text-yellow-800',
    Tire2: 'bg-blue-100 text-blue-800',
    Tire3: 'bg-green-100 text-green-800',
    Tire4: 'bg-gray-100 text-gray-700',
    Tire5: 'bg-purple-100 text-purple-800',
  }

  const upColor = (diff: number) => {
    if (diff >= 3) return 'text-emerald-600 font-black'
    if (diff === 2) return 'text-blue-600 font-bold'
    if (diff === 1) return 'text-purple-600 font-semibold'
    if (diff === 0) return 'text-gray-400'
    return 'text-red-500'
  }

  const upLabel = (diff: number) => {
    if (diff >= 3) return `+${diff} ⤴⤴⤴`
    if (diff === 2) return `+${diff} ⤴⤴`
    if (diff === 1) return `+${diff} ⤴`
    if (diff === 0) return '±0 →'
    return `${diff} ⤵`
  }

  const tier3 = [
    { name: '小禄', from: 3, to: 2 }, { name: '木村', from: 3, to: 2 },
    { name: '坪坂', from: 3, to: 1 }, { name: '平岩', from: 3, to: 2 },
    { name: '吉田', from: 3, to: 2 }, { name: '保谷', from: 3, to: 2 },
    { name: '仁和', from: 3, to: 2 }, { name: '新井', from: 3, to: 4 },
  ]
  const tier4 = [
    { name: '岩下', from: 4, to: 1 }, { name: '向井', from: 4, to: 1 },
    { name: '塚田', from: 4, to: 2 }, { name: '細貝', from: 4, to: 2 },
    { name: '佐々木', from: 4, to: 2 }, { name: '佐藤', from: 4, to: 2 },
    { name: '大西', from: 4, to: 4 },
  ]
  const tier5 = [
    { name: '渡辺', from: 5, to: 2 }, { name: '豊島', from: 5, to: 2 },
    { name: '上鍵', from: 5, to: 2 }, { name: '村山', from: 5, to: 2 },
    { name: '佐々木し', from: 5, to: 2 }, { name: '佐野', from: 5, to: 3 },
    { name: '西川', from: 5, to: 3 }, { name: '織田', from: 5, to: 3 },
    { name: '宮川', from: 5, to: 4 }, { name: '仲尾', from: 5, to: 4 },
    { name: '前田', from: 5, to: 4 }, { name: '田頭', from: 5, to: 4 },
  ]

  const roleModels = [
    { name: '岩下', from: 4, to: 1, quote: '「偏差値じゃなくて実績で逆転できた」' },
    { name: '向井', from: 4, to: 1, quote: '「数字で語れるガクチカが武器になった」' },
    { name: '渡辺', from: 5, to: 2, quote: '「3ティア上の会社から内定をもらえた」' },
    { name: '豊島', from: 5, to: 2, quote: '「開通という結果が面接を変えた」' },
    { name: '坪坂', from: 3, to: 1, quote: '「インターンがなければ諦めていた企業」' },
    { name: '上鍵', from: 5, to: 2, quote: '「継続した成果が信頼につながった」' },
  ]

  const Badge = ({ tier }: { tier: number }) => (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${tireColor[`Tire${tier}`]}`}>
      Tire{tier}
    </span>
  )

  const DataTable = ({ rows }: { rows: { name: string; from: number; to: number }[] }) => (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-gray-400 font-semibold border-b border-gray-100">
          <th className="py-2 px-3 text-left">氏名</th>
          <th className="py-2 px-3 text-left">学歴</th>
          <th className="py-2 px-3 text-left">就職先</th>
          <th className="py-2 px-3 text-left">変動幅</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name} className="border-b border-gray-50 hover:bg-gray-50/60">
            <td className="py-2.5 px-3 font-medium">{r.name}</td>
            <td className="py-2.5 px-3"><Badge tier={r.from} /></td>
            <td className="py-2.5 px-3"><Badge tier={r.to} /></td>
            <td className={`py-2.5 px-3 text-sm ${upColor(r.from - r.to)}`}>{upLabel(r.from - r.to)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const dist = [
    { label: '+3アップ', count: 7, pct: 25, color: 'bg-emerald-500' },
    { label: '+2アップ', count: 9, pct: 32, color: 'bg-blue-500' },
    { label: '+1アップ', count: 7, pct: 25, color: 'bg-purple-500' },
    { label: '変動なし', count: 3, pct: 11, color: 'bg-gray-300' },
    { label: '-1ダウン', count: 1, pct:  4, color: 'bg-red-400' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 rounded-2xl p-10 text-center text-white shadow-lg">
          <h1 className="text-2xl font-extrabold tracking-tight">インターン実績 × 就活成果 整合性資料</h1>
          <p className="mt-2 text-indigo-300 text-sm">学歴ティアを超えた就活成果の可視化 ／ 2026年4月</p>
        </div>

        {/* サマリー */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-bold text-indigo-700 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-blue-500 rounded-full inline-block" />
            サマリー：学歴ティア別 就活成果
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {[
              { tire: 2, count: 1, avg: '±0',   bg: 'bg-blue-50 text-blue-800' },
              { tire: 3, count: 8, avg: '+1',    bg: 'bg-green-50 text-green-800' },
              { tire: 4, count: 7, avg: '+2〜3', bg: 'bg-yellow-50 text-yellow-800' },
              { tire: 5, count:12, avg: '+2〜3', bg: 'bg-purple-50 text-purple-800' },
            ].map((s) => (
              <div key={s.tire} className={`${s.bg} rounded-xl p-4 text-center`}>
                <p className="text-xs font-semibold opacity-70 mb-1">Tire{s.tire} 出身</p>
                <p className="text-3xl font-black">{s.count}名</p>
                <p className="text-xs font-bold mt-1">平均 {s.avg}</p>
              </div>
            ))}
          </div>
          <div className="bg-indigo-50 rounded-xl py-4 text-center">
            <span className="text-indigo-900 font-bold text-base">
              全28名中25名がティアアップを実現
            </span>
            <span className="text-indigo-900 font-black text-2xl">89%</span>
          </div>
        </div>

        {/* 分布 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-bold text-indigo-700 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-blue-500 rounded-full inline-block" />
            ティアアップ幅の分布
          </h2>
          <div className="space-y-3">
            {dist.map((d) => (
              <div key={d.label} className="flex items-center gap-3">
                <span className="w-20 text-sm font-semibold text-gray-500 shrink-0">{d.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div
                    className={`${d.color} h-full rounded-full flex items-center px-3`}
                    style={{ width: `${d.pct * 3}%` }}
                  >
                    <span className="text-white text-xs font-bold">{d.count}名</span>
                  </div>
                </div>
                <span className="w-10 text-sm text-gray-400 text-right shrink-0">{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tire4 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-bold text-indigo-700 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-blue-500 rounded-full inline-block" />
            Tire4 出身 → 最大+3ティアアップ（7名）
          </h2>
          <DataTable rows={tier4} />
        </div>

        {/* Tire5 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-bold text-indigo-700 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-blue-500 rounded-full inline-block" />
            Tire5 出身 → 全員ティアアップ達成（12名）
          </h2>
          <DataTable rows={tier5} />
        </div>

        {/* Tire3 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-bold text-indigo-700 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-blue-500 rounded-full inline-block" />
            Tire3 出身（8名）
          </h2>
          <DataTable rows={tier3} />
        </div>

        {/* タイムライン */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-bold text-indigo-700 mb-6 flex items-center gap-2">
            <span className="w-1 h-5 bg-blue-500 rounded-full inline-block" />
            委託費が入るまでのタイムライン
          </h2>
          <div className="relative pl-6 space-y-6">
            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />
            {[
              { dot: 'bg-gray-300', month: '初稼働〜2ヶ月', text: '解除スキルの習得期間。委託費はまだゼロ。', sub: '※アルバイトと比較する時期ではない', amount: null },
              { dot: 'bg-blue-500', month: '3ヶ月後（初委託費）', text: '初開通が発生。インターンの意義を実感するフェーズ。', sub: null, amount: '平均 1.6開通 ≒ ¥24,000' },
              { dot: 'bg-emerald-500', month: '4〜5ヶ月後（サイクル確立）', text: 'まとまった開通が安定して発生。月収サイクルが回り始める。', sub: null, amount: '平均 5開通 ≒ ¥75,000' },
              { dot: 'bg-purple-500', month: '6ヶ月〜（ガクチカ確立）', text: '売上に直結した課題解決の実績として就活に活用できるフェーズ。Tire1〜2企業へのアプローチが現実的になる。', sub: null, amount: null },
            ].map((t, i) => (
              <div key={i} className="relative">
                <div className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${t.dot} shadow`} />
                <p className="text-xs font-bold text-blue-600 mb-1">{t.month}</p>
                <p className="text-sm text-gray-700">{t.text}</p>
                {t.sub && <p className="text-xs text-gray-400 mt-0.5">{t.sub}</p>}
                {t.amount && <p className="text-base font-black text-indigo-700 mt-1">{t.amount}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* アルバイト比較 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-bold text-indigo-700 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-blue-500 rounded-full inline-block" />
            インターン vs アルバイト
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="py-3 px-4 text-left bg-indigo-900 text-white text-xs rounded-tl-lg">比較軸</th>
                <th className="py-3 px-4 text-center bg-indigo-900 text-white text-xs">アルバイト</th>
                <th className="py-3 px-4 text-center bg-indigo-900 text-white text-xs rounded-tr-lg">インターン</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['目的', '即時報酬', '課題解決能力の習得＋成功体験'],
                ['評価対象', '稼働時間・作業量', '開通率・問題解決の質'],
                ['就活への影響', '限定的', '学歴ティアを2〜3段引き上げる実績'],
                ['ガクチカ価値', '低', '高（売上・利益に直結した数値実績）'],
                ['初収入タイミング', '即日〜1ヶ月', '3ヶ月後〜（先行投資の費用対効果）'],
              ].map(([axis, arubaito, intern], i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2.5 px-4 font-semibold text-gray-500 text-xs">{axis}</td>
                  <td className="py-2.5 px-4 text-center text-gray-400 text-xs">{arubaito}</td>
                  <td className="py-2.5 px-4 text-center text-indigo-700 font-bold text-xs">{intern}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 bg-yellow-50 rounded-lg p-4 text-sm text-yellow-900">
            💡 <strong>「即金ならアルバイト、ガクチカ＋収入ならインターン」</strong>
            <br />採用フロー時点でこの認識を合わせることが最重要
          </div>
        </div>

        {/* ロールモデル */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-bold text-indigo-700 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-blue-500 rounded-full inline-block" />
            ロールモデル（訴求力高順）
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {roleModels.map((m) => (
              <div key={m.name} className="flex items-start gap-4 border border-gray-100 rounded-xl p-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shrink-0">
                  {m.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-sm">{m.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Tire{m.from} → <span className="font-bold text-indigo-600">Tire{m.to}</span>
                    <span className={`ml-2 ${upColor(m.from - m.to)}`}>{upLabel(m.from - m.to)}</span>
                  </p>
                  <p className="text-sm text-gray-600 mt-1 italic">{m.quote}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-300 pb-6">作成日：2026年4月21日</p>
      </div>
    </div>
  )
}
