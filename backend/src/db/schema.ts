import { mysqlTable, varchar, int, text, datetime, mysqlEnum, primaryKey, index } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  googleId: varchar('google_id', { length: 255 }).unique(),
  language: mysqlEnum('language', ['ja', 'en']).default('ja').notNull(),
  gender: mysqlEnum('gender', ['male', 'female', 'other']), // 性別（ランキングハンデ用）
  affiliation: varchar('affiliation', { length: 255 }), // 所属（大学名、クラブ名など）
  nickname: varchar('nickname', { length: 100 }), // 通り名・ニックネーム
  // 距離別ベストスコア（JSON形式）: { "90m": { score: 320, date: "2024-01-15" }, "70m": { score: 340, date: "2024-02-01" }, ... }
  bestScores: text('best_scores'), // JSON string
  mastersRating: int('masters_rating').default(0), // マスターズレーティングポイント
  mastersRank: int('masters_rank'), // マスターズランク (1-18, 1=最上位)
  createdAt: datetime('created_at').default(new Date()).notNull(),
  updatedAt: datetime('updated_at').default(new Date()).notNull(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
  googleIdIdx: index('google_id_idx').on(table.googleId),
}));

// Coaches table
export const coaches = mysqlTable('coaches', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  nameEn: varchar('name_en', { length: 255 }).notNull(),
  personality: text('personality').notNull(),
  personalityEn: text('personality_en').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  systemPromptEn: text('system_prompt_en').notNull(),
  // 指導思想・哲学（AIのsystemPromptに含まれる詳細な指導方針）
  teachingPhilosophy: text('teaching_philosophy'),
  teachingPhilosophyEn: text('teaching_philosophy_en'),
  // 基本ルール（禁止事項、守るべきルールなど）
  baseRules: text('base_rules'),
  baseRulesEn: text('base_rules_en'),
  // 詳細設定
  speakingTone: text('speaking_tone'), // 口調・話し方
  speakingToneEn: text('speaking_tone_en'),
  recommendations: text('recommendations'), // おすすめ（道具、練習方法など）
  recommendationsEn: text('recommendations_en'),
  greetings: text('greetings'), // 挨拶・定型句
  greetingsEn: text('greetings_en'),
  // 性格設定（厳しい/優しい、フォーマル/カジュアルなど）
  personalitySettings: text('personality_settings'),
  personalitySettingsEn: text('personality_settings_en'),
  // 応答スタイル（回答の長さ、絵文字使用、箇条書きなど）
  responseStyle: text('response_style'),
  responseStyleEn: text('response_style_en'),
  // 知識範囲（回答可能なトピックの制限）
  knowledgeScope: text('knowledge_scope'),
  knowledgeScopeEn: text('knowledge_scope_en'),
  specialty: varchar('specialty', { length: 255 }).notNull(),
  specialtyEn: varchar('specialty_en', { length: 255 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  color: varchar('color', { length: 7 }).default('#3B82F6'),
  createdAt: datetime('created_at').default(new Date()).notNull(),
  updatedAt: datetime('updated_at').default(new Date()).notNull(),
});

// Score logs table
export const scoreLogs = mysqlTable('score_logs', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: datetime('date').notNull(),
  score: int('score').notNull(),
  maxScore: int('max_score').default(360).notNull(),
  arrowsCount: int('arrows_count').notNull(),
  distance: int('distance').default(18).notNull(),
  memo: text('memo'),
  createdAt: datetime('created_at').default(new Date()).notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  dateIdx: index('date_idx').on(table.date),
  scoreIdx: index('score_idx').on(table.score),
}));

// Chat sessions table - ChatGPT-like conversation threads
export const chatSessions = mysqlTable('chat_sessions', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  coachId: int('coach_id').notNull().references(() => coaches.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull().default('New Chat'),
  createdAt: datetime('created_at').default(new Date()).notNull(),
  updatedAt: datetime('updated_at').default(new Date()).notNull(),
}, (table) => ({
  userIdIdx: index('session_user_id_idx').on(table.userId),
  coachIdIdx: index('session_coach_id_idx').on(table.coachId),
}));

// Chat messages table
export const chatMessages = mysqlTable('chat_messages', {
  id: int('id').primaryKey().autoincrement(),
  sessionId: int('session_id').references(() => chatSessions.id, { onDelete: 'cascade' }),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  coachId: int('coach_id').notNull().references(() => coaches.id, { onDelete: 'cascade' }),
  role: mysqlEnum('role', ['user', 'assistant']).notNull(),
  content: text('content').notNull(),
  createdAt: datetime('created_at').default(new Date()).notNull(),
}, (table) => ({
  sessionIdIdx: index('chat_session_id_idx').on(table.sessionId),
  userIdIdx: index('chat_user_id_idx').on(table.userId),
  coachIdIdx: index('chat_coach_id_idx').on(table.coachId),
}));

// Equipment table
export const equipment = mysqlTable('equipment', {
  id: int('id').primaryKey().autoincrement(),
  category: mysqlEnum('category', ['bow', 'arrow', 'sight', 'stabilizer', 'rest', 'tab', 'other']).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  nameEn: varchar('name_en', { length: 255 }).notNull(),
  brand: varchar('brand', { length: 255 }),
  description: text('description').notNull(),
  descriptionEn: text('description_en').notNull(),
  imageUrl: varchar('image_url', { length: 500 }),
  purchaseLink: varchar('purchase_link', { length: 500 }),
  priceRange: varchar('price_range', { length: 100 }),
  level: mysqlEnum('level', ['beginner', 'intermediate', 'advanced', 'all']).default('all'),
  createdAt: datetime('created_at').default(new Date()).notNull(),
}, (table) => ({
  categoryIdx: index('category_idx').on(table.category),
  levelIdx: index('level_idx').on(table.level),
}));

// Teaching content table - コーチの指導内容を蓄積するテーブル
export const teachingContents = mysqlTable('teaching_contents', {
  id: int('id').primaryKey().autoincrement(),
  coachId: int('coach_id').notNull().references(() => coaches.id, { onDelete: 'cascade' }),
  // カテゴリ: フォーム、メンタル、練習方法、道具、試合、その他
  category: mysqlEnum('category', ['form', 'mental', 'practice', 'equipment', 'competition', 'philosophy', 'other']).notNull(),
  // タイトル（検索・管理用）
  title: varchar('title', { length: 255 }).notNull(),
  titleEn: varchar('title_en', { length: 255 }),
  // 指導内容（AIが参照する本文）
  content: text('content').notNull(),
  contentEn: text('content_en'),
  // タグ（カンマ区切り、例: "スタンス,基礎,初心者"）
  tags: varchar('tags', { length: 500 }),
  // 優先度（高いほど重要、AIが優先的に参照）
  priority: int('priority').default(0),
  // 有効/無効
  isActive: int('is_active').default(1),
  createdAt: datetime('created_at').default(new Date()).notNull(),
  updatedAt: datetime('updated_at').default(new Date()).notNull(),
}, (table) => ({
  coachIdIdx: index('teaching_coach_id_idx').on(table.coachId),
  categoryIdx: index('teaching_category_idx').on(table.category),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  scoreLogs: many(scoreLogs),
  chatMessages: many(chatMessages),
  chatSessions: many(chatSessions),
}));

export const coachesRelations = relations(coaches, ({ many }) => ({
  chatMessages: many(chatMessages),
  chatSessions: many(chatSessions),
  teachingContents: many(teachingContents),
}));

export const teachingContentsRelations = relations(teachingContents, ({ one }) => ({
  coach: one(coaches, {
    fields: [teachingContents.coachId],
    references: [coaches.id],
  }),
}));

export const scoreLogsRelations = relations(scoreLogs, ({ one }) => ({
  user: one(users, {
    fields: [scoreLogs.userId],
    references: [users.id],
  }),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
  coach: one(coaches, {
    fields: [chatSessions.coachId],
    references: [coaches.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
  coach: one(coaches, {
    fields: [chatMessages.coachId],
    references: [coaches.id],
  }),
}));

// Archery Rounds table - ラウンド（1回の練習/試合単位）
export const archeryRounds = mysqlTable('archery_rounds', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: datetime('date').notNull(),
  distance: int('distance').default(18).notNull(), // 18m, 30m, 50m, 70m
  distanceLabel: varchar('distance_label', { length: 20 }), // 70mW, 50m30m, 30mW, 18mW
  arrowsPerEnd: int('arrows_per_end').default(6).notNull(), // 1エンドあたりの矢数
  totalEnds: int('total_ends').default(6).notNull(), // エンド数
  totalArrows: int('total_arrows').default(36).notNull(), // 総矢数 (72射, 60射など)
  roundType: mysqlEnum('round_type', ['personal', 'club', 'competition']).default('personal').notNull(), // 個人点取り, 部内点取り, 試合
  competitionName: varchar('competition_name', { length: 100 }), // 試合名（試合の場合必須）
  // 追加情報
  location: varchar('location', { length: 100 }), // 場所
  startTime: varchar('start_time', { length: 5 }), // 開始時間 (HH:MM)
  condition: mysqlEnum('condition', ['excellent', 'good', 'normal', 'poor', 'bad']), // 調子
  weather: mysqlEnum('weather', ['sunny', 'cloudy', 'rainy', 'snowy', 'windy', 'indoor']), // 天気
  concerns: text('concerns'), // 気にしていること
  totalScore: int('total_score').default(0).notNull(),
  totalX: int('total_x').default(0).notNull(),
  total10: int('total_10').default(0).notNull(),
  status: mysqlEnum('status', ['in_progress', 'completed', 'cancelled']).default('in_progress').notNull(),
  memo: text('memo'),
  createdAt: datetime('created_at').default(new Date()).notNull(),
  updatedAt: datetime('updated_at').default(new Date()).notNull(),
}, (table) => ({
  userIdIdx: index('round_user_id_idx').on(table.userId),
  dateIdx: index('round_date_idx').on(table.date),
  statusIdx: index('round_status_idx').on(table.status),
}));

// Archery Ends table - エンド（6本ごとの区切り）
export const archeryEnds = mysqlTable('archery_ends', {
  id: int('id').primaryKey().autoincrement(),
  roundId: int('round_id').notNull().references(() => archeryRounds.id, { onDelete: 'cascade' }),
  endNumber: int('end_number').notNull(), // 1, 2, 3...
  totalScore: int('total_score').default(0).notNull(),
  createdAt: datetime('created_at').default(new Date()).notNull(),
}, (table) => ({
  roundIdIdx: index('end_round_id_idx').on(table.roundId),
}));

// Archery Arrow Scores table - 個別の矢の点数
export const archeryScores = mysqlTable('archery_scores', {
  id: int('id').primaryKey().autoincrement(),
  endId: int('end_id').notNull().references(() => archeryEnds.id, { onDelete: 'cascade' }),
  arrowNumber: int('arrow_number').notNull(), // 1-6
  score: varchar('score', { length: 2 }).notNull(), // 'X', '10', '9'...'1', 'M'
  scoreValue: int('score_value').notNull(), // 数値変換: X=10, M=0
  // 的上の位置（0-100の相対座標、中心が50,50）
  positionX: int('position_x'), // null可（位置記録なしの場合）
  positionY: int('position_y'),
  createdAt: datetime('created_at').default(new Date()).notNull(),
  updatedAt: datetime('updated_at').default(new Date()).notNull(),
}, (table) => ({
  endIdIdx: index('score_end_id_idx').on(table.endId),
}));

// Relations for archery
export const archeryRoundsRelations = relations(archeryRounds, ({ one, many }) => ({
  user: one(users, {
    fields: [archeryRounds.userId],
    references: [users.id],
  }),
  ends: many(archeryEnds),
}));

export const archeryEndsRelations = relations(archeryEnds, ({ one, many }) => ({
  round: one(archeryRounds, {
    fields: [archeryEnds.roundId],
    references: [archeryRounds.id],
  }),
  scores: many(archeryScores),
}));

export const archeryScoresRelations = relations(archeryScores, ({ one }) => ({
  end: one(archeryEnds, {
    fields: [archeryScores.endId],
    references: [archeryEnds.id],
  }),
}));

// Practice Memos table - 練習メモ（スコアなしのメモ）
export const practiceMemos = mysqlTable('practice_memos', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: datetime('date').notNull(),
  content: text('content').notNull(), // メモ内容
  condition: mysqlEnum('condition', ['excellent', 'good', 'normal', 'poor', 'bad']), // 調子
  weather: mysqlEnum('weather', ['sunny', 'cloudy', 'rainy', 'snowy', 'windy', 'indoor']), // 天気
  location: varchar('location', { length: 100 }), // 場所
  // メディア（動画・画像）- JSON配列として保存
  // 例: [{ url: "...", type: "image", thumbnailUrl: "..." }, { url: "...", type: "video", thumbnailUrl: "..." }]
  media: text('media'), // JSON string
  createdAt: datetime('created_at').default(new Date()).notNull(),
  updatedAt: datetime('updated_at').default(new Date()).notNull(),
}, (table) => ({
  userIdIdx: index('memo_user_id_idx').on(table.userId),
  dateIdx: index('memo_date_idx').on(table.date),
}));

export const practiceMemosRelations = relations(practiceMemos, ({ one }) => ({
  user: one(users, {
    fields: [practiceMemos.userId],
    references: [users.id],
  }),
}));

// Teams (サークル・部活)
export const teams = mysqlTable('teams', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  inviteCode: varchar('invite_code', { length: 8 }).notNull().unique(), // 招待コード
  color: varchar('color', { length: 7 }).default('#3b82f6').notNull(),
  ownerId: int('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  isPublic: int('is_public').default(0).notNull(), // 0: 招待制, 1: 公開
  createdAt: datetime('created_at').default(new Date()).notNull(),
  updatedAt: datetime('updated_at').default(new Date()).notNull(),
}, (table) => ({
  inviteCodeIdx: index('invite_code_idx').on(table.inviteCode),
}));

// Team Members
export const teamMembers = mysqlTable('team_members', {
  id: int('id').primaryKey().autoincrement(),
  teamId: int('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: mysqlEnum('role', ['owner', 'admin', 'member']).default('member').notNull(),
  // ステータス機能
  status: mysqlEnum('status', ['offline', 'practicing', 'resting', 'competing', 'watching']).default('offline'),
  statusMessage: varchar('status_message', { length: 100 }), // カスタムステータスメッセージ
  statusUpdatedAt: datetime('status_updated_at'),
  joinedAt: datetime('joined_at').default(new Date()).notNull(),
}, (table) => ({
  teamUserIdx: index('team_user_idx').on(table.teamId, table.userId),
}));

// Team Posts (練習報告・共有)
export const teamPosts = mysqlTable('team_posts', {
  id: int('id').primaryKey().autoincrement(),
  teamId: int('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content'), // テキスト内容
  // 練習データ共有
  practiceDate: datetime('practice_date'),
  arrowCount: int('arrow_count'), // 射った本数
  totalScore: int('total_score'), // 合計点
  maxScore: int('max_score'), // 満点
  distance: varchar('distance', { length: 20 }), // 距離
  condition: mysqlEnum('condition', ['excellent', 'good', 'normal', 'poor', 'bad']),
  // メディア
  media: text('media'), // JSON string
  createdAt: datetime('created_at').default(new Date()).notNull(),
  updatedAt: datetime('updated_at').default(new Date()).notNull(),
}, (table) => ({
  teamIdIdx: index('post_team_id_idx').on(table.teamId),
  userIdIdx: index('post_user_id_idx').on(table.userId),
  dateIdx: index('post_date_idx').on(table.createdAt),
}));

// Team Post Comments
export const teamPostComments = mysqlTable('team_post_comments', {
  id: int('id').primaryKey().autoincrement(),
  postId: int('post_id').notNull().references(() => teamPosts.id, { onDelete: 'cascade' }),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: datetime('created_at').default(new Date()).notNull(),
}, (table) => ({
  postIdIdx: index('comment_post_id_idx').on(table.postId),
}));

// Team Post Likes
export const teamPostLikes = mysqlTable('team_post_likes', {
  id: int('id').primaryKey().autoincrement(),
  postId: int('post_id').notNull().references(() => teamPosts.id, { onDelete: 'cascade' }),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: datetime('created_at').default(new Date()).notNull(),
}, (table) => ({
  postUserIdx: index('like_post_user_idx').on(table.postId, table.userId),
}));

// Team Relations
export const teamsRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, { fields: [teams.ownerId], references: [users.id] }),
  members: many(teamMembers),
  posts: many(teamPosts),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
}));

export const teamPostsRelations = relations(teamPosts, ({ one, many }) => ({
  team: one(teams, { fields: [teamPosts.teamId], references: [teams.id] }),
  user: one(users, { fields: [teamPosts.userId], references: [users.id] }),
  comments: many(teamPostComments),
  likes: many(teamPostLikes),
}));

export const teamPostCommentsRelations = relations(teamPostComments, ({ one }) => ({
  post: one(teamPosts, { fields: [teamPostComments.postId], references: [teamPosts.id] }),
  user: one(users, { fields: [teamPostComments.userId], references: [users.id] }),
}));

export const teamPostLikesRelations = relations(teamPostLikes, ({ one }) => ({
  post: one(teamPosts, { fields: [teamPostLikes.postId], references: [teamPosts.id] }),
  user: one(users, { fields: [teamPostLikes.userId], references: [users.id] }),
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Coach = typeof coaches.$inferSelect;
export type NewCoach = typeof coaches.$inferInsert;
export type ScoreLog = typeof scoreLogs.$inferSelect;
export type NewScoreLog = typeof scoreLogs.$inferInsert;
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type Equipment = typeof equipment.$inferSelect;
export type NewEquipment = typeof equipment.$inferInsert;
export type TeachingContent = typeof teachingContents.$inferSelect;
export type NewTeachingContent = typeof teachingContents.$inferInsert;
export type ArcheryRound = typeof archeryRounds.$inferSelect;
export type NewArcheryRound = typeof archeryRounds.$inferInsert;
export type ArcheryEnd = typeof archeryEnds.$inferSelect;
export type NewArcheryEnd = typeof archeryEnds.$inferInsert;
export type ArcheryScore = typeof archeryScores.$inferSelect;
export type NewArcheryScore = typeof archeryScores.$inferInsert;
export type PracticeMemo = typeof practiceMemos.$inferSelect;
export type NewPracticeMemo = typeof practiceMemos.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type TeamPost = typeof teamPosts.$inferSelect;
export type NewTeamPost = typeof teamPosts.$inferInsert;
export type TeamPostComment = typeof teamPostComments.$inferSelect;
export type NewTeamPostComment = typeof teamPostComments.$inferInsert;
export type TeamPostLike = typeof teamPostLikes.$inferSelect;
export type NewTeamPostLike = typeof teamPostLikes.$inferInsert;
