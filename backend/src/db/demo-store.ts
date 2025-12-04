// In-memory store for demo mode (when DATABASE_URL is not set)
// With JSON file persistence to survive server restarts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { User, Coach, ScoreLog, ChatMessage, ChatSession, Equipment, TeachingContent, ArcheryRound, ArcheryEnd, ArcheryScore, PracticeMemo, Team, TeamMember, TeamPost, TeamPostComment, TeamPostLike } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../../data/demo-data.json');

// Demo coaches data - Kim Chung Tae coach (mutable for updates)
let demoCoaches: Coach[] = [
  {
    id: 1,
    name: 'キム・チョンテ',
    nameEn: 'Kim Chung Tae',
    personality: '韓国アーチェリー界のレジェンド。オリンピック金メダリストを多数輩出した名コーチ。厳しくも愛情深い指導スタイルで、選手の潜在能力を最大限に引き出す。基礎の徹底と精神力の強化を重視し、「一射入魂」の精神を大切にする。',
    personalityEn: 'A legendary Korean archery coach who has produced numerous Olympic gold medalists. Known for his strict yet compassionate coaching style that maximizes athletes\' potential. Emphasizes thorough fundamentals and mental strength, valuing the spirit of "one arrow, one soul."',
    systemPrompt: `あなたはキム・チョンテ（Kim Chung Tae）コーチです。韓国アーチェリー界のレジェンドであり、オリンピック金メダリストを多数輩出した世界的な名コーチです。

【あなたの特徴】
- 厳しくも愛情深い指導スタイル
- 基礎の徹底を何より重視する
- 精神力・メンタルの強化に定評がある
- 「一射入魂」の精神を大切にする
- 選手の潜在能力を見抜き、最大限に引き出す力を持つ
- 時に厳しい言葉も使うが、それは選手への期待と愛情の表れ

【指導方針】
- まず基礎フォームを徹底的にチェックする
- 技術的な問題の根本原因を探る
- メンタル面のアドバイスも積極的に行う
- 具体的で実践的なアドバイスを心がける
- 選手の成長を信じ、励ましの言葉も忘れない

【話し方】
- 敬語を基本としつつ、時に親しみを込めた表現を使う
- 韓国のアーチェリー哲学や経験談を交えることがある
- 簡潔で力強い言葉を選ぶ`,
    systemPromptEn: `You are Coach Kim Chung Tae, a legendary figure in Korean archery who has produced numerous Olympic gold medalists.

【Your Characteristics】
- Strict yet compassionate coaching style
- Prioritizes thorough fundamentals above all
- Renowned for mental strength training
- Values the spirit of "one arrow, one soul"
- Ability to identify and maximize athletes' potential
- Sometimes uses tough words, but it reflects expectations and care for athletes

【Coaching Philosophy】
- Thoroughly check basic form first
- Find the root cause of technical issues
- Actively provide mental advice
- Give specific and practical advice
- Believe in athletes' growth and don't forget encouraging words

【Speaking Style】
- Polite but sometimes uses familiar expressions
- May share Korean archery philosophy and experiences
- Choose concise and powerful words`,
    // 指導思想・哲学（管理画面から入力）
    teachingPhilosophy: null,
    teachingPhilosophyEn: null,
    // 基本ルール（禁止事項など）
    baseRules: null,
    baseRulesEn: null,
    // 詳細設定
    speakingTone: null,
    speakingToneEn: null,
    recommendations: null,
    recommendationsEn: null,
    greetings: null,
    greetingsEn: null,
    // 性格設定
    personalitySettings: null,
    personalitySettingsEn: null,
    // 応答スタイル
    responseStyle: null,
    responseStyleEn: null,
    // 知識範囲
    knowledgeScope: null,
    knowledgeScopeEn: null,
    specialty: '総合指導・オリンピックレベルコーチング',
    specialtyEn: 'Comprehensive Training & Olympic-level Coaching',
    avatarUrl: null,
    color: '#DC2626',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const demoEquipment: Equipment[] = [
  {
    id: 1,
    category: 'bow',
    name: 'SF アクシオム ライザー',
    nameEn: 'SF Axiom Riser',
    brand: 'SF Archery',
    description: '初心者に最適なエントリーモデル。',
    descriptionEn: 'Perfect entry model for beginners.',
    imageUrl: null,
    purchaseLink: null,
    priceRange: '¥15,000-25,000',
    level: 'beginner',
    createdAt: new Date(),
  },
  {
    id: 2,
    category: 'arrow',
    name: 'イーストン ACE',
    nameEn: 'Easton ACE',
    brand: 'Easton',
    description: '中級者向けの高性能アロー。',
    descriptionEn: 'High-performance arrow for intermediate archers.',
    imageUrl: null,
    purchaseLink: null,
    priceRange: '¥2,500-3,500/本',
    level: 'intermediate',
    createdAt: new Date(),
  },
];

// Type for persisted data
interface PersistedData {
  users: [number, User][];
  scores: [number, ScoreLog][];
  messages: [number, ChatMessage][];
  chatSessions: [number, ChatSession][];
  coaches: Coach[];
  teachingContents: [number, TeachingContent][];
  archeryRounds: [number, ArcheryRound][];
  archeryEnds: [number, ArcheryEnd][];
  archeryScores: [number, ArcheryScore][];
  practiceMemos: [number, PracticeMemo][];
  teams: [number, Team][];
  teamMembers: [number, TeamMember][];
  teamPosts: [number, TeamPost][];
  teamPostComments: [number, TeamPostComment][];
  teamPostLikes: [number, TeamPostLike][];
  counters: {
    userIdCounter: number;
    scoreIdCounter: number;
    messageIdCounter: number;
    sessionIdCounter: number;
    teachingContentIdCounter: number;
    archeryRoundIdCounter: number;
    archeryEndIdCounter: number;
    archeryScoreIdCounter: number;
    memoIdCounter: number;
    teamIdCounter: number;
    teamMemberIdCounter: number;
    teamPostIdCounter: number;
    teamPostCommentIdCounter: number;
    teamPostLikeIdCounter: number;
  };
}

class DemoStore {
  private users: Map<number, User> = new Map();
  private scores: Map<number, ScoreLog> = new Map();
  private messages: Map<number, ChatMessage> = new Map();
  private chatSessions: Map<number, ChatSession> = new Map();
  private teachingContents: Map<number, TeachingContent> = new Map();
  private archeryRounds: Map<number, ArcheryRound> = new Map();
  private archeryEnds: Map<number, ArcheryEnd> = new Map();
  private archeryScores: Map<number, ArcheryScore> = new Map();
  private practiceMemos: Map<number, PracticeMemo> = new Map();
  private teams: Map<number, Team> = new Map();
  private teamMembers: Map<number, TeamMember> = new Map();
  private teamPosts: Map<number, TeamPost> = new Map();
  private teamPostComments: Map<number, TeamPostComment> = new Map();
  private teamPostLikes: Map<number, TeamPostLike> = new Map();
  private userIdCounter = 1;
  private scoreIdCounter = 1;
  private messageIdCounter = 1;
  private sessionIdCounter = 1;
  private teachingContentIdCounter = 1;
  private archeryRoundIdCounter = 1;
  private archeryEndIdCounter = 1;
  private archeryScoreIdCounter = 1;
  private memoIdCounter = 1;
  private teamIdCounter = 1;
  private teamMemberIdCounter = 1;
  private teamPostIdCounter = 1;
  private teamPostCommentIdCounter = 1;
  private teamPostLikeIdCounter = 1;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.loadFromFile();
    this.initDefaultUsers();
  }

  // Initialize default demo users if none exist
  private initDefaultUsers(): void {
    if (this.users.size === 0) {
      const now = new Date();
      const demoUsers: Omit<User, 'id'>[] = [
        { email: 'test1@example.com', name: 'テストユーザー1', avatarUrl: null, googleId: null, password: null, isAdmin: 0, authProvider: 'google', language: 'ja', gender: 'male', affiliation: '東京大学', nickname: 'アーチャー1号', bestScores: null, mastersRating: 1200, mastersRank: 10, createdAt: now, updatedAt: now },
        { email: 'test2@example.com', name: 'テストユーザー2', avatarUrl: null, googleId: null, password: null, isAdmin: 0, authProvider: 'google', language: 'ja', gender: 'female', affiliation: '京都大学', nickname: 'アロー姫', bestScores: null, mastersRating: 1350, mastersRank: 8, createdAt: now, updatedAt: now },
        { email: 'test3@example.com', name: 'テストユーザー3', avatarUrl: null, googleId: null, password: null, isAdmin: 0, authProvider: 'google', language: 'ja', gender: 'male', affiliation: '大阪大学', nickname: 'ゴールドハンター', bestScores: null, mastersRating: 1500, mastersRank: 5, createdAt: now, updatedAt: now },
        { email: 'test4@example.com', name: 'Test User 4', avatarUrl: null, googleId: null, password: null, isAdmin: 0, authProvider: 'google', language: 'en', gender: 'female', affiliation: 'Stanford University', nickname: 'Bullseye', bestScores: null, mastersRating: 1450, mastersRank: 6, createdAt: now, updatedAt: now },
        { email: 'test5@example.com', name: 'テストユーザー5', avatarUrl: null, googleId: null, password: null, isAdmin: 0, authProvider: 'google', language: 'ja', gender: 'other', affiliation: '早稲田大学', nickname: 'シューター', bestScores: null, mastersRating: 1100, mastersRank: 12, createdAt: now, updatedAt: now },
        { email: 'test6@example.com', name: 'Test User 6', avatarUrl: null, googleId: null, password: null, isAdmin: 0, authProvider: 'google', language: 'en', gender: 'male', affiliation: 'MIT', nickname: 'Arrow King', bestScores: null, mastersRating: 1600, mastersRank: 3, createdAt: now, updatedAt: now },
        { email: 'test7@example.com', name: 'テストユーザー7', avatarUrl: null, googleId: null, password: null, isAdmin: 0, authProvider: 'google', language: 'ja', gender: 'female', affiliation: '慶應大学', nickname: 'ターゲットクイーン', bestScores: null, mastersRating: 1250, mastersRank: 9, createdAt: now, updatedAt: now },
        { email: 'test8@example.com', name: 'テストユーザー8', avatarUrl: null, googleId: null, password: null, isAdmin: 0, authProvider: 'google', language: 'ja', gender: 'male', affiliation: '名古屋大学', nickname: 'ストレートショット', bestScores: null, mastersRating: 1400, mastersRank: 7, createdAt: now, updatedAt: now },
        { email: 'test9@example.com', name: 'Test User 9', avatarUrl: null, googleId: null, password: null, isAdmin: 0, authProvider: 'google', language: 'en', gender: 'female', affiliation: 'Harvard University', nickname: 'Precision', bestScores: null, mastersRating: 1550, mastersRank: 4, createdAt: now, updatedAt: now },
        { email: 'test10@example.com', name: 'テストユーザー10', avatarUrl: null, googleId: null, password: null, isAdmin: 0, authProvider: 'google', language: 'ja', gender: 'male', affiliation: '九州大学', nickname: 'ファイナルアロー', bestScores: null, mastersRating: 1050, mastersRank: 15, createdAt: now, updatedAt: now },
      ];

      for (const userData of demoUsers) {
        this.createUser(userData);
      }
      console.log('🏹 Created 10 demo users');
    }
  }

  // Load data from JSON file
  private loadFromFile(): void {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as PersistedData;

        this.users = new Map(data.users || []);
        this.scores = new Map(data.scores || []);
        this.messages = new Map(data.messages || []);
        this.chatSessions = new Map((data.chatSessions || []).map(([id, session]) => [
          id,
          { ...session, createdAt: new Date(session.createdAt), updatedAt: new Date(session.updatedAt) }
        ]));
        // Load coaches data if exists (with date conversion)
        if (data.coaches && data.coaches.length > 0) {
          demoCoaches = data.coaches.map(coach => ({
            ...coach,
            createdAt: new Date(coach.createdAt),
            updatedAt: new Date(coach.updatedAt),
          }));
          console.log('📁 Loaded coaches from file:', demoCoaches.length);
        }
        this.teachingContents = new Map(data.teachingContents || []);
        this.archeryRounds = new Map((data.archeryRounds || []).map(([id, round]) => [
          id,
          { ...round, date: new Date(round.date), createdAt: new Date(round.createdAt), updatedAt: new Date(round.updatedAt) }
        ]));
        this.archeryEnds = new Map((data.archeryEnds || []).map(([id, end]) => [
          id,
          { ...end, createdAt: new Date(end.createdAt) }
        ]));
        this.archeryScores = new Map((data.archeryScores || []).map(([id, score]) => [
          id,
          { ...score, createdAt: new Date(score.createdAt), updatedAt: new Date(score.updatedAt) }
        ]));

        this.practiceMemos = new Map((data.practiceMemos || []).map(([id, memo]) => [
          id,
          { ...memo, date: new Date(memo.date), createdAt: new Date(memo.createdAt), updatedAt: new Date(memo.updatedAt) }
        ]));

        // Load team data
        this.teams = new Map((data.teams || []).map(([id, team]) => [
          id,
          { ...team, createdAt: new Date(team.createdAt), updatedAt: new Date(team.updatedAt) }
        ]));
        this.teamMembers = new Map((data.teamMembers || []).map(([id, member]) => [
          id,
          { ...member, joinedAt: new Date(member.joinedAt) }
        ]));
        this.teamPosts = new Map((data.teamPosts || []).map(([id, post]) => [
          id,
          { ...post, practiceDate: post.practiceDate ? new Date(post.practiceDate) : null, createdAt: new Date(post.createdAt), updatedAt: new Date(post.updatedAt) }
        ]));
        this.teamPostComments = new Map((data.teamPostComments || []).map(([id, comment]) => [
          id,
          { ...comment, createdAt: new Date(comment.createdAt) }
        ]));
        this.teamPostLikes = new Map((data.teamPostLikes || []).map(([id, like]) => [
          id,
          { ...like, createdAt: new Date(like.createdAt) }
        ]));

        if (data.counters) {
          this.userIdCounter = data.counters.userIdCounter || 1;
          this.scoreIdCounter = data.counters.scoreIdCounter || 1;
          this.messageIdCounter = data.counters.messageIdCounter || 1;
          this.sessionIdCounter = data.counters.sessionIdCounter || 1;
          this.teachingContentIdCounter = data.counters.teachingContentIdCounter || 1;
          this.archeryRoundIdCounter = data.counters.archeryRoundIdCounter || 1;
          this.archeryEndIdCounter = data.counters.archeryEndIdCounter || 1;
          this.archeryScoreIdCounter = data.counters.archeryScoreIdCounter || 1;
          this.memoIdCounter = data.counters.memoIdCounter || 1;
          this.teamIdCounter = data.counters.teamIdCounter || 1;
          this.teamMemberIdCounter = data.counters.teamMemberIdCounter || 1;
          this.teamPostIdCounter = data.counters.teamPostIdCounter || 1;
          this.teamPostCommentIdCounter = data.counters.teamPostCommentIdCounter || 1;
          this.teamPostLikeIdCounter = data.counters.teamPostLikeIdCounter || 1;
        }

        console.log('📁 Loaded demo data from file:', {
          users: this.users.size,
          rounds: this.archeryRounds.size,
          ends: this.archeryEnds.size,
          scores: this.archeryScores.size,
        });
      }
    } catch (error) {
      console.error('Failed to load demo data:', error);
    }
  }

  // Save data to JSON file (debounced)
  private saveToFile(): void {
    // Debounce saves to avoid excessive writes
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveToFileImmediate();
    }, 500);
  }

  // Immediate save
  private saveToFileImmediate(): void {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const data: PersistedData = {
        users: Array.from(this.users.entries()),
        scores: Array.from(this.scores.entries()),
        messages: Array.from(this.messages.entries()),
        chatSessions: Array.from(this.chatSessions.entries()),
        coaches: demoCoaches,
        teachingContents: Array.from(this.teachingContents.entries()),
        archeryRounds: Array.from(this.archeryRounds.entries()),
        archeryEnds: Array.from(this.archeryEnds.entries()),
        archeryScores: Array.from(this.archeryScores.entries()),
        practiceMemos: Array.from(this.practiceMemos.entries()),
        teams: Array.from(this.teams.entries()),
        teamMembers: Array.from(this.teamMembers.entries()),
        teamPosts: Array.from(this.teamPosts.entries()),
        teamPostComments: Array.from(this.teamPostComments.entries()),
        teamPostLikes: Array.from(this.teamPostLikes.entries()),
        counters: {
          userIdCounter: this.userIdCounter,
          scoreIdCounter: this.scoreIdCounter,
          messageIdCounter: this.messageIdCounter,
          sessionIdCounter: this.sessionIdCounter,
          teachingContentIdCounter: this.teachingContentIdCounter,
          archeryRoundIdCounter: this.archeryRoundIdCounter,
          archeryEndIdCounter: this.archeryEndIdCounter,
          archeryScoreIdCounter: this.archeryScoreIdCounter,
          memoIdCounter: this.memoIdCounter,
          teamIdCounter: this.teamIdCounter,
          teamMemberIdCounter: this.teamMemberIdCounter,
          teamPostIdCounter: this.teamPostIdCounter,
          teamPostCommentIdCounter: this.teamPostCommentIdCounter,
          teamPostLikeIdCounter: this.teamPostLikeIdCounter,
        },
      };

      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      console.log('💾 Saved demo data to file');
    } catch (error) {
      console.error('Failed to save demo data:', error);
    }
  }

  // Users
  findUserByGoogleId(googleId: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.googleId === googleId);
  }

  findUserById(id: number): User | undefined {
    return this.users.get(id);
  }

  getUsers(): User[] {
    return Array.from(this.users.values());
  }

  createUser(data: Omit<User, 'id'>): User {
    const user: User = { ...data, id: this.userIdCounter++ };
    this.users.set(user.id, user);
    this.saveToFile();
    return user;
  }

  updateUser(id: number, data: Partial<User>): User | undefined {
    const user = this.users.get(id);
    if (user) {
      const updated = { ...user, ...data };
      this.users.set(id, updated);
      this.saveToFile();
      return updated;
    }
    return undefined;
  }

  // Coaches
  getCoaches(): Coach[] {
    return demoCoaches;
  }

  findCoachById(id: number): Coach | undefined {
    return demoCoaches.find(c => c.id === id);
  }

  updateCoach(id: number, data: Partial<Coach>): Coach | undefined {
    const index = demoCoaches.findIndex(c => c.id === id);
    if (index === -1) return undefined;

    // Filter out undefined values
    const filteredData: Partial<Coach> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        (filteredData as any)[key] = value;
      }
    }

    demoCoaches[index] = { ...demoCoaches[index], ...filteredData, updatedAt: new Date() };
    this.saveToFile();
    console.log('💾 Coach updated and saved:', id, Object.keys(filteredData));
    return demoCoaches[index];
  }

  // Scores
  getScoresByUserId(userId: number, limit = 50): ScoreLog[] {
    return Array.from(this.scores.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  createScore(data: Omit<ScoreLog, 'id'>): ScoreLog {
    const score: ScoreLog = { ...data, id: this.scoreIdCounter++ };
    this.scores.set(score.id, score);
    this.saveToFile();
    return score;
  }

  findScoreById(id: number): ScoreLog | undefined {
    return this.scores.get(id);
  }

  updateScore(id: number, data: Partial<ScoreLog>): ScoreLog | undefined {
    const score = this.scores.get(id);
    if (score) {
      const updated = { ...score, ...data };
      this.scores.set(id, updated);
      this.saveToFile();
      return updated;
    }
    return undefined;
  }

  deleteScore(id: number): boolean {
    const result = this.scores.delete(id);
    if (result) this.saveToFile();
    return result;
  }

  // Chat Messages
  getMessagesByUserAndCoach(userId: number, coachId: number, limit = 50): ChatMessage[] {
    return Array.from(this.messages.values())
      .filter(m => m.userId === userId && m.coachId === coachId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-limit);
  }

  createMessage(data: Omit<ChatMessage, 'id'>): ChatMessage {
    const message: ChatMessage = { ...data, id: this.messageIdCounter++ };
    this.messages.set(message.id, message);
    this.saveToFile();
    return message;
  }

  clearMessagesByUserAndCoach(userId: number, coachId: number): void {
    let deleted = false;
    for (const [id, msg] of this.messages) {
      if (msg.userId === userId && msg.coachId === coachId) {
        this.messages.delete(id);
        deleted = true;
      }
    }
    if (deleted) this.saveToFile();
  }

  // Get messages by session
  getMessagesBySession(sessionId: number, limit = 100): ChatMessage[] {
    return Array.from(this.messages.values())
      .filter(m => m.sessionId === sessionId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-limit);
  }

  // Clear messages by session
  clearMessagesBySession(sessionId: number): void {
    let deleted = false;
    for (const [id, msg] of this.messages) {
      if (msg.sessionId === sessionId) {
        this.messages.delete(id);
        deleted = true;
      }
    }
    if (deleted) this.saveToFile();
  }

  // Chat Sessions
  createSession(data: Omit<ChatSession, 'id'>): ChatSession {
    const session: ChatSession = { ...data, id: this.sessionIdCounter++ };
    this.chatSessions.set(session.id, session);
    this.saveToFile();
    return session;
  }

  findSessionById(id: number): ChatSession | undefined {
    return this.chatSessions.get(id);
  }

  getSessionsByUserAndCoach(userId: number, coachId: number, limit = 50): ChatSession[] {
    return Array.from(this.chatSessions.values())
      .filter(s => s.userId === userId && s.coachId === coachId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);
  }

  updateSession(id: number, data: Partial<ChatSession>): ChatSession | undefined {
    const session = this.chatSessions.get(id);
    if (session) {
      const updated = { ...session, ...data, updatedAt: new Date() };
      this.chatSessions.set(id, updated);
      this.saveToFile();
      return updated;
    }
    return undefined;
  }

  deleteSession(id: number): boolean {
    // Also delete all messages in this session
    this.clearMessagesBySession(id);
    const result = this.chatSessions.delete(id);
    if (result) this.saveToFile();
    return result;
  }

  // Equipment
  getEquipment(): Equipment[] {
    return demoEquipment;
  }

  // Practice Memos
  getMemosByUserId(userId: number, limit = 50): PracticeMemo[] {
    return Array.from(this.practiceMemos.values())
      .filter(m => m.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  findMemoById(id: number): PracticeMemo | undefined {
    return this.practiceMemos.get(id);
  }

  createMemo(data: Omit<PracticeMemo, 'id'>): PracticeMemo {
    const memo: PracticeMemo = { ...data, id: this.memoIdCounter++ };
    this.practiceMemos.set(memo.id, memo);
    this.saveToFile();
    return memo;
  }

  updateMemo(id: number, data: Partial<PracticeMemo>): PracticeMemo | undefined {
    const memo = this.practiceMemos.get(id);
    if (memo) {
      const updated = { ...memo, ...data, updatedAt: new Date() };
      this.practiceMemos.set(id, updated);
      this.saveToFile();
      return updated;
    }
    return undefined;
  }

  deleteMemo(id: number): boolean {
    const result = this.practiceMemos.delete(id);
    if (result) this.saveToFile();
    return result;
  }

  // Teaching Contents - 指導内容の管理
  getTeachingContentsByCoachId(coachId: number, category?: string): TeachingContent[] {
    let contents = Array.from(this.teachingContents.values())
      .filter(c => c.coachId === coachId && c.isActive === 1);

    if (category) {
      contents = contents.filter(c => c.category === category);
    }

    // 優先度の高い順にソート
    return contents.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  getAllTeachingContentsByCoachId(coachId: number): TeachingContent[] {
    return Array.from(this.teachingContents.values())
      .filter(c => c.coachId === coachId)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  findTeachingContentById(id: number): TeachingContent | undefined {
    return this.teachingContents.get(id);
  }

  createTeachingContent(data: Omit<TeachingContent, 'id'>): TeachingContent {
    const content: TeachingContent = { ...data, id: this.teachingContentIdCounter++ };
    this.teachingContents.set(content.id, content);
    this.saveToFile();
    return content;
  }

  updateTeachingContent(id: number, data: Partial<TeachingContent>): TeachingContent | undefined {
    const content = this.teachingContents.get(id);
    if (content) {
      const updated = { ...content, ...data, updatedAt: new Date() };
      this.teachingContents.set(id, updated);
      this.saveToFile();
      return updated;
    }
    return undefined;
  }

  deleteTeachingContent(id: number): boolean {
    const result = this.teachingContents.delete(id);
    if (result) this.saveToFile();
    return result;
  }

  // タグで検索
  searchTeachingContentsByTag(coachId: number, tag: string): TeachingContent[] {
    return Array.from(this.teachingContents.values())
      .filter(c => c.coachId === coachId && c.isActive === 1 && c.tags?.includes(tag))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  // Rankings (demo data)
  getScoreRankings() {
    const userScores = new Map<number, { user: User; highScore: number; maxScore: number }>();
    for (const score of this.scores.values()) {
      const user = this.users.get(score.userId);
      if (!user) continue;
      const existing = userScores.get(score.userId);
      if (!existing || score.score > existing.highScore) {
        userScores.set(score.userId, { user, highScore: score.score, maxScore: score.maxScore });
      }
    }
    return Array.from(userScores.values())
      .sort((a, b) => b.highScore - a.highScore)
      .map((entry, index) => ({
        rank: index + 1,
        userId: entry.user.id,
        userName: entry.user.name,
        avatarUrl: entry.user.avatarUrl,
        highScore: entry.highScore,
        maxScore: entry.maxScore,
      }));
  }

  getPracticeRankings(startDate: Date) {
    const userArrows = new Map<number, { user: User; totalArrows: number; sessionCount: number }>();
    for (const score of this.scores.values()) {
      if (new Date(score.date) < startDate) continue;
      const user = this.users.get(score.userId);
      if (!user) continue;
      const existing = userArrows.get(score.userId) || { user, totalArrows: 0, sessionCount: 0 };
      existing.totalArrows += score.arrowsCount;
      existing.sessionCount += 1;
      userArrows.set(score.userId, existing);
    }
    return Array.from(userArrows.values())
      .sort((a, b) => b.totalArrows - a.totalArrows)
      .map((entry, index) => ({
        rank: index + 1,
        userId: entry.user.id,
        userName: entry.user.name,
        avatarUrl: entry.user.avatarUrl,
        totalArrows: entry.totalArrows,
        sessionCount: entry.sessionCount,
      }));
  }

  // Best Score Rankings for Archery Rounds (練習ベスト / 試合ベスト)
  getBestScoreRankings(roundType: 'personal' | 'club' | 'competition' | 'practice' | 'all', distanceLabel?: string) {
    const userBestScores = new Map<number, {
      user: User;
      bestScore: number;
      totalX: number;
      total10: number;
      distanceLabel: string;
      date: Date;
    }>();

    for (const round of this.archeryRounds.values()) {
      if (round.status !== 'completed') continue;

      // Filter by round type
      if (roundType === 'practice') {
        // 練習ベスト = personal または club
        if (round.roundType !== 'personal' && round.roundType !== 'club') continue;
      } else if (roundType !== 'all' && round.roundType !== roundType) {
        continue;
      }

      // Filter by distance if specified
      if (distanceLabel && round.distanceLabel !== distanceLabel) continue;

      const user = this.users.get(round.userId);
      if (!user) continue;

      const existing = userBestScores.get(round.userId);
      if (!existing || round.totalScore > existing.bestScore) {
        userBestScores.set(round.userId, {
          user,
          bestScore: round.totalScore,
          totalX: round.totalX,
          total10: round.total10,
          distanceLabel: round.distanceLabel || `${round.distance}m`,
          date: round.date,
        });
      }
    }

    return Array.from(userBestScores.values())
      .sort((a, b) => {
        // Sort by score first, then by X count
        if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
        return b.totalX - a.totalX;
      })
      .map((entry, index) => ({
        rank: index + 1,
        userId: entry.user.id,
        userName: entry.user.name,
        avatarUrl: entry.user.avatarUrl,
        bestScore: entry.bestScore,
        totalX: entry.totalX,
        total10: entry.total10,
        distanceLabel: entry.distanceLabel,
        date: entry.date,
      }));
  }

  // ===== Archery Rounds =====
  getRoundsByUserId(userId: number, limit = 20): (ArcheryRound & { ends: (ArcheryEnd & { scores: ArcheryScore[] })[] })[] {
    const rounds = Array.from(this.archeryRounds.values())
      .filter(r => r.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);

    return rounds.map(round => ({
      ...round,
      ends: this.getEndsByRoundId(round.id),
    }));
  }

  findRoundById(id: number): (ArcheryRound & { ends: (ArcheryEnd & { scores: ArcheryScore[] })[] }) | undefined {
    const round = this.archeryRounds.get(id);
    if (!round) return undefined;
    return {
      ...round,
      ends: this.getEndsByRoundId(id),
    };
  }

  createRound(data: Omit<ArcheryRound, 'id'>): ArcheryRound {
    const round: ArcheryRound = { ...data, id: this.archeryRoundIdCounter++ };
    this.archeryRounds.set(round.id, round);
    this.saveToFile();
    return round;
  }

  updateRound(id: number, data: Partial<ArcheryRound>): ArcheryRound | undefined {
    const round = this.archeryRounds.get(id);
    if (round) {
      const updated = { ...round, ...data, updatedAt: new Date() };
      this.archeryRounds.set(id, updated);
      this.saveToFile();
      return updated;
    }
    return undefined;
  }

  deleteRound(id: number): boolean {
    // Delete all ends and scores for this round
    const ends = this.getEndsByRoundId(id);
    for (const end of ends) {
      this.deleteEndWithoutSave(end.id);
    }
    const result = this.archeryRounds.delete(id);
    if (result) this.saveToFile();
    return result;
  }

  // Internal method without save (for batch operations)
  private deleteEndWithoutSave(id: number): boolean {
    for (const [scoreId, score] of this.archeryScores) {
      if (score.endId === id) {
        this.archeryScores.delete(scoreId);
      }
    }
    return this.archeryEnds.delete(id);
  }

  // ===== Archery Ends =====
  getEndsByRoundId(roundId: number): (ArcheryEnd & { scores: ArcheryScore[] })[] {
    const ends = Array.from(this.archeryEnds.values())
      .filter(e => e.roundId === roundId)
      .sort((a, b) => a.endNumber - b.endNumber);

    return ends.map(end => ({
      ...end,
      scores: this.getScoresByEndId(end.id),
    }));
  }

  findEndById(id: number): (ArcheryEnd & { scores: ArcheryScore[] }) | undefined {
    const end = this.archeryEnds.get(id);
    if (!end) return undefined;
    return {
      ...end,
      scores: this.getScoresByEndId(id),
    };
  }

  createEnd(data: Omit<ArcheryEnd, 'id'>): ArcheryEnd {
    const end: ArcheryEnd = { ...data, id: this.archeryEndIdCounter++ };
    this.archeryEnds.set(end.id, end);
    this.saveToFile();
    return end;
  }

  updateEnd(id: number, data: Partial<ArcheryEnd>): ArcheryEnd | undefined {
    const end = this.archeryEnds.get(id);
    if (end) {
      const updated = { ...end, ...data };
      this.archeryEnds.set(id, updated);
      this.saveToFile();
      return updated;
    }
    return undefined;
  }

  deleteEnd(id: number): boolean {
    // Delete all scores for this end
    for (const [scoreId, score] of this.archeryScores) {
      if (score.endId === id) {
        this.archeryScores.delete(scoreId);
      }
    }
    const result = this.archeryEnds.delete(id);
    if (result) this.saveToFile();
    return result;
  }

  // ===== Archery Scores =====
  getScoresByEndId(endId: number): ArcheryScore[] {
    return Array.from(this.archeryScores.values())
      .filter(s => s.endId === endId)
      .sort((a, b) => a.arrowNumber - b.arrowNumber);
  }

  findArcheryScoreById(id: number): ArcheryScore | undefined {
    return this.archeryScores.get(id);
  }

  createArcheryScore(data: Omit<ArcheryScore, 'id'>): ArcheryScore {
    const score: ArcheryScore = { ...data, id: this.archeryScoreIdCounter++ };
    this.archeryScores.set(score.id, score);
    this.saveToFile();
    return score;
  }

  updateArcheryScore(id: number, data: Partial<ArcheryScore>): ArcheryScore | undefined {
    const score = this.archeryScores.get(id);
    if (score) {
      const updated = { ...score, ...data, updatedAt: new Date() };
      this.archeryScores.set(id, updated);
      this.saveToFile();
      return updated;
    }
    return undefined;
  }

  deleteArcheryScore(id: number): boolean {
    const result = this.archeryScores.delete(id);
    if (result) this.saveToFile();
    return result;
  }

  // Find score by end and arrow number
  findArcheryScoreByEndAndArrow(endId: number, arrowNumber: number): ArcheryScore | undefined {
    return Array.from(this.archeryScores.values())
      .find(s => s.endId === endId && s.arrowNumber === arrowNumber);
  }

  // ===== Masters Rating System (APEX風 1-18ランク) =====
  // ランク定義: 1=Masters, 2=Diamond I, 3=Diamond II, ..., 18=Bronze IV
  static readonly MASTERS_RANKS = [
    { rank: 1, name: 'Masters', nameJa: 'マスターズ', minPoints: 15000, color: '#FF4500' },
    { rank: 2, name: 'Diamond I', nameJa: 'ダイヤI', minPoints: 13000, color: '#B9F2FF' },
    { rank: 3, name: 'Diamond II', nameJa: 'ダイヤII', minPoints: 11500, color: '#B9F2FF' },
    { rank: 4, name: 'Diamond III', nameJa: 'ダイヤIII', minPoints: 10000, color: '#B9F2FF' },
    { rank: 5, name: 'Diamond IV', nameJa: 'ダイヤIV', minPoints: 8500, color: '#B9F2FF' },
    { rank: 6, name: 'Platinum I', nameJa: 'プラチナI', minPoints: 7500, color: '#E5E4E2' },
    { rank: 7, name: 'Platinum II', nameJa: 'プラチナII', minPoints: 6500, color: '#E5E4E2' },
    { rank: 8, name: 'Platinum III', nameJa: 'プラチナIII', minPoints: 5500, color: '#E5E4E2' },
    { rank: 9, name: 'Platinum IV', nameJa: 'プラチナIV', minPoints: 4500, color: '#E5E4E2' },
    { rank: 10, name: 'Gold I', nameJa: 'ゴールドI', minPoints: 4000, color: '#FFD700' },
    { rank: 11, name: 'Gold II', nameJa: 'ゴールドII', minPoints: 3500, color: '#FFD700' },
    { rank: 12, name: 'Gold III', nameJa: 'ゴールドIII', minPoints: 3000, color: '#FFD700' },
    { rank: 13, name: 'Gold IV', nameJa: 'ゴールドIV', minPoints: 2500, color: '#FFD700' },
    { rank: 14, name: 'Silver', nameJa: 'シルバー', minPoints: 2000, color: '#C0C0C0' },
    { rank: 15, name: 'Bronze I', nameJa: 'ブロンズI', minPoints: 1500, color: '#CD7F32' },
    { rank: 16, name: 'Bronze II', nameJa: 'ブロンズII', minPoints: 1000, color: '#CD7F32' },
    { rank: 17, name: 'Bronze III', nameJa: 'ブロンズIII', minPoints: 500, color: '#CD7F32' },
    { rank: 18, name: 'Bronze IV', nameJa: 'ブロンズIV', minPoints: 0, color: '#CD7F32' },
  ];

  // 性別ハンデキャップ（女性は点数に加算）
  static readonly GENDER_HANDICAP = {
    male: 0,
    female: 30, // 女性は30点加算
    other: 0,
  };

  // アーチャーレーティングランク (Rt 0~18.99)
  static readonly ARCHER_RATING_RANKS = [
    { rank: 'SA', minRating: 16, maxRating: 18.99, color: '#FFD700' }, // Gold
    { rank: 'AA', minRating: 13, maxRating: 16, color: '#C0C0C0' }, // Silver
    { rank: 'A', minRating: 10, maxRating: 13, color: '#CD7F32' }, // Bronze
    { rank: 'BB', minRating: 7, maxRating: 10, color: '#4169E1' }, // Blue
    { rank: 'B', minRating: 5, maxRating: 7, color: '#32CD32' }, // Green
    { rank: 'C', minRating: 0, maxRating: 5, color: '#808080' }, // Gray
  ];

  // 試合点数からレーティングポイントを計算 (70mW 720点満点基準)
  // 685点→9.99, 600点→5.00, 500点→3.5
  static scoreToCompetitionRating(score: number): number {
    // 線形補間で計算
    // 720点 = 10.0, 685点 = 9.99, 600点 = 5.0, 500点 = 3.5, 400点 = 2.0, 300点 = 0.5
    if (score >= 720) return 10.0;
    if (score >= 685) {
      // 685-720: 9.99-10.0
      return 9.99 + ((score - 685) / (720 - 685)) * 0.01;
    }
    if (score >= 600) {
      // 600-685: 5.0-9.99
      return 5.0 + ((score - 600) / (685 - 600)) * 4.99;
    }
    if (score >= 500) {
      // 500-600: 3.5-5.0
      return 3.5 + ((score - 500) / (600 - 500)) * 1.5;
    }
    if (score >= 400) {
      // 400-500: 2.0-3.5
      return 2.0 + ((score - 400) / (500 - 400)) * 1.5;
    }
    if (score >= 300) {
      // 300-400: 0.5-2.0
      return 0.5 + ((score - 300) / (400 - 300)) * 1.5;
    }
    // 300点未満: 0-0.5
    return Math.max(0, (score / 300) * 0.5);
  }

  // 練習点数からレーティングポイントを計算
  // 690点→9.0, 610点→5.0, 510点→3.5 (試合より少し厳しめ)
  static scoreToPracticeRating(score: number): number {
    if (score >= 720) return 9.5; // 練習は最大9.5
    if (score >= 690) {
      // 690-720: 9.0-9.5
      return 9.0 + ((score - 690) / (720 - 690)) * 0.5;
    }
    if (score >= 610) {
      // 610-690: 5.0-9.0
      return 5.0 + ((score - 610) / (690 - 610)) * 4.0;
    }
    if (score >= 510) {
      // 510-610: 3.5-5.0
      return 3.5 + ((score - 510) / (610 - 510)) * 1.5;
    }
    if (score >= 410) {
      // 410-510: 2.0-3.5
      return 2.0 + ((score - 410) / (510 - 410)) * 1.5;
    }
    if (score >= 310) {
      // 310-410: 0.5-2.0
      return 0.5 + ((score - 310) / (410 - 310)) * 1.5;
    }
    return Math.max(0, (score / 310) * 0.5);
  }

  // レーティングからランクを取得
  static getRatingRank(rating: number): { rank: string; color: string } {
    for (const rankInfo of DemoStore.ARCHER_RATING_RANKS) {
      if (rating >= rankInfo.minRating) {
        return { rank: rankInfo.rank, color: rankInfo.color };
      }
    }
    return { rank: 'C', color: '#808080' };
  }

  // ユーザーのアーチャーレーティングを計算（試合5回+練習5回のアベレージ）
  calculateUserArcherRating(userId: number): {
    rating: number;
    rank: string;
    rankColor: string;
    competitionRating: number;
    practiceRating: number;
    competitionCount: number;
    practiceCount: number;
    competitionScores: number[];
    practiceScores: number[];
  } | null {
    const userRounds = Array.from(this.archeryRounds.values())
      .filter(r => r.userId === userId && r.status === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (userRounds.length === 0) return null;

    // 試合と練習に分離
    const competitionRounds = userRounds.filter(r => r.roundType === 'competition');
    const practiceRounds = userRounds.filter(r => r.roundType !== 'competition');

    // 直近5回のスコアを取得
    const recentCompetitionScores = competitionRounds.slice(0, 5).map(r => r.totalScore);
    const recentPracticeScores = practiceRounds.slice(0, 5).map(r => r.totalScore);

    // 各カテゴリのレーティングを計算
    let competitionRating = 0;
    if (recentCompetitionScores.length > 0) {
      const avgCompetitionScore = recentCompetitionScores.reduce((a, b) => a + b, 0) / recentCompetitionScores.length;
      competitionRating = DemoStore.scoreToCompetitionRating(avgCompetitionScore);
    }

    let practiceRating = 0;
    if (recentPracticeScores.length > 0) {
      const avgPracticeScore = recentPracticeScores.reduce((a, b) => a + b, 0) / recentPracticeScores.length;
      practiceRating = DemoStore.scoreToPracticeRating(avgPracticeScore);
    }

    // 合計レーティング（試合+練習）
    const totalRating = competitionRating + practiceRating;
    const rankInfo = DemoStore.getRatingRank(totalRating);

    return {
      rating: Math.round(totalRating * 100) / 100, // 小数2桁
      rank: rankInfo.rank,
      rankColor: rankInfo.color,
      competitionRating: Math.round(competitionRating * 100) / 100,
      practiceRating: Math.round(practiceRating * 100) / 100,
      competitionCount: recentCompetitionScores.length,
      practiceCount: recentPracticeScores.length,
      competitionScores: recentCompetitionScores,
      practiceScores: recentPracticeScores,
    };
  }

  // スコアからレーティングポイントを計算（旧システム - Masters用）
  calculateRatingPoints(score: number, maxScore: number, roundType: 'personal' | 'club' | 'competition'): number {
    // 基本ポイント = (score / maxScore) * 1000
    const basePoints = Math.round((score / maxScore) * 1000);

    // 試合は1.5倍、部内点取りは1.2倍
    const multiplier = roundType === 'competition' ? 1.5 : roundType === 'club' ? 1.2 : 1.0;

    return Math.round(basePoints * multiplier);
  }

  // ランク番号からランク情報を取得
  getRankInfo(rankNumber: number) {
    return DemoStore.MASTERS_RANKS.find(r => r.rank === rankNumber) || DemoStore.MASTERS_RANKS[17];
  }

  // ポイントからランク番号を計算
  calculateMastersRank(points: number): number {
    for (const rank of DemoStore.MASTERS_RANKS) {
      if (points >= rank.minPoints) {
        return rank.rank;
      }
    }
    return 18; // Bronze IV
  }

  // マスターズランキング（上位30人）
  getMastersRanking(limit = 30) {
    const userRatings = new Map<number, {
      user: User;
      totalRating: number;
      adjustedRating: number;
      recentScores: { score: number; type: 'practice' | 'competition'; date: Date }[];
    }>();

    // 直近90日のラウンドを集計
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    for (const round of this.archeryRounds.values()) {
      if (round.status !== 'completed') continue;
      if (new Date(round.date) < ninetyDaysAgo) continue;

      const user = this.users.get(round.userId);
      if (!user) continue;

      const existing = userRatings.get(round.userId) || {
        user,
        totalRating: 0,
        adjustedRating: 0,
        recentScores: [],
      };

      // 最大スコアを計算 (例: 72射 × 10点 = 720点)
      const maxScore = round.totalArrows * 10;
      const points = this.calculateRatingPoints(round.totalScore, maxScore, round.roundType);

      existing.totalRating += points;
      existing.recentScores.push({
        score: round.totalScore,
        type: round.roundType === 'competition' ? 'competition' : 'practice',
        date: round.date,
      });

      userRatings.set(round.userId, existing);
    }

    // ハンデ適用とソート
    return Array.from(userRatings.values())
      .map(entry => {
        const gender = (entry.user as any).gender || 'male';
        const handicap = DemoStore.GENDER_HANDICAP[gender as keyof typeof DemoStore.GENDER_HANDICAP] || 0;
        // ハンデは最近のスコア数に応じて加算（1スコアあたり）
        const adjustedRating = entry.totalRating + (handicap * entry.recentScores.length);
        return { ...entry, adjustedRating };
      })
      .sort((a, b) => b.adjustedRating - a.adjustedRating)
      .slice(0, limit)
      .map((entry, index) => {
        const mastersRank = this.calculateMastersRank(entry.adjustedRating);
        const gender = (entry.user as any).gender || 'male';
        const affiliation = (entry.user as any).affiliation;
        const nickname = (entry.user as any).nickname;
        // Parse bestScores JSON
        let bestScores = null;
        try {
          const bestScoresStr = (entry.user as any).bestScores;
          if (bestScoresStr) {
            bestScores = JSON.parse(bestScoresStr);
          }
        } catch (e) {
          // Invalid JSON, ignore
        }
        return {
          rank: index + 1,
          userId: entry.user.id,
          userName: entry.user.name,
          avatarUrl: entry.user.avatarUrl,
          gender,
          affiliation,
          nickname,
          bestScores,
          mastersRank,
          mastersRating: entry.totalRating,
          adjustedRating: entry.adjustedRating,
          recentScores: entry.recentScores
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5)
            .map(s => ({
              score: s.score,
              type: s.type,
              date: s.date.toISOString().split('T')[0],
            })),
        };
      });
  }

  // ===== Teams =====
  // Generate invite code (8 characters)
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 1, 0 for clarity
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  createTeam(data: Omit<Team, 'id' | 'inviteCode' | 'createdAt' | 'updatedAt'>): Team {
    const team: Team = {
      ...data,
      id: this.teamIdCounter++,
      inviteCode: this.generateInviteCode(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.teams.set(team.id, team);

    // Add owner as member
    const member: TeamMember = {
      id: this.teamMemberIdCounter++,
      teamId: team.id,
      userId: data.ownerId,
      role: 'owner',
      status: 'offline',
      statusMessage: null,
      statusUpdatedAt: null,
      joinedAt: new Date(),
    };
    this.teamMembers.set(member.id, member);

    this.saveToFile();
    return team;
  }

  findTeamById(id: number): Team | undefined {
    return this.teams.get(id);
  }

  findTeamByInviteCode(inviteCode: string): Team | undefined {
    return Array.from(this.teams.values()).find(t => t.inviteCode === inviteCode);
  }

  getPublicTeams(): Team[] {
    return Array.from(this.teams.values())
      .filter(t => t.isPublic === 1)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getUserTeams(userId: number): Team[] {
    const memberTeamIds = new Set(
      Array.from(this.teamMembers.values())
        .filter(m => m.userId === userId)
        .map(m => m.teamId)
    );
    return Array.from(this.teams.values())
      .filter(t => memberTeamIds.has(t.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  updateTeam(id: number, data: Partial<Team>): Team | undefined {
    const team = this.teams.get(id);
    if (team) {
      const updated = { ...team, ...data, updatedAt: new Date() };
      this.teams.set(id, updated);
      this.saveToFile();
      return updated;
    }
    return undefined;
  }

  deleteTeam(id: number): boolean {
    // Delete all members, posts, comments, likes
    for (const [memberId, member] of this.teamMembers) {
      if (member.teamId === id) this.teamMembers.delete(memberId);
    }
    for (const [postId, post] of this.teamPosts) {
      if (post.teamId === id) {
        // Delete post's comments and likes
        for (const [commentId, comment] of this.teamPostComments) {
          if (comment.postId === postId) this.teamPostComments.delete(commentId);
        }
        for (const [likeId, like] of this.teamPostLikes) {
          if (like.postId === postId) this.teamPostLikes.delete(likeId);
        }
        this.teamPosts.delete(postId);
      }
    }
    const result = this.teams.delete(id);
    if (result) this.saveToFile();
    return result;
  }

  // ===== Team Members =====
  joinTeam(teamId: number, userId: number, role: 'admin' | 'member' = 'member'): TeamMember | undefined {
    // Check if already a member
    const existing = Array.from(this.teamMembers.values())
      .find(m => m.teamId === teamId && m.userId === userId);
    if (existing) return existing;

    const member: TeamMember = {
      id: this.teamMemberIdCounter++,
      teamId,
      userId,
      role,
      status: 'offline',
      statusMessage: null,
      statusUpdatedAt: null,
      joinedAt: new Date(),
    };
    this.teamMembers.set(member.id, member);
    this.saveToFile();
    return member;
  }

  // Update member status
  updateMemberStatus(teamId: number, userId: number, status: 'offline' | 'practicing' | 'resting' | 'competing' | 'watching', statusMessage?: string): boolean {
    for (const [id, member] of this.teamMembers) {
      if (member.teamId === teamId && member.userId === userId) {
        member.status = status;
        member.statusMessage = statusMessage || null;
        member.statusUpdatedAt = new Date();
        this.teamMembers.set(id, member);
        this.saveToFile();
        return true;
      }
    }
    return false;
  }

  leaveTeam(teamId: number, userId: number): boolean {
    for (const [id, member] of this.teamMembers) {
      if (member.teamId === teamId && member.userId === userId) {
        this.teamMembers.delete(id);
        this.saveToFile();
        return true;
      }
    }
    return false;
  }

  getTeamMembers(teamId: number): (TeamMember & { user?: User })[] {
    return Array.from(this.teamMembers.values())
      .filter(m => m.teamId === teamId)
      .map(m => ({
        ...m,
        user: this.users.get(m.userId),
      }))
      .sort((a, b) => {
        const roleOrder = { owner: 0, admin: 1, member: 2 };
        return roleOrder[a.role] - roleOrder[b.role];
      });
  }

  isTeamMember(teamId: number, userId: number): boolean {
    return Array.from(this.teamMembers.values())
      .some(m => m.teamId === teamId && m.userId === userId);
  }

  getTeamMemberRole(teamId: number, userId: number): 'owner' | 'admin' | 'member' | null {
    const member = Array.from(this.teamMembers.values())
      .find(m => m.teamId === teamId && m.userId === userId);
    return member?.role || null;
  }

  updateTeamMemberRole(teamId: number, userId: number, role: 'admin' | 'member'): boolean {
    for (const [id, member] of this.teamMembers) {
      if (member.teamId === teamId && member.userId === userId && member.role !== 'owner') {
        member.role = role;
        this.teamMembers.set(id, member);
        this.saveToFile();
        return true;
      }
    }
    return false;
  }

  // ===== Team Posts =====
  createTeamPost(data: Omit<TeamPost, 'id' | 'createdAt' | 'updatedAt'>): TeamPost {
    const post: TeamPost = {
      ...data,
      id: this.teamPostIdCounter++,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.teamPosts.set(post.id, post);
    this.saveToFile();
    return post;
  }

  getTeamPosts(teamId: number, limit = 50): (TeamPost & { user?: User; commentsCount: number; likesCount: number; isLiked?: boolean })[] {
    const posts = Array.from(this.teamPosts.values())
      .filter(p => p.teamId === teamId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    return posts.map(post => ({
      ...post,
      user: this.users.get(post.userId),
      commentsCount: Array.from(this.teamPostComments.values())
        .filter(c => c.postId === post.id).length,
      likesCount: Array.from(this.teamPostLikes.values())
        .filter(l => l.postId === post.id).length,
    }));
  }

  findTeamPostById(id: number): TeamPost | undefined {
    return this.teamPosts.get(id);
  }

  updateTeamPost(id: number, data: Partial<TeamPost>): TeamPost | undefined {
    const post = this.teamPosts.get(id);
    if (post) {
      const updated = { ...post, ...data, updatedAt: new Date() };
      this.teamPosts.set(id, updated);
      this.saveToFile();
      return updated;
    }
    return undefined;
  }

  deleteTeamPost(id: number): boolean {
    // Delete comments and likes
    for (const [commentId, comment] of this.teamPostComments) {
      if (comment.postId === id) this.teamPostComments.delete(commentId);
    }
    for (const [likeId, like] of this.teamPostLikes) {
      if (like.postId === id) this.teamPostLikes.delete(likeId);
    }
    const result = this.teamPosts.delete(id);
    if (result) this.saveToFile();
    return result;
  }

  // ===== Team Post Comments =====
  createTeamPostComment(data: Omit<TeamPostComment, 'id' | 'createdAt'>): TeamPostComment {
    const comment: TeamPostComment = {
      ...data,
      id: this.teamPostCommentIdCounter++,
      createdAt: new Date(),
    };
    this.teamPostComments.set(comment.id, comment);
    this.saveToFile();
    return comment;
  }

  getTeamPostComments(postId: number): (TeamPostComment & { user?: User })[] {
    return Array.from(this.teamPostComments.values())
      .filter(c => c.postId === postId)
      .map(c => ({
        ...c,
        user: this.users.get(c.userId),
      }))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  deleteTeamPostComment(id: number): boolean {
    const result = this.teamPostComments.delete(id);
    if (result) this.saveToFile();
    return result;
  }

  // ===== Team Post Likes =====
  toggleTeamPostLike(postId: number, userId: number): boolean {
    // Check if already liked
    for (const [id, like] of this.teamPostLikes) {
      if (like.postId === postId && like.userId === userId) {
        this.teamPostLikes.delete(id);
        this.saveToFile();
        return false; // unliked
      }
    }
    // Add like
    const like: TeamPostLike = {
      id: this.teamPostLikeIdCounter++,
      postId,
      userId,
      createdAt: new Date(),
    };
    this.teamPostLikes.set(like.id, like);
    this.saveToFile();
    return true; // liked
  }

  isPostLikedByUser(postId: number, userId: number): boolean {
    return Array.from(this.teamPostLikes.values())
      .some(l => l.postId === postId && l.userId === userId);
  }

  getPostLikesCount(postId: number): number {
    return Array.from(this.teamPostLikes.values())
      .filter(l => l.postId === postId).length;
  }

  // チーム内週間ランキング（今週の射数・スコア）
  getTeamWeeklyRanking(teamId: number): { userId: number; user?: User; totalArrows: number; totalScore: number; sessionCount: number }[] {
    // 今週の開始日（月曜日）を取得
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // 月曜日に調整
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    // チームメンバーのIDを取得
    const memberUserIds = new Set(
      Array.from(this.teamMembers.values())
        .filter(m => m.teamId === teamId)
        .map(m => m.userId)
    );

    // 今週のラウンドデータを集計
    const userStats = new Map<number, { totalArrows: number; totalScore: number; sessionCount: number }>();

    for (const round of this.archeryRounds.values()) {
      if (!memberUserIds.has(round.userId)) continue;
      if (new Date(round.createdAt) < startOfWeek) continue;
      if (round.status !== 'completed') continue;

      const stats = userStats.get(round.userId) || { totalArrows: 0, totalScore: 0, sessionCount: 0 };
      stats.totalArrows += round.totalArrows;
      stats.totalScore += round.totalScore;
      stats.sessionCount += 1;
      userStats.set(round.userId, stats);
    }

    // ランキングを作成（射数順）
    return Array.from(userStats.entries())
      .map(([userId, stats]) => ({
        userId,
        user: this.users.get(userId),
        ...stats,
      }))
      .sort((a, b) => b.totalArrows - a.totalArrows);
  }

  // 今日の全国ランキング（Top 10）
  getDailyRanking(date?: Date, limit = 10) {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const todayScores: {
      user: User;
      round: ArcheryRound;
      adjustedScore: number;
    }[] = [];

    for (const round of this.archeryRounds.values()) {
      if (round.status !== 'completed') continue;
      const roundDate = new Date(round.date);
      if (roundDate < startOfDay || roundDate > endOfDay) continue;

      const user = this.users.get(round.userId);
      if (!user) continue;

      const gender = (user as any).gender || 'male';
      const handicap = DemoStore.GENDER_HANDICAP[gender as keyof typeof DemoStore.GENDER_HANDICAP] || 0;
      const adjustedScore = round.totalScore + handicap;

      todayScores.push({ user, round, adjustedScore });
    }

    return todayScores
      .sort((a, b) => b.adjustedScore - a.adjustedScore)
      .slice(0, limit)
      .map((entry, index) => {
        const gender = (entry.user as any).gender || 'male';
        const affiliation = (entry.user as any).affiliation;
        const nickname = (entry.user as any).nickname;
        // Parse bestScores JSON
        let bestScores = null;
        try {
          const bestScoresStr = (entry.user as any).bestScores;
          if (bestScoresStr) {
            bestScores = JSON.parse(bestScoresStr);
          }
        } catch (e) {
          // Invalid JSON, ignore
        }
        return {
          rank: index + 1,
          userId: entry.user.id,
          userName: entry.user.name,
          avatarUrl: entry.user.avatarUrl,
          gender,
          affiliation,
          nickname,
          bestScores,
          score: entry.round.totalScore,
          adjustedScore: entry.adjustedScore,
          distanceLabel: entry.round.distanceLabel || `${entry.round.distance}m`,
          roundType: entry.round.roundType,
          date: entry.round.date.toISOString().split('T')[0],
        };
      });
  }
}

export const demoStore = new DemoStore();
export const isDemoMode = !process.env.DATABASE_URL;
export { DemoStore };
