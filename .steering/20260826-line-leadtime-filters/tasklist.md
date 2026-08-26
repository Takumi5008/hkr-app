# タスクリスト — 回線別リードタイムの月・メンバー絞り込み

## タスク

- [x] API: `app/api/report/lead-time/route.ts` を新規作成（year/month/userIdフィルタ対応）
- [x] API: `app/api/report/route.ts` から旧leadTime集計コードを削除
- [x] Page: `/team-report` に月・メンバーのフィルタUIを追加し、専用エンドポイントを呼ぶように変更
- [x] `docs/functional-design.md` のAPI一覧を更新
- [x] 型チェック
- [x] 動作確認（`next build`）
- [ ] コミット・プッシュ・Vercelデプロイ
