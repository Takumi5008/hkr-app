# 設計書 — 学校管理機能

## DBテーブル（新規2つ、既存に変更なし）

### school_events
| カラム | 型 | 説明 |
|---|---|---|
| id | SERIAL PK | |
| user_id | INTEGER FK → users | |
| type | TEXT CHECK ('test','assignment') | テスト / 課題 |
| subject | TEXT | 科目名 |
| event_date | TEXT | YYYY-MM-DD |
| done | INTEGER DEFAULT 0 | 完了フラグ |
| memo | TEXT DEFAULT '' | メモ |
| created_at | TEXT | |

### school_timetable
| カラム | 型 | 説明 |
|---|---|---|
| id | SERIAL PK | |
| user_id | INTEGER FK → users | |
| day_of_week | INTEGER 1〜6 | 1=月…6=土 |
| period | INTEGER 1〜6 | 時限 |
| subject | TEXT DEFAULT '' | 科目名 |
| UNIQUE(user_id, day_of_week, period) | | |

## APIルート（新規）

| パス | メソッド | 説明 |
|---|---|---|
| /api/school/events | GET | 自分のイベント一覧 |
| /api/school/events | POST | 新規登録 |
| /api/school/events/[id] | PATCH | 完了チェック・更新 |
| /api/school/events/[id] | DELETE | 削除 |
| /api/school/timetable | GET | 自分の時間割 |
| /api/school/timetable | PUT | セル更新（upsert） |
| /api/school/admin | GET | 全員のイベント（管理者のみ） |

## ページ構成

### /school（メンバー向け）
- タブ: 「テスト・課題」「時間割」
- テスト・課題タブ: 登録フォーム + 一覧（未完了/完了）
- 時間割タブ: 月〜土×1〜6限のグリッド、セルタップで編集

### /school/admin（管理者向け）
- 全メンバーの未完了イベント一覧（日付昇順）
- 7日以内はアンバーハイライト
- メンバーでフィルタ可能

## DB migration
- DB_VERSION: 26 → 27
- v27: CREATE TABLE school_events + school_timetable
