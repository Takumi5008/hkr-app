# 機能設計書 (Functional Design)

## システム構成

```
ブラウザ (Next.js 14 App Router / React)
    ↓ HTTPS
Vercel (サーバーレス Next.js)
    ↓ SSL
Neon PostgreSQL (クラウドDB)
```

---

## データモデル（ER図）

```mermaid
erDiagram
    users {
        int id PK
        text name
        text email
        text password
        text role
        text avatar
        int login_streak
        text created_at
    }
    records {
        int id PK
        int user_id FK
        int year
        int month
        text product
        int cancel_count
        int activation_count
        int remaining_opening
        int expected_opening
        int confirmed_opening
        text updated_at
    }
    activation_records {
        int id PK
        int user_id FK
        int year
        int month
        text type
        text name
        text date
        text construction_date
        text day_before_construction
        text delivery_date
        text day_before_delivery
        text week_after
        text week_after_delivery
        text activation
        text cancel
        text line
        text construction_type
        text cancel_reason
    }
    opening_calendar {
        int id PK
        int user_id FK
        int activation_record_id FK
        int year
        int month
        text activation_date
        text customer_name
        text line_type
        text status
        text created_at
    }
    products {
        int id PK
        text name
        text activation_type
        int sort_order
    }
    daily_activity {
        int id PK
        int user_id FK
        text date
        text work_hours
        int pin_count
        int pingpong_count
        int intercom_count
        int wimax
        int sonet
        int cancel
    }
    points_log {
        int id PK
        int user_id FK
        int points
        text reason
        text ref_type
        text ref_id
        text created_at
    }

    users ||--o{ records : "持つ"
    users ||--o{ activation_records : "入力する"
    users ||--o{ opening_calendar : "持つ"
    users ||--o{ daily_activity : "記録する"
    users ||--o{ points_log : "獲得する"
    activation_records ||--o| opening_calendar : "同期される"
```

---

## 画面遷移図

```mermaid
graph TD
    Login[/login ログイン/] --> App

    subgraph App [認証後]
        Dashboard[/dashboard ダッシュボード/]
        Input[/input HKR入力/]
        Activation[/activation 開通表/]
        Activity[/activity 行動表/]
        Progress[/progress 個人進捗/]
        Challenge[/challenge チャレンジ/]
        Sugoroku[/sugoroku 開通双六/]
        Team[/team チーム全体 ※管理者/]
        Performance[/performance 実績 ※管理者/]
        Admin[/admin 管理 ※管理者/]
        Settings[/settings 設定/]
    end

    Dashboard --> Input
    Dashboard --> Activation
    Input --> Activation
    Activation --> Input
```

---

## API設計

### 認証
| Method | Path | 説明 |
|--------|------|------|
| POST | /api/auth/login | ログイン |
| POST | /api/auth/logout | ログアウト |
| GET | /api/auth/me | 自分の情報取得 |

### HKRデータ
| Method | Path | 説明 |
|--------|------|------|
| GET | /api/records | 月次HKRデータ取得 |
| POST | /api/records | データ保存 |
| GET | /api/records/suggest | 開通表からの集計取得 |
| POST | /api/records/sync-all | 全員の開通表データ一括反映（管理者）|

### 開通表
| Method | Path | 説明 |
|--------|------|------|
| GET | /api/activation | レコード一覧取得 |
| POST | /api/activation | レコード追加 |
| PATCH | /api/activation | レコード更新（開通カレンダー同期） |
| DELETE | /api/activation | レコード削除 |
| POST | /api/activation/resync | 全レコードを開通カレンダーに再同期 |

### 開通カレンダー
| Method | Path | 説明 |
|--------|------|------|
| GET | /api/opening-calendar | 業務月のカレンダー取得 |
| POST | /api/opening-calendar | 手動エントリ追加 |
| PATCH | /api/opening-calendar | エントリ更新 |
| DELETE | /api/opening-calendar | エントリ削除 |

### 行動表
| Method | Path | 説明 |
|--------|------|------|
| GET | /api/daily-activity | 日次データ取得 |
| POST | /api/daily-activity | 日次データ保存 |

### その他
| Method | Path | 説明 |
|--------|------|------|
| GET | /api/products | 商材一覧 |
| GET/POST | /api/team | チームデータ |
| GET | /api/progress | 個人進捗 |

---

## 開通カレンダー同期フロー

```mermaid
flowchart TD
    A[activation_records に追加/更新] --> B{typeは?}
    B -->|sonet| C{cancel = ○?}
    B -->|wimax_direct| D{date が入力済み?}
    B -->|wimax_post| E{delivery_date_done ≥ 1?}

    C -->|Yes| F[activationDate = construction_date]
    C -->|No| G[カレンダーエントリ削除]
    D -->|Yes| H[activationDate = date]
    D -->|No| G
    E -->|Yes| I[activationDate = delivery_date]
    E -->|No| G

    F --> J[業務月を計算\n25日以上→当月 / 24日以下→前月]
    H --> J
    I --> J

    J --> K[opening_calendar に UPSERT]
```

---

## 業務月計算ロジック

```typescript
// 日付の日が25以上 → その月が業務月
// 日付の日が24以下 → 前月が業務月
function getBusinessMonth(date: Date): { year: number; month: number } {
  if (date.getDate() >= 25) return { year: date.getFullYear(), month: date.getMonth() + 1 }
  if (date.getMonth() === 0) return { year: date.getFullYear() - 1, month: 12 }
  return { year: date.getFullYear(), month: date.getMonth() }
}
```

---

## コンポーネント設計

| コンポーネント | 役割 |
|----------------|------|
| Sidebar | サイドナビ（PC固定・スマホドロワー）、並び替え機能つき |
| UserAvatar | アバター表示 |
| ActivationBadge | 開通数バッジ |
| HKRCard | HKR数値カード |
| RecentActivationFeed | 最近の開通フィード |
| TodayFollowAlerts | 今日のフォロー対象アラート |
| CelebrationOverlay | 達成時のお祝いアニメーション |
| WeeklyRankingCard | 週次ランキング |
| TableScrollContainer | テーブルの横スクロール対応ラッパー |
