# D2 Archery - AI Coaching App

アーチェリーの技術的な悩みに4人のAIコーチが応えるモバイルアプリです。

## 機能

### 1. AIコーチチャット
- 4人の個性豊かなコーチキャラクター
- ChatGPT風のチャットUI
- ユーザーの悩みに対するアドバイス

### 2. 点数帳（スコアログ）
- 練習日ごとの点数記録
- グラフで点数推移を可視化
- 過去の記録一覧

### 3. コーチからのアドバイス
- スコアデータの分析
- パターンに基づくアドバイス

### 4. おすすめ道具紹介
- カテゴリ別の道具情報
- レベル別フィルタリング

### 5. ランキング
- スコアランキング
- 練習本数ランキング（週間/月間）

## 技術スタック

### フロントエンド
- React + TypeScript
- TailwindCSS
- Vite
- React Router
- React Query
- Recharts (グラフ)
- i18next (多言語)
- PWA対応

### バックエンド
- Node.js + Express
- TypeScript
- Drizzle ORM
- MySQL/TiDB

### 認証
- Google OAuth

### AI
- OpenAI API (GPT-4)

## セットアップ

### 必要条件
- Node.js 18以上
- MySQL または TiDB
- Google Cloud Consoleでのプロジェクト設定
- OpenAI APIキー

### 環境変数

#### Backend (.env)
```
DATABASE_URL=mysql://user:password@localhost:3306/d2archery
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
OPENAI_API_KEY=your_openai_api_key
SESSION_SECRET=your_session_secret
PORT=3001
FRONTEND_URL=http://localhost:5173
```

#### Frontend (.env)
```
VITE_API_URL=http://localhost:3001
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### インストール

```bash
# ルートディレクトリで
npm install

# フロントエンド
cd frontend
npm install

# バックエンド
cd ../backend
npm install
```

### データベースセットアップ

```bash
cd backend
npm run db:push  # スキーマをプッシュ
```

### 開発サーバー起動

```bash
# ルートから両方起動
npm run dev

# または個別に
npm run dev:frontend  # フロントエンド (port 5173)
npm run dev:backend   # バックエンド (port 3001)
```

## プロジェクト構造

```
D2Archery/
├── frontend/                 # React フロントエンド
│   ├── src/
│   │   ├── components/      # 共通コンポーネント
│   │   ├── pages/           # ページコンポーネント
│   │   ├── contexts/        # React Context
│   │   ├── hooks/           # カスタムフック
│   │   ├── lib/             # ユーティリティ
│   │   ├── locales/         # 多言語ファイル
│   │   └── types/           # TypeScript型定義
│   └── public/              # 静的ファイル
│
├── backend/                  # Express バックエンド
│   ├── src/
│   │   ├── db/              # データベース設定・スキーマ
│   │   ├── routes/          # APIルート
│   │   ├── middleware/      # ミドルウェア
│   │   ├── services/        # ビジネスロジック
│   │   └── types/           # TypeScript型定義
│   └── drizzle/             # マイグレーション
│
└── README.md
```

## APIエンドポイント

### 認証
- `POST /api/auth/google` - Google OAuth認証
- `GET /api/auth/me` - 現在のユーザー取得
- `PATCH /api/auth/me` - ユーザー設定更新

### スコア
- `GET /api/scores` - スコア一覧取得
- `GET /api/scores/stats` - 統計情報取得
- `GET /api/scores/graph` - グラフデータ取得
- `POST /api/scores` - スコア作成
- `PUT /api/scores/:id` - スコア更新
- `DELETE /api/scores/:id` - スコア削除

### コーチ
- `GET /api/coaches` - コーチ一覧取得
- `GET /api/coaches/:id` - コーチ詳細取得

### チャット
- `GET /api/chat/history/:coachId` - チャット履歴取得
- `POST /api/chat/send` - メッセージ送信
- `POST /api/chat/advice` - スコア分析アドバイス取得
- `DELETE /api/chat/history/:coachId` - 履歴クリア

### 道具
- `GET /api/equipment` - 道具一覧取得
- `GET /api/equipment/meta/categories` - カテゴリ一覧取得

### ランキング
- `GET /api/rankings/scores` - スコアランキング
- `GET /api/rankings/practice` - 練習本数ランキング

## ライセンス

Private
