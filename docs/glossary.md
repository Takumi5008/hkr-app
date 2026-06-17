# ユビキタス言語定義（用語集）

## ビジネス用語

| 日本語 | 英語（コード上） | 定義 |
|--------|-----------------|------|
| 開通 | activation | インターネット回線の開通（使えるようになること） |
| 解除 | cancel | 既存の回線契約を解除すること |
| HKR / 開通率 | HKR | 開通数 ÷ 解除数 × 100（%）。目標80%以上 |
| 業務月 | business month | 25日区切りの月。前月25日〜当月24日を1ヶ月とみなす |
| 獲得 | acquisition | 顧客との契約締結 |
| 直せち | wimax_direct | WiMAXルーターをその場で渡す方式。獲得日＝開通日 |
| 後送り | wimax_post | WiMAXルーターを郵送する方式。受取日＝開通日 |
| So-net | sonet | So-net光（固定回線）。工事日＝開通日 |
| 工事日 | construction_date | So-net の回線工事が行われる日 |
| 工事日前日 | day_before_construction | 工事日の前日（顧客への確認連絡日） |
| 受取日 | delivery_date | WiMAX後送りでルーターが届く日 |
| 配送前日 | day_before_delivery | 受取日の前日（配送確認日） |
| 獲得1週間後 | week_after | 獲得日の7日後（フォロー連絡日） |
| 受取1週間後 | week_after_delivery | 受取日の7日後（フォロー連絡日） |
| FM | fm | ファーストメール（初回連絡） |
| ネガキャン | neg_apply / neg_cancel | ネガティブキャンセル（申込時/解除時） |
| 解除アポ | cancel_appt | 解除の予約 |

## UI / 画面用語

| 表示名 | コード | 説明 |
|--------|--------|------|
| HKR入力 | /input | 月次HKRデータ入力画面 |
| 開通表 | /activation | So-net・WiMAX案件管理画面 |
| 開通カレンダー | opening calendar | 業務月単位の個人開通予定一覧 |
| 行動表 | /activity | 日次行動数値の入力画面 |
| 個人進捗 | /progress | 個人の月次実績・グラフ |
| チャレンジ | /challenge | ゲーミフィケーション目標 |
| 開通双六 | /sugoroku | 開通数に連動したゲーム |
| 実績 | /performance | マネージャー向けの全体実績 |
| チーム全体 | /team | チームKPIダッシュボード |

## データ・コード上の用語

| コード | 型 | 意味 |
|--------|----|------|
| `type` | `'sonet' \| 'wimax_direct' \| 'wimax_post'` | 開通タイプ |
| `activation` | `'○' \| '×' \| ''` | 開通確認ステータス |
| `cancel` | `'○' \| '×' \| ''` | 解除確認ステータス |
| `line_type` | `'🍑' \| '🏠'` | 回線種別（So-net: 🍑 / WiMAX: 🏠） |
| `construction_type` | `'🐜' \| '🍐' \| ''` | 工事の有無（🐜: あり / 🍐: なし） |
| `status` | `'○' \| '×' \| ''` | 開通カレンダーの開通確認状態 |
| `activation_record_id` | `int \| null` | 手動入力(null) か 自動同期(not null) |
| `year` / `month` | `int` | カレンダー月（業務月ではない） |
| `delivery_date_done` | `0 \| 1 \| 2` | 受取日の⭕/❌/未確認 |

## ロール

| ロール | 説明 |
|--------|------|
| `member` | 一般メンバー。自分のデータのみ操作可 |
| `manager` | マネージャー。全メンバーデータ閲覧・管理可 |
| `admin` | アプリ管理者。全権限 |
| `viewer` | 閲覧専用（manager相当） |
| `shift_viewer` | シフト管理のみ |
