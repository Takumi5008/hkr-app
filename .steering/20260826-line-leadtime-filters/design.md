# 設計書 — 回線別リードタイムの月・メンバー絞り込み

## DB変更

なし

## 新規API: `GET /api/report/lead-time`

`app/api/report/route.ts` から集計ロジックを移設し、クエリパラメータで絞り込めるようにする。

### クエリパラメータ（すべて任意）
- `year`, `month`: 両方指定された場合のみ `activation_records.year/month` で絞り込む
  （片方だけの指定は無視して「全期間」扱い）
- `userId`: 指定された場合 `activation_records.user_id` で絞り込む

### 認可
- `/api/report` と同じ: `manager` / `admin` / `viewer` のみ

### SQL（前回の `/api/report` 実装を移設し、WHERE句を動的に組み立て）

```sql
SELECT
  ar.type,
  COUNT(*)::int AS cnt,
  AVG(oc.activation_date::date - ar.date::date)::float AS avg_days
FROM activation_records ar
JOIN opening_calendar oc ON oc.activation_record_id = ar.id
WHERE ar.date ~ '^\d{4}-\d{2}-\d{2}$'
  AND oc.activation_date ~ '^\d{4}-\d{2}-\d{2}$'
  AND oc.activation_date::date >= ar.date::date
  -- 以下、指定時のみ追加
  AND ar.year = $n AND ar.month = $n
  AND ar.user_id = $n
GROUP BY ar.type
```

- レスポンス形状は前回と同じ:
  ```ts
  { leadTimeByType: { type; label; avgDays; count }[]; leadTimeOverall: { avgDays; count } | null }
  ```

## `/api/report` の変更

- 前回追加した `leadTimeByType` / `leadTimeOverall` の集計コードを削除し、`/api/report/lead-time` に一本化。
- レスポンスから `leadTimeByType` / `leadTimeOverall` フィールドを削除（フロント側もこれに合わせて変更）。

## UI変更（`/team-report`）

「回線別リードタイム」カードの上部にフィルタ行を追加。

```
┌─────────────────────────────────────────┐
│ 回線別リードタイム（獲得→開通）            │
│ [月: 全期間 ▾]  [メンバー: 全員 ▾]        │
│ ─────────────────────────────────────── │
│ 全体平均: 12.3日（42件）                  │
│ So-net        11.2日  (18件)              │
│ …                                        │
└─────────────────────────────────────────┘
```

- 月セレクト: `['全期間', ...getPastMonths(12).map(...)]`。値は `all` または `YYYY-MM`。
- メンバーセレクト: `['全員', ...members]`（`members` は既存 `/api/report` レスポンスから取得済みのものを再利用）。
- 状態: `ltMonth: 'all' | 'YYYY-MM'`, `ltUserId: number | null`
- フィルタ変更時に `useEffect` で `/api/report/lead-time?year=&month=&userId=` を再取得し、
  ローカルの `leadTimeByType` / `leadTimeOverall` state を更新する（`/api/report` 本体は再取得しない）。
- ローディング中はカード内に簡易ローディング表示。
- 0件時は既存同様「データがまだありません」。

## 影響範囲

- 新規: `app/api/report/lead-time/route.ts`
- 変更: `app/api/report/route.ts`（leadTime関連コード削除）、`app/(app)/team-report/page.tsx`（フィルタUI・fetch先変更）
- `docs/functional-design.md` のAPI一覧に `/api/report/lead-time` を追記し、`/api/report` の説明から
  「回線別リードタイム含む」を削除する。
