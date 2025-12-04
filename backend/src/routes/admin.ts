import { Router } from 'express';
import { adminMiddleware, type AuthRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { users, chatSessions, chatMessages, coaches } from '../db/schema.js';
import { eq, desc, and, sql } from 'drizzle-orm';

const router = Router();

// All routes require admin privileges
router.use(adminMiddleware);

// Get all users
router.get('/users', async (_req: AuthRequest, res) => {
  try {
    const allUsers = await db.query.users.findMany({
      orderBy: [desc(users.createdAt)],
    });

    // Remove sensitive data
    const sanitizedUsers = allUsers.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      isAdmin: user.isAdmin,
      authProvider: user.authProvider,
      language: user.language,
      affiliation: user.affiliation,
      nickname: user.nickname,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    res.json(sanitizedUsers);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'ユーザー一覧の取得に失敗しました' });
  }
});

// Get user by ID
router.get('/users/:id', async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id);

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }

    // Remove sensitive data
    const sanitizedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      isAdmin: user.isAdmin,
      authProvider: user.authProvider,
      language: user.language,
      gender: user.gender,
      affiliation: user.affiliation,
      nickname: user.nickname,
      bestScores: user.bestScores,
      mastersRating: user.mastersRating,
      mastersRank: user.mastersRank,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.json(sanitizedUser);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'ユーザー情報の取得に失敗しました' });
  }
});

// Update user (toggle admin, etc.)
router.patch('/users/:id', async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { isAdmin } = req.body;

    // Check if user exists
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }

    // Update user
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (isAdmin !== undefined) updateData.isAdmin = isAdmin ? 1 : 0;

    await db.update(users).set(updateData).where(eq(users.id, userId));

    res.json({ success: true });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'ユーザー更新に失敗しました' });
  }
});

// Get chat sessions for a specific user
router.get('/users/:id/chats', async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id);

    const sessions = await db.query.chatSessions.findMany({
      where: eq(chatSessions.userId, userId),
      with: {
        coach: true,
      },
      orderBy: [desc(chatSessions.updatedAt)],
    });

    // Get message count for each session
    const sessionsWithCount = await Promise.all(
      sessions.map(async (session) => {
        const messageCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(chatMessages)
          .where(eq(chatMessages.sessionId, session.id));

        return {
          id: session.id,
          title: session.title,
          coachId: session.coachId,
          coachName: session.coach?.name || 'Unknown',
          messageCount: Number(messageCount[0]?.count || 0),
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        };
      })
    );

    res.json(sessionsWithCount);
  } catch (error) {
    console.error('Get user chats error:', error);
    res.status(500).json({ error: 'チャット履歴の取得に失敗しました' });
  }
});

// Get all chat sessions (with optional coach filter)
router.get('/chats', async (req: AuthRequest, res) => {
  try {
    const { coachId } = req.query;

    let whereCondition = undefined;
    if (coachId) {
      whereCondition = eq(chatSessions.coachId, parseInt(coachId as string));
    }

    const sessions = await db.query.chatSessions.findMany({
      where: whereCondition,
      with: {
        user: true,
        coach: true,
      },
      orderBy: [desc(chatSessions.updatedAt)],
    });

    // Get message count for each session
    const sessionsWithDetails = await Promise.all(
      sessions.map(async (session) => {
        const messageCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(chatMessages)
          .where(eq(chatMessages.sessionId, session.id));

        return {
          id: session.id,
          title: session.title,
          userId: session.userId,
          userName: session.user?.name || 'Unknown',
          userEmail: session.user?.email || '',
          coachId: session.coachId,
          coachName: session.coach?.name || 'Unknown',
          messageCount: Number(messageCount[0]?.count || 0),
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        };
      })
    );

    res.json(sessionsWithDetails);
  } catch (error) {
    console.error('Get all chats error:', error);
    res.status(500).json({ error: 'チャット一覧の取得に失敗しました' });
  }
});

// Get specific chat session with messages
router.get('/chats/:sessionId', async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);

    const session = await db.query.chatSessions.findFirst({
      where: eq(chatSessions.id, sessionId),
      with: {
        user: true,
        coach: true,
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'チャットセッションが見つかりません' });
    }

    const messages = await db.query.chatMessages.findMany({
      where: eq(chatMessages.sessionId, sessionId),
      orderBy: [chatMessages.createdAt],
    });

    res.json({
      session: {
        id: session.id,
        title: session.title,
        userId: session.userId,
        userName: session.user?.name || 'Unknown',
        userEmail: session.user?.email || '',
        coachId: session.coachId,
        coachName: session.coach?.name || 'Unknown',
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get chat session error:', error);
    res.status(500).json({ error: 'チャット詳細の取得に失敗しました' });
  }
});

// Get all coaches (for filter dropdown)
router.get('/coaches', async (_req: AuthRequest, res) => {
  try {
    const allCoaches = await db.query.coaches.findMany({
      orderBy: [coaches.name],
    });

    res.json(allCoaches.map(coach => ({
      id: coach.id,
      name: coach.name,
      nameEn: coach.nameEn,
      specialty: coach.specialty,
    })));
  } catch (error) {
    console.error('Get coaches error:', error);
    res.status(500).json({ error: 'コーチ一覧の取得に失敗しました' });
  }
});

// Get dashboard stats
router.get('/stats', async (_req: AuthRequest, res) => {
  try {
    const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
    const sessionCount = await db.select({ count: sql<number>`count(*)` }).from(chatSessions);
    const messageCount = await db.select({ count: sql<number>`count(*)` }).from(chatMessages);

    res.json({
      totalUsers: Number(userCount[0]?.count || 0),
      totalSessions: Number(sessionCount[0]?.count || 0),
      totalMessages: Number(messageCount[0]?.count || 0),
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: '統計情報の取得に失敗しました' });
  }
});

export default router;
