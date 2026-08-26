# 設計書 — 回線別リードタイム（獲得〜開通）平均日数

## DB変更

なし（既存テーブルの集計のみ。マイグレーション不要）

## 集計クエリ

`activation_records`（獲得日・種別）と `opening_calendar`（開通日、`activation_record_id` で結合）を
JOINし、種別ごとに日数差の平均を取る。日付は両方とも `YYYY-MM-DD` 形式のみを対象とし、それ以外
（レガシーな `M/D` 表記など）や開通日が獲得日より前の行は除外する。

```sql
SELECT
  ar.type,
  COUNT(*)::int AS cnt,
  AVG(oc.activation_date::date - ar.date::date)::float AS avg_days
FROM activation_records ar
JOIN opening_calendar oc ON oc.activation_record_id = ar.id
WHERE ar.date  ~ '^\d{4}-\d{2}-\d{2}$'
  AND oc.activation_date ~ '^\d{4}-\d{2}-\d{2}$'
  AND oc.activation_date::date >= ar.date::date
GROUP BY ar.type
```

全体合算（種別を問わない平均）も同じ条件で `GROUP BY` なしで1行取得する。

- 既存の `dbQuery` ヘルパー（`lib/db.ts`）をそのまま使用。
- Postgres の `date - date` は日数（integer）を返すため、`avg_days` はそのままキャストして返す。

## APIレスポンス拡張（`/api/report`）

既存の `GET /api/report` に以下のフィールドを追加する（既存フィールドは変更しない）。

```ts
type LeadTimeStat = { type: string; label: string; avgDays: number; count: number }

type ReportData = {
  // ...既存フィールド...
  leadTimeByType: LeadTimeStat[]   // 種別ごと（データがある種別のみ、件数降順など任意）
  leadTimeOverall: { avgDays: number; count: number } | null  // 対象0件ならnull
}
```

- `label` は `type` → 表示名のマッピングをサーバー側で付与する
  （`sonet: 'So-net'`, `nifty: '@nifty光'`, `wimax_post: 'WiMAX後送り'`, `wimax_direct: 'WiMAX直せち'`）。
  既存の `/activation` ページの `TYPE_LABELS` と同じ文言に揃える。
- 対象データが0件の種別は配列に含めない（フロント側で「データなし」を出す種別は、全種別リストと
  差分を取って表示する）。
- `avgDays` は小数第1位に丸めてから返す（例: `12.3`）。

## UI変更（`/team-report`）

`app/(app)/team-report/page.tsx` に新セクション「回線別リードタイム」を追加。
配置場所: 既存の「チームサマリー」カードの直後、「要サポート」セクションの前。

```
┌─────────────────────────────────────┐
│ 回線別リードタイム（獲得→開通）        │
│ 全体平均: 12.3日（42件）              │
│ ─────────────────────────────────── │
│ So-net        11.2日  (18件)          │
│ @nifty光      13.0日  (12件)          │
│ WiMAX後送り   15.5日  (8件)           │
│ WiMAX直せち    0.4日  (4件)           │
└─────────────────────────────────────┘
```

- 既存カードと同じ `bg-white rounded-2xl border border-gray-100 shadow-sm` のスタイルに合わせる。
- `leadTimeOverall` が `null`（対象データなし）の場合はセクションごと「データがまだありません」の
  プレースホルダーを表示する。
- 種別ごとの行は `leadTimeByType` を配列のまま `.map()` で表示（0件の種別は表示しない＝MVP。
  将来的に全種別を常に表示したくなったら拡張）。

## 影響範囲

- 変更ファイル: `app/api/report/route.ts`（フィールド追加）、`app/(app)/team-report/page.tsx`（表示追加）
- 影響なし: 既存の `/activation`, `/dashboard`, `activation_records` / `opening_calendar` の書き込み系ロジック
- `docs/functional-design.md` の「API設計」セクションに `/api/report` のレスポンス追記が必要
  （実装完了後に更新する）
