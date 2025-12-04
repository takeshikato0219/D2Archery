import { Router } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { generateCoachResponse, generateScoreAdvice } from '../services/openai.js';
import { demoStore, isDemoMode } from '../db/demo-store.js';

const router = Router();

// ===== Session Management Routes =====

// Get all sessions for a coach
router.get('/sessions/:coachId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { coachId } = req.params;
    let sessions;

    if (isDemoMode) {
      sessions = demoStore.getSessionsByUserAndCoach(req.user!.id, parseInt(coachId));
    } else {
      const { db, chatSessions } = await import('../db/index.js');
      const { eq, and, desc } = await import('drizzle-orm');
      sessions = await db.query.chatSessions.findMany({
        where: and(
          eq(chatSessions.userId, req.user!.id),
          eq(chatSessions.coachId, parseInt(coachId))
        ),
        orderBy: [desc(chatSessions.updatedAt)],
      });
    }

    res.json(sessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Create a new session
router.post('/sessions', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { coachId, title = 'New Chat' } = req.body;

    if (!coachId) {
      return res.status(400).json({ error: 'Coach ID is required' });
    }

    let session;
    const now = new Date();

    if (isDemoMode) {
      session = demoStore.createSession({
        userId: req.user!.id,
        coachId: parseInt(coachId),
        title,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      const { db, chatSessions } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');
      const result = await db.insert(chatSessions).values({
        userId: req.user!.id,
        coachId: parseInt(coachId),
        title,
        createdAt: now,
        updatedAt: now,
      });
      session = await db.query.chatSessions.findFirst({
        where: eq(chatSessions.id, Number(result[0].insertId)),
      });
    }

    res.json(session);
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Update session title
router.patch('/sessions/:sessionId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    let session;

    if (isDemoMode) {
      const existing = demoStore.findSessionById(parseInt(sessionId));
      if (!existing || existing.userId !== req.user!.id) {
        return res.status(404).json({ error: 'Session not found' });
      }
      session = demoStore.updateSession(parseInt(sessionId), { title });
    } else {
      const { db, chatSessions } = await import('../db/index.js');
      const { eq, and } = await import('drizzle-orm');
      await db.update(chatSessions)
        .set({ title, updatedAt: new Date() })
        .where(and(
          eq(chatSessions.id, parseInt(sessionId)),
          eq(chatSessions.userId, req.user!.id)
        ));
      session = await db.query.chatSessions.findFirst({
        where: eq(chatSessions.id, parseInt(sessionId)),
      });
    }

    res.json(session);
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// Delete a session
router.delete('/sessions/:sessionId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params;

    if (isDemoMode) {
      const existing = demoStore.findSessionById(parseInt(sessionId));
      if (!existing || existing.userId !== req.user!.id) {
        return res.status(404).json({ error: 'Session not found' });
      }
      demoStore.deleteSession(parseInt(sessionId));
    } else {
      const { db, chatSessions, chatMessages } = await import('../db/index.js');
      const { eq, and } = await import('drizzle-orm');
      // Delete messages first
      await db.delete(chatMessages).where(eq(chatMessages.sessionId, parseInt(sessionId)));
      // Then delete session
      await db.delete(chatSessions).where(and(
        eq(chatSessions.id, parseInt(sessionId)),
        eq(chatSessions.userId, req.user!.id)
      ));
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Get messages for a session
router.get('/sessions/:sessionId/messages', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = '100' } = req.query;
    let messages;

    if (isDemoMode) {
      const session = demoStore.findSessionById(parseInt(sessionId));
      if (!session || session.userId !== req.user!.id) {
        return res.status(404).json({ error: 'Session not found' });
      }
      messages = demoStore.getMessagesBySession(parseInt(sessionId), parseInt(limit as string));
    } else {
      const { db, chatSessions, chatMessages } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');

      // Verify session belongs to user
      const session = await db.query.chatSessions.findFirst({
        where: eq(chatSessions.id, parseInt(sessionId)),
      });
      if (!session || session.userId !== req.user!.id) {
        return res.status(404).json({ error: 'Session not found' });
      }

      messages = await db.query.chatMessages.findMany({
        where: eq(chatMessages.sessionId, parseInt(sessionId)),
        orderBy: [chatMessages.createdAt],
        limit: parseInt(limit as string),
      });
    }

    res.json(messages);
  } catch (error) {
    console.error('Get session messages error:', error);
    res.status(500).json({ error: 'Failed to get session messages' });
  }
});

// Send message to a session
router.post('/sessions/:sessionId/send', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let session;
    let coach;
    let previousMessages;
    let recentScores;

    if (isDemoMode) {
      session = demoStore.findSessionById(parseInt(sessionId));
      if (!session || session.userId !== req.user!.id) {
        return res.status(404).json({ error: 'Session not found' });
      }
      coach = demoStore.findCoachById(session.coachId);
      previousMessages = demoStore.getMessagesBySession(parseInt(sessionId), 10);
      recentScores = demoStore.getScoresByUserId(req.user!.id, 5);
    } else {
      const { db, chatSessions, coaches, chatMessages, scoreLogs } = await import('../db/index.js');
      const { eq, desc } = await import('drizzle-orm');

      session = await db.query.chatSessions.findFirst({
        where: eq(chatSessions.id, parseInt(sessionId)),
      });
      if (!session || session.userId !== req.user!.id) {
        return res.status(404).json({ error: 'Session not found' });
      }

      coach = await db.query.coaches.findFirst({
        where: eq(coaches.id, session.coachId),
      });

      previousMessages = await db.query.chatMessages.findMany({
        where: eq(chatMessages.sessionId, parseInt(sessionId)),
        orderBy: [desc(chatMessages.createdAt)],
        limit: 10,
      });
      previousMessages = previousMessages.reverse();

      recentScores = await db.query.scoreLogs.findMany({
        where: eq(scoreLogs.userId, req.user!.id),
        orderBy: [desc(scoreLogs.date)],
        limit: 5,
      });
    }

    if (!coach) {
      return res.status(404).json({ error: 'Coach not found' });
    }

    const language = (req.user!.language || 'ja') as 'ja' | 'en';

    let userContext;
    if (recentScores && recentScores.length > 0) {
      const averageScore = Math.round(
        recentScores.reduce((sum, s) => sum + (s.score / s.maxScore) * 100, 0) / recentScores.length
      );

      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (recentScores.length >= 3) {
        const recent = recentScores.slice(0, 2);
        const older = recentScores.slice(2, 4);
        if (older.length > 0) {
          const recentAvg = recent.reduce((sum, s) => sum + s.score, 0) / recent.length;
          const olderAvg = older.reduce((sum, s) => sum + s.score, 0) / older.length;
          if (recentAvg > olderAvg * 1.05) trend = 'improving';
          else if (recentAvg < olderAvg * 0.95) trend = 'declining';
        }
      }

      userContext = {
        recentScores: recentScores.map((s) => ({
          date: new Date(s.date).toISOString().split('T')[0],
          score: s.score,
          maxScore: s.maxScore,
        })),
        averageScore,
        trend,
      };
    }

    // Save user message
    if (isDemoMode) {
      demoStore.createMessage({
        sessionId: parseInt(sessionId),
        userId: req.user!.id,
        coachId: session!.coachId,
        role: 'user',
        content: message,
        createdAt: new Date(),
      });
    } else {
      const { db, chatMessages } = await import('../db/index.js');
      await db.insert(chatMessages).values({
        sessionId: parseInt(sessionId),
        userId: req.user!.id,
        coachId: session!.coachId,
        role: 'user',
        content: message,
        createdAt: new Date(),
      });
    }

    // Generate AI response
    const aiResponse = await generateCoachResponse({
      coach,
      messages: previousMessages || [],
      userMessage: message,
      language,
      userContext,
    });

    // Save AI response and update session
    let savedMessage;
    if (isDemoMode) {
      savedMessage = demoStore.createMessage({
        sessionId: parseInt(sessionId),
        userId: req.user!.id,
        coachId: session!.coachId,
        role: 'assistant',
        content: aiResponse,
        createdAt: new Date(),
      });
      // Update session title if first message
      if (previousMessages.length === 0) {
        const title = message.length > 30 ? message.substring(0, 30) + '...' : message;
        demoStore.updateSession(parseInt(sessionId), { title });
      } else {
        demoStore.updateSession(parseInt(sessionId), {});
      }
    } else {
      const { db, chatMessages, chatSessions } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');
      const result = await db.insert(chatMessages).values({
        sessionId: parseInt(sessionId),
        userId: req.user!.id,
        coachId: session!.coachId,
        role: 'assistant',
        content: aiResponse,
        createdAt: new Date(),
      });

      savedMessage = await db.query.chatMessages.findFirst({
        where: eq(chatMessages.id, Number(result[0].insertId)),
      });

      // Update session title if first message
      if (previousMessages.length === 0) {
        const title = message.length > 30 ? message.substring(0, 30) + '...' : message;
        await db.update(chatSessions).set({ title, updatedAt: new Date() }).where(eq(chatSessions.id, parseInt(sessionId)));
      } else {
        await db.update(chatSessions).set({ updatedAt: new Date() }).where(eq(chatSessions.id, parseInt(sessionId)));
      }
    }

    res.json({
      message: savedMessage,
      response: aiResponse,
    });
  } catch (error) {
    console.error('Send session message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ===== Legacy Routes (for backward compatibility) =====

// Get chat history with a specific coach
router.get('/history/:coachId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { coachId } = req.params;
    const { limit = '50' } = req.query;
    let messages;

    if (isDemoMode) {
      messages = demoStore.getMessagesByUserAndCoach(req.user!.id, parseInt(coachId), parseInt(limit as string));
    } else {
      const { db, chatMessages } = await import('../db/index.js');
      const { eq, and } = await import('drizzle-orm');
      messages = await db.query.chatMessages.findMany({
        where: and(
          eq(chatMessages.userId, req.user!.id),
          eq(chatMessages.coachId, parseInt(coachId))
        ),
        orderBy: [chatMessages.createdAt],
        limit: parseInt(limit as string),
      });
    }

    res.json(messages);
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

// Send message to coach
router.post('/send', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { coachId, message } = req.body;

    if (!coachId || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let coach;
    let previousMessages;
    let recentScores;

    if (isDemoMode) {
      coach = demoStore.findCoachById(parseInt(coachId));
      previousMessages = demoStore.getMessagesByUserAndCoach(req.user!.id, parseInt(coachId), 10);
      recentScores = demoStore.getScoresByUserId(req.user!.id, 5);
    } else {
      const { db, coaches, chatMessages, scoreLogs } = await import('../db/index.js');
      const { eq, and, desc } = await import('drizzle-orm');

      coach = await db.query.coaches.findFirst({
        where: eq(coaches.id, parseInt(coachId)),
      });

      previousMessages = await db.query.chatMessages.findMany({
        where: and(
          eq(chatMessages.userId, req.user!.id),
          eq(chatMessages.coachId, parseInt(coachId))
        ),
        orderBy: [desc(chatMessages.createdAt)],
        limit: 10,
      });
      previousMessages = previousMessages.reverse();

      recentScores = await db.query.scoreLogs.findMany({
        where: eq(scoreLogs.userId, req.user!.id),
        orderBy: [desc(scoreLogs.date)],
        limit: 5,
      });
    }

    if (!coach) {
      return res.status(404).json({ error: 'Coach not found' });
    }

    const language = (req.user!.language || 'ja') as 'ja' | 'en';

    let userContext;
    if (recentScores && recentScores.length > 0) {
      const averageScore = Math.round(
        recentScores.reduce((sum, s) => sum + (s.score / s.maxScore) * 100, 0) / recentScores.length
      );

      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (recentScores.length >= 3) {
        const recent = recentScores.slice(0, 2);
        const older = recentScores.slice(2, 4);
        if (older.length > 0) {
          const recentAvg = recent.reduce((sum, s) => sum + s.score, 0) / recent.length;
          const olderAvg = older.reduce((sum, s) => sum + s.score, 0) / older.length;
          if (recentAvg > olderAvg * 1.05) trend = 'improving';
          else if (recentAvg < olderAvg * 0.95) trend = 'declining';
        }
      }

      userContext = {
        recentScores: recentScores.map((s) => ({
          date: new Date(s.date).toISOString().split('T')[0],
          score: s.score,
          maxScore: s.maxScore,
        })),
        averageScore,
        trend,
      };
    }

    // Save user message
    if (isDemoMode) {
      demoStore.createMessage({
        userId: req.user!.id,
        coachId: parseInt(coachId),
        role: 'user',
        content: message,
        createdAt: new Date(),
      });
    } else {
      const { db, chatMessages } = await import('../db/index.js');
      await db.insert(chatMessages).values({
        userId: req.user!.id,
        coachId: parseInt(coachId),
        role: 'user',
        content: message,
        createdAt: new Date(),
      });
    }

    // Generate AI response
    const aiResponse = await generateCoachResponse({
      coach,
      messages: previousMessages || [],
      userMessage: message,
      language,
      userContext,
    });

    // Save AI response
    let savedMessage;
    if (isDemoMode) {
      savedMessage = demoStore.createMessage({
        userId: req.user!.id,
        coachId: parseInt(coachId),
        role: 'assistant',
        content: aiResponse,
        createdAt: new Date(),
      });
    } else {
      const { db, chatMessages } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');
      const result = await db.insert(chatMessages).values({
        userId: req.user!.id,
        coachId: parseInt(coachId),
        role: 'assistant',
        content: aiResponse,
        createdAt: new Date(),
      });

      savedMessage = await db.query.chatMessages.findFirst({
        where: eq(chatMessages.id, Number(result[0].insertId)),
      });
    }

    res.json({
      message: savedMessage,
      response: aiResponse,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get advice based on scores
router.post('/advice', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { coachId } = req.body;

    if (!coachId) {
      return res.status(400).json({ error: 'Coach ID is required' });
    }

    let coach;
    let recentScores;

    if (isDemoMode) {
      coach = demoStore.findCoachById(parseInt(coachId));
      recentScores = demoStore.getScoresByUserId(req.user!.id, 10);
    } else {
      const { db, coaches, scoreLogs } = await import('../db/index.js');
      const { eq, desc } = await import('drizzle-orm');

      coach = await db.query.coaches.findFirst({
        where: eq(coaches.id, parseInt(coachId)),
      });

      recentScores = await db.query.scoreLogs.findMany({
        where: eq(scoreLogs.userId, req.user!.id),
        orderBy: [desc(scoreLogs.date)],
        limit: 10,
      });
    }

    if (!coach) {
      return res.status(404).json({ error: 'Coach not found' });
    }

    const language = (req.user!.language || 'ja') as 'ja' | 'en';

    if (!recentScores || recentScores.length === 0) {
      return res.status(400).json({
        error: language === 'ja'
          ? '分析するスコアデータがありません。まず練習を記録してください。'
          : 'No score data to analyze. Please record your practice first.',
      });
    }

    const advice = await generateScoreAdvice(
      coach,
      language,
      recentScores.map((s) => ({
        date: new Date(s.date).toISOString().split('T')[0],
        score: s.score,
        maxScore: s.maxScore,
        arrowsCount: s.arrowsCount,
        memo: s.memo,
      }))
    );

    // Save as chat messages
    const userMsg = language === 'ja'
      ? '最近の練習データを分析してアドバイスをください'
      : 'Please analyze my recent practice data and give me advice';

    if (isDemoMode) {
      demoStore.createMessage({
        userId: req.user!.id,
        coachId: parseInt(coachId),
        role: 'user',
        content: userMsg,
        createdAt: new Date(),
      });
      demoStore.createMessage({
        userId: req.user!.id,
        coachId: parseInt(coachId),
        role: 'assistant',
        content: advice,
        createdAt: new Date(),
      });
    } else {
      const { db, chatMessages } = await import('../db/index.js');
      await db.insert(chatMessages).values({
        userId: req.user!.id,
        coachId: parseInt(coachId),
        role: 'user',
        content: userMsg,
        createdAt: new Date(),
      });
      await db.insert(chatMessages).values({
        userId: req.user!.id,
        coachId: parseInt(coachId),
        role: 'assistant',
        content: advice,
        createdAt: new Date(),
      });
    }

    res.json({ advice });
  } catch (error) {
    console.error('Get advice error:', error);
    res.status(500).json({ error: 'Failed to get advice' });
  }
});

// Clear chat history with a coach
router.delete('/history/:coachId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { coachId } = req.params;

    if (isDemoMode) {
      demoStore.clearMessagesByUserAndCoach(req.user!.id, parseInt(coachId));
    } else {
      const { db, chatMessages } = await import('../db/index.js');
      const { eq, and } = await import('drizzle-orm');
      await db.delete(chatMessages).where(
        and(
          eq(chatMessages.userId, req.user!.id),
          eq(chatMessages.coachId, parseInt(coachId))
        )
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Clear chat history error:', error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

export default router;
