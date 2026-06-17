# 開発ガイドライン

## コーディング規約

### 言語・フレームワーク
- TypeScript 必須（`any` は最小限に）
- Next.js 14 App Router
- Server Components はデータ取得のみ、インタラクションは Client Components（`'use client'`）

### ファイル配置ルール
- ページ: `app/(app)/[機能名]/page.tsx`
- API: `app/api/[リソース名]/route.ts`
- 共通コンポーネント: `components/`
- ビジネスロジック: `lib/`

### DB操作
- `lib/db.ts` の `dbQuery` / `dbRun` / `dbQueryOne` を使う
- SQL は直接記述（ORM不使用）
- プレースホルダーは `$1, $2, ...`（pg の positional params）

```typescript
// 例
const rows = await dbQuery<{ id: number; name: string }>(
  'SELECT id, name FROM users WHERE role = $1',
  ['member']
)
```

### API Route の基本パターン
```typescript
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  // ...
  return NextResponse.json(data)
}
```

---

## スタイリング規約

- Tailwind CSS のみ使用（カスタムCSSは最小限）
- スマホファースト: `sm:` プレフィックスでPC対応
- カラーパレット:
  - プライマリ: indigo（サイドバー・ボタン）
  - 成功: green
  - 警告: amber
  - エラー: red
- 角丸: `rounded-lg`（カード: `rounded-2xl`）
- シャドウ: `shadow-sm`（カード）

---

## 命名規則

| 対象 | 規則 | 例 |
|------|------|----|
| コンポーネント | PascalCase | `UserAvatar.tsx` |
| API Route | kebab-case ディレクトリ | `/api/opening-calendar` |
| DB テーブル | snake_case | `activation_records` |
| DB カラム | snake_case | `user_id`, `cancel_count` |
| React state | camelCase | `calEntries`, `editMode` |
| 定数 | UPPER_SNAKE_CASE | `HKR_TARGET`, `NAV_ORDER_KEY` |

---

## 日付・業務月のルール

- 日付は `YYYY-MM-DD` 形式で DB に保存
- 業務月: 25日以降→当月、24日以前→前月
- 業務期間ラベル: `${m}/25〜${m+1}/24`
- フロントでの日付計算は UTC 基準（`setUTCDate` / `toISOString().slice(0, 10)`）

---

## セキュリティ

- セッション: iron-session（HTTP-only cookie、`SESSION_SECRET` で署名）
- パスワード: bcrypt ハッシュ化
- SQL インジェクション: プレースホルダー必須、文字列連結禁止
- CSRF: Next.js の Same-Origin 制限に依存
- 入力バリデーション: API Route 側で実施

---

## Git 規約

- ブランチ: `main` のみ（feature ブランチは使用しない運用）
- コミットメッセージ: 日本語OK、変更内容を簡潔に
- push したら Vercel が自動デプロイ

---

## ローカル開発

```bash
cd hkr-app
npm install
# .env.local に DATABASE_URL と SESSION_SECRET を設定
npm run dev
```

`.env.local` に必要な環境変数:
```
DATABASE_URL=postgres://...
SESSION_SECRET=...（32文字以上）
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...（プッシュ通知用、任意）
VAPID_PRIVATE_KEY=...（プッシュ通知用、任意）
```
