// 距離別ベストスコアの型
export interface BestScoreEntry {
  score: number;
  date?: string; // YYYY-MM-DD
}

// 距離別ベストスコアのマップ
export type BestScores = {
  [distance: string]: BestScoreEntry;
};

// 対応する距離の一覧
export const BEST_SCORE_DISTANCES = ['90m', '70m', '60m', '50m', '30m', 'シングル', '70W', 'SH'] as const;
export type BestScoreDistance = typeof BEST_SCORE_DISTANCES[number];

export interface User {
  id: number;
  email: string;
  name: string;
  avatarUrl?: string;
  language: 'ja' | 'en';
  gender?: 'male' | 'female' | 'other';
  affiliation?: string; // 所属（大学名、クラブ名など）
  nickname?: string; // 通り名・ニックネーム
  bestScores?: BestScores; // 距離別ベストスコア
  mastersRating?: number;
  mastersRank?: number; // 1-18 (1=最上位, 18=最下位)
}

export interface Coach {
  id: number;
  name: string;
  nameEn: string;
  personality: string;
  personalityEn: string;
  systemPrompt: string;
  systemPromptEn: string;
  teachingPhilosophy?: string | null;
  teachingPhilosophyEn?: string | null;
  baseRules?: string | null;
  baseRulesEn?: string | null;
  speakingTone?: string | null;
  speakingToneEn?: string | null;
  recommendations?: string | null;
  recommendationsEn?: string | null;
  greetings?: string | null;
  greetingsEn?: string | null;
  personalitySettings?: string | null;
  personalitySettingsEn?: string | null;
  responseStyle?: string | null;
  responseStyleEn?: string | null;
  knowledgeScope?: string | null;
  knowledgeScopeEn?: string | null;
  specialty: string;
  specialtyEn: string;
  avatarUrl?: string;
  color: string;
}

export interface ScoreLog {
  id: number;
  userId: number;
  date: string;
  score: number;
  maxScore: number;
  arrowsCount: number;
  distance: number;
  memo?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  sessionId?: number;
  userId: number;
  coachId: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ChatSession {
  id: number;
  userId: number;
  coachId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Equipment {
  id: number;
  category: 'bow' | 'arrow' | 'sight' | 'stabilizer' | 'rest' | 'tab' | 'other';
  name: string;
  nameEn: string;
  brand?: string;
  description: string;
  descriptionEn: string;
  imageUrl?: string;
  purchaseLink?: string;
  priceRange?: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'all';
}

export interface ScoreStats {
  totalSessions: number;
  totalArrows: number;
  averageScore: number;
  highScore: number;
  recentTrend: 'improving' | 'declining' | 'stable';
}

export interface GraphData {
  date: string;
  score: number;
  maxScore: number;
  percentage: number;
  arrowsCount: number;
}

export interface RankingEntry {
  rank: number;
  userId: number;
  userName: string;
  avatarUrl?: string;
  gender?: 'male' | 'female' | 'other';
  affiliation?: string;
  nickname?: string;
  highScore?: number;
  maxScore?: number;
  totalArrows?: number;
  sessionCount?: number;
}

export interface BestScoreRankingEntry {
  rank: number;
  userId: number;
  userName: string;
  avatarUrl?: string;
  bestScore: number;
  totalX: number;
  total10: number;
  distanceLabel: string;
  date: string;
}

// マスターズランキング (APEX風 1-18ランク)
export interface MastersRankingEntry {
  rank: number; // 順位 (1-30)
  userId: number;
  userName: string;
  avatarUrl?: string;
  gender: 'male' | 'female' | 'other';
  affiliation?: string; // 所属
  nickname?: string; // 通り名
  bestScores?: BestScores; // 自己申告ベストスコア
  mastersRank: number; // 1-18 (1=Masters, 18=Bronze IV)
  mastersRating: number; // ポイント
  adjustedRating: number; // ハンデ適用後のポイント
  recentScores: { score: number; type: 'practice' | 'competition'; date: string }[];
}

// 今日の全国ランキング
export interface DailyRankingEntry {
  rank: number;
  userId: number;
  userName: string;
  avatarUrl?: string;
  gender: 'male' | 'female' | 'other';
  affiliation?: string; // 所属
  nickname?: string; // 通り名
  bestScores?: BestScores; // 自己申告ベストスコア
  score: number;
  adjustedScore: number; // ハンデ適用後
  distanceLabel: string;
  roundType: 'personal' | 'club' | 'competition';
  date: string;
}

// アーチャーレーティング (Rt 0~18.99, SA/AA/A/BB/B/C)
export interface ArcherRating {
  rating: number; // 合計レーティング (0~18.99)
  rank: string; // SA, AA, A, BB, B, C
  rankColor: string; // ランクの色
  competitionRating: number; // 試合レーティング (0~10)
  practiceRating: number; // 練習レーティング (0~9.5)
  competitionCount: number; // 試合回数 (最大5)
  practiceCount: number; // 練習回数 (最大5)
  competitionScores: number[]; // 直近の試合スコア
  practiceScores: number[]; // 直近の練習スコア
}

// アーチャーレーティングランク定義
export const ARCHER_RATING_RANKS = [
  { rank: 'SA', minRating: 16, maxRating: 18.99, color: '#FFD700' },
  { rank: 'AA', minRating: 13, maxRating: 16, color: '#C0C0C0' },
  { rank: 'A', minRating: 10, maxRating: 13, color: '#CD7F32' },
  { rank: 'BB', minRating: 7, maxRating: 10, color: '#4169E1' },
  { rank: 'B', minRating: 5, maxRating: 7, color: '#32CD32' },
  { rank: 'C', minRating: 0, maxRating: 5, color: '#808080' },
] as const;

export interface EquipmentCategory {
  id: string;
  name: string;
  nameEn: string;
}

export interface TeachingContent {
  id: number;
  coachId: number;
  category: 'form' | 'mental' | 'practice' | 'equipment' | 'competition' | 'philosophy' | 'other';
  title: string;
  titleEn?: string;
  content: string;
  contentEn?: string;
  tags?: string;
  priority: number;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeachingCategory {
  id: string;
  name: string;
  nameEn: string;
}

// Practice Memo Types
export interface MemoMedia {
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
  fileName?: string;
}

export interface PracticeMemo {
  id: number;
  userId: number;
  date: string;
  content: string;
  condition?: 'excellent' | 'good' | 'normal' | 'poor' | 'bad';
  weather?: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy' | 'indoor';
  location?: string;
  media?: MemoMedia[]; // 動画・画像
  createdAt: string;
  updatedAt: string;
}

// Archery Scoring Types
export interface ArcheryScore {
  id: number;
  endId: number;
  arrowNumber: number;
  score: string; // 'X', '10', '9'...'1', 'M'
  scoreValue: number;
  positionX?: number; // 的上の位置（0-100、中心が50）
  positionY?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ArcheryEnd {
  id: number;
  roundId: number;
  endNumber: number;
  totalScore: number;
  scores: ArcheryScore[];
  createdAt: string;
}

export interface ArcheryRound {
  id: number;
  userId: number;
  date: string;
  distance: number;
  distanceLabel?: string; // 70mW, 50m30m, 30mW, 18mW
  arrowsPerEnd: number;
  totalEnds: number;
  totalArrows: number; // 72射, 60射
  roundType: 'personal' | 'club' | 'competition'; // 個人点取り, 部内点取り, 試合
  competitionName?: string; // 試合名（試合の場合）
  // 追加情報
  location?: string; // 場所
  startTime?: string; // 開始時間 (HH:MM)
  condition?: 'excellent' | 'good' | 'normal' | 'poor' | 'bad'; // 調子
  weather?: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy' | 'indoor'; // 天気
  concerns?: string; // 気にしていること
  totalScore: number;
  totalX: number;
  total10: number;
  status: 'in_progress' | 'completed' | 'cancelled';
  memo?: string;
  ends: ArcheryEnd[];
  createdAt: string;
  updatedAt: string;
}

// Team Types
export interface Team {
  id: number;
  name: string;
  description?: string;
  inviteCode: string;
  color: string;
  iconUrl?: string; // チームアイコン画像URL
  ownerId: number;
  isPublic: number; // 0: 招待制, 1: 公開
  memberCount?: number;
  role?: 'owner' | 'admin' | 'member' | null;
  isMember?: boolean;
  members?: TeamMember[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: number;
  teamId: number;
  userId: number;
  role: 'owner' | 'admin' | 'member';
  status?: 'offline' | 'practicing' | 'resting' | 'competing' | 'watching';
  statusMessage?: string;
  statusUpdatedAt?: string;
  joinedAt: string;
  user?: User;
}

export interface TeamWeeklyRanking {
  userId: number;
  user?: User;
  totalArrows: number;
  totalScore: number;
  sessionCount: number;
}

export interface TeamPost {
  id: number;
  teamId: number;
  userId: number;
  content?: string;
  practiceDate?: string;
  arrowCount?: number;
  totalScore?: number;
  maxScore?: number;
  distance?: string;
  condition?: 'excellent' | 'good' | 'normal' | 'poor' | 'bad';
  media?: string; // JSON string of MemoMedia[]
  user?: User;
  commentsCount: number;
  likesCount: number;
  isLiked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamPostComment {
  id: number;
  postId: number;
  userId: number;
  content: string;
  user?: User;
  createdAt: string;
}

// Admin Types
export interface AdminUser {
  id: number;
  email: string;
  name: string;
  avatarUrl?: string;
  isAdmin: number;
  authProvider: 'google' | 'email';
  language: 'ja' | 'en';
  gender?: 'male' | 'female' | 'other';
  affiliation?: string;
  nickname?: string;
  bestScores?: string;
  mastersRating?: number;
  mastersRank?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminChatSession {
  id: number;
  title: string;
  userId: number;
  userName?: string;
  userEmail?: string;
  coachId: number;
  coachName?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}
