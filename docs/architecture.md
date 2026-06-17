# アーキテクチャ・リポジトリ構造定義書

## 技術スタック

| 項目 | 技術 |
|------|------|
| フレームワーク | Next.js 14 (App Router) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS |
| DB | PostgreSQL (Neon) |
| ORM | pg (node-postgres) 直接クエリ |
| 認証 | iron-session (cookie ベース) |
| デプロイ | Vercel |
| アイコン | lucide-react |

---

## ディレクトリ構造

```
hkr-app/
├── app/
│   ├── (app)/                    # 認証後レイアウト（Sidebar付き）
│   │   ├── layout.tsx            # 共通レイアウト（セッションチェック）
│   │   ├── dashboard/page.tsx    # ダッシュボード
│   │   ├── input/page.tsx        # HKR入力・開通カレンダー
│   │   ├── activation/page.tsx   # 開通表（So-net / WiMAX）
│   │   ├── activity/page.tsx     # 行動表
│   │   ├── progress/page.tsx     # 個人進捗
│   │   ├── challenge/page.tsx    # チャレンジ
│   │   ├── sugoroku/page.tsx     # 開通双六
│   │   ├── team/page.tsx         # チーム全体（管理者）
│   │   ├── performance/page.tsx  # 実績（管理者）
│   │   ├── admin/page.tsx        # 管理（管理者）
│   │   ├── attendance/page.tsx   # 出欠管理
│   │   ├── schedule/page.tsx     # スケジュール
│   │   ├── tasks/page.tsx        # タスク管理
│   │   ├── memo/page.tsx         # メモ
│   │   ├── knowledge/page.tsx    # 知識向上
│   │   ├── review/page.tsx       # 月次振り返り
│   │   ├── org/page.tsx          # 組織図
│   │   ├── settings/page.tsx     # 設定
│   │   └── howto/page.tsx        # 使い方
│   ├── api/                      # API Routes
│   │   ├── auth/                 # 認証
│   │   ├── records/              # HKRデータ
│   │   ├── activation/           # 開通表
│   │   │   └── resync/           # 再同期
│   │   ├── opening-calendar/     # 開通カレンダー
│   │   ├── daily-activity/       # 行動表
│   │   ├── products/             # 商材管理
│   │   ├── team/                 # チームデータ
│   │   ├── progress/             # 個人進捗
│   │   ├── push/                 # プッシュ通知
│   │   └── admin/                # 管理者用
│   │       ├── debug-calendar/   # デバッグ用
│   │       └── fix-calendar-months/
│   ├── login/                    # ログインページ
│   └── register/                 # 登録ページ
├── components/
│   ├── Sidebar.tsx               # サイドバーナビ
│   ├── UserAvatar.tsx            # アバター
│   ├── ActivationBadge.tsx       # 開通バッジ
│   ├── HKRCard.tsx               # HKRカード
│   ├── RecentActivationFeed.tsx  # 開通フィード
│   ├── TodayFollowAlerts.tsx     # フォローアラート
│   ├── CelebrationOverlay.tsx    # お祝いアニメーション
│   └── TableScrollContainer.tsx  # テーブルスクロール
├── lib/
│   ├── db.ts                     # DB接続・スキーマ定義・マイグレーション
│   ├── session.ts                # iron-session 設定
│   ├── hkr.ts                    # HKR計算ロジック
│   ├── points.ts                 # ポイント付与ロジック
│   ├── badges.ts                 # バッジ判定ロジック
│   ├── quests.ts                 # クエスト判定ロジック
│   └── parse.ts                  # 日付・テキストパースユーティリティ
├── docs/                         # 仕様書（このディレクトリ）
├── public/                       # 静的ファイル・PWAアイコン
├── next.config.ts
├── tailwind.config
└── vercel.json
```

---

## データフロー

```
[ユーザー操作]
     ↓
[React useState / useEffect]
     ↓ fetch()
[Next.js API Route (/api/...)]
     ↓ dbQuery / dbRun
[PostgreSQL (Neon)]
     ↓ rows
[JSON レスポンス]
     ↓
[React state 更新 → 再レンダリング]
```

---

## 認証フロー

```
POST /api/auth/login
  → パスワード検証 (bcrypt)
  → iron-session にユーザー情報を保存（HTTP-only cookie）
  → redirect /dashboard

各 API Route / Server Component
  → getSession() でセッション取得
  → session.userId がなければ 401 / redirect /login
```

---

## DBマイグレーション方針

- `lib/db.ts` 内の `DB_VERSION` 定数で管理
- バージョンが変わると `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` を実行
- ダウンマイグレーションは未対応（必要時は手動）

---

## デプロイ

- `main` ブランチへの push → Vercel が自動ビルド＆デプロイ
- 環境変数は Vercel ダッシュボードで管理（`DATABASE_URL`, `SESSION_SECRET`, `VAPID_*` など）
- プレビューデプロイは使用していない（本番のみ）
