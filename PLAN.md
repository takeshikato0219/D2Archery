# 認証システムと管理機能の実装計画

## 現状分析
- **既存の認証**: Google OAuth認証が実装済み（`/api/auth/google`）
- **ユーザーテーブル**: `googleId`, `email`, `name` などが既存
- **チャット履歴**: `chatSessions`, `chatMessages` テーブルで保存済み
- **JWT認証**: 既に実装されている

## 実装計画

### Phase 1: データベース変更
**users テーブルに追加するフィールド:**
- `password` (varchar 255) - ハッシュ化されたパスワード（メール認証用）
- `isAdmin` (int default 0) - 管理者フラグ
- `authProvider` (enum: 'google', 'email') - 認証方式

### Phase 2: バックエンド認証API
**新規エンドポイント:**
1. `POST /api/auth/register` - メールアドレス+パスワードで新規登録
2. `POST /api/auth/login` - メールアドレス+パスワードでログイン
3. Google認証は既存のまま継続

**必要なパッケージ:**
- `bcrypt` - パスワードハッシュ化（既にjsonwebtokenはある）

### Phase 3: 管理者用API
**新規エンドポイント:**
1. `GET /api/admin/users` - ユーザー一覧取得
2. `GET /api/admin/users/:id` - ユーザー詳細
3. `GET /api/admin/users/:id/chats` - 特定ユーザーのチャット履歴
4. `GET /api/admin/chats` - 全チャット履歴（コーチ別にフィルター可能）
5. `GET /api/admin/chats/:sessionId` - 特定セッションの詳細

**ミドルウェア:**
- `adminMiddleware` - isAdmin=1 のユーザーのみアクセス許可

### Phase 4: フロントエンド
**新規ページ:**
1. `LoginPage.tsx` - ログイン画面（Google + メール）
2. `RegisterPage.tsx` - 新規登録画面
3. `AdminUsersPage.tsx` - ユーザー管理ページ
4. `AdminChatHistoryPage.tsx` - チャット履歴閲覧ページ

**変更:**
- `AuthContext.tsx` - メールログイン対応
- `api.ts` - 新規APIメソッド追加

### Phase 5: 管理者の初期設定
- 最初の管理者は手動でDBを更新するか、環境変数で指定されたメールアドレスを自動的に管理者にする

## ファイル変更一覧

### バックエンド
1. `backend/src/db/schema.ts` - users テーブル拡張
2. `backend/src/routes/auth.ts` - register/login エンドポイント追加
3. `backend/src/routes/admin.ts` - 新規作成（管理者API）
4. `backend/src/middleware/auth.ts` - adminMiddleware 追加
5. `backend/src/index.ts` - admin routes 追加
6. `backend/package.json` - bcrypt 追加

### フロントエンド
1. `frontend/src/pages/LoginPage.tsx` - 新規作成
2. `frontend/src/pages/RegisterPage.tsx` - 新規作成
3. `frontend/src/pages/AdminUsersPage.tsx` - 新規作成
4. `frontend/src/pages/AdminChatHistoryPage.tsx` - 新規作成
5. `frontend/src/contexts/AuthContext.tsx` - メールログイン対応
6. `frontend/src/lib/api.ts` - 新規APIメソッド
7. `frontend/src/App.tsx` - 新規ルート追加
8. `frontend/src/types.ts` - 型定義追加

## セキュリティ考慮
- パスワードは bcrypt でハッシュ化（salt rounds = 10）
- 管理者ページは isAdmin チェック必須
- チャット履歴閲覧は管理者のみ

## 順序
1. DB スキーマ変更
2. バックエンド認証 API
3. バックエンド管理 API
4. フロントエンドログイン画面
5. フロントエンド管理画面
