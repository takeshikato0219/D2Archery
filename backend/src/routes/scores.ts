import { Router } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { demoStore, isDemoMode } from '../db/demo-store.js';

const router = Router();

// Get all scores for current user
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { limit = '50' } = req.query;
    let scores;

    if (isDemoMode) {
      scores = demoStore.getScoresByUserId(req.user!.id, parseInt(limit as string));
    } else {
      const { db, scoreLogs } = await import('../db/index.js');
      const { eq, desc } = await import('drizzle-orm');
      scores = await db.query.scoreLogs.findMany({
        where: eq(scoreLogs.userId, req.user!.id),
        orderBy: [desc(scoreLogs.date)],
        limit: parseInt(limit as string),
      });
    }

    res.json(scores);
  } catch (error) {
    console.error('Get scores error:', error);
    res.status(500).json({ error: 'Failed to get scores' });
  }
});

// Get score statistics
router.get('/stats', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    let allScores;

    if (isDemoMode) {
      allScores = demoStore.getScoresByUserId(userId, 1000);
    } else {
      const { db, scoreLogs } = await import('../db/index.js');
      const { eq, desc } = await import('drizzle-orm');
      allScores = await db.query.scoreLogs.findMany({
        where: eq(scoreLogs.userId, userId),
        orderBy: [desc(scoreLogs.date)],
      });
    }

    if (allScores.length === 0) {
      return res.json({
        totalSessions: 0,
        totalArrows: 0,
        averageScore: 0,
        highScore: 0,
        recentTrend: 'stable',
      });
    }

    const totalSessions = allScores.length;
    const totalArrows = allScores.reduce((sum, s) => sum + s.arrowsCount, 0);
    const averageScore = Math.round(
      allScores.reduce((sum, s) => sum + (s.score / s.maxScore) * 100, 0) / allScores.length
    );
    const highScore = Math.max(...allScores.map((s) => s.score));

    let recentTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (allScores.length >= 10) {
      const recent5 = allScores.slice(0, 5);
      const previous5 = allScores.slice(5, 10);
      const recentAvg = recent5.reduce((sum, s) => sum + s.score, 0) / 5;
      const previousAvg = previous5.reduce((sum, s) => sum + s.score, 0) / 5;

      if (recentAvg > previousAvg * 1.05) {
        recentTrend = 'improving';
      } else if (recentAvg < previousAvg * 0.95) {
        recentTrend = 'declining';
      }
    }

    res.json({
      totalSessions,
      totalArrows,
      averageScore,
      highScore,
      recentTrend,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Get scores for graph (by date range)
router.get('/graph', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { period = '30' } = req.query;
    const start = new Date();
    start.setDate(start.getDate() - parseInt(period as string));

    let scores;

    if (isDemoMode) {
      scores = demoStore.getScoresByUserId(req.user!.id, 1000)
        .filter(s => new Date(s.date) >= start)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else {
      const { db, scoreLogs } = await import('../db/index.js');
      const { eq, and, gte } = await import('drizzle-orm');
      scores = await db.query.scoreLogs.findMany({
        where: and(
          eq(scoreLogs.userId, req.user!.id),
          gte(scoreLogs.date, start)
        ),
        orderBy: [scoreLogs.date],
      });
    }

    const graphData = scores.map((score) => ({
      date: new Date(score.date).toISOString().split('T')[0],
      score: score.score,
      maxScore: score.maxScore,
      percentage: Math.round((score.score / score.maxScore) * 100),
      arrowsCount: score.arrowsCount,
    }));

    res.json(graphData);
  } catch (error) {
    console.error('Get graph data error:', error);
    res.status(500).json({ error: 'Failed to get graph data' });
  }
});

// Create new score
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { date, score, maxScore = 360, arrowsCount, distance = 18, memo } = req.body;

    if (!date || score === undefined || !arrowsCount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let newScore;

    if (isDemoMode) {
      newScore = demoStore.createScore({
        userId: req.user!.id,
        date: new Date(date),
        score: parseInt(score),
        maxScore: parseInt(maxScore),
        arrowsCount: parseInt(arrowsCount),
        distance: parseInt(distance),
        memo: memo || null,
        createdAt: new Date(),
      });
    } else {
      const { db, scoreLogs } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');
      const result = await db.insert(scoreLogs).values({
        userId: req.user!.id,
        date: new Date(date),
        score: parseInt(score),
        maxScore: parseInt(maxScore),
        arrowsCount: parseInt(arrowsCount),
        distance: parseInt(distance),
        memo,
        createdAt: new Date(),
      });

      newScore = await db.query.scoreLogs.findFirst({
        where: eq(scoreLogs.id, Number(result[0].insertId)),
      });
    }

    res.status(201).json(newScore);
  } catch (error) {
    console.error('Create score error:', error);
    res.status(500).json({ error: 'Failed to create score' });
  }
});

// Update score
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { date, score, maxScore, arrowsCount, distance, memo } = req.body;

    const updateData: Record<string, unknown> = {};
    if (date) updateData.date = new Date(date);
    if (score !== undefined) updateData.score = parseInt(score);
    if (maxScore !== undefined) updateData.maxScore = parseInt(maxScore);
    if (arrowsCount !== undefined) updateData.arrowsCount = parseInt(arrowsCount);
    if (distance !== undefined) updateData.distance = parseInt(distance);
    if (memo !== undefined) updateData.memo = memo;

    let updated;

    if (isDemoMode) {
      const existing = demoStore.findScoreById(parseInt(id));
      if (!existing || existing.userId !== req.user!.id) {
        return res.status(404).json({ error: 'Score not found' });
      }
      updated = demoStore.updateScore(parseInt(id), updateData);
    } else {
      const { db, scoreLogs } = await import('../db/index.js');
      const { eq, and } = await import('drizzle-orm');

      const existing = await db.query.scoreLogs.findFirst({
        where: and(eq(scoreLogs.id, parseInt(id)), eq(scoreLogs.userId, req.user!.id)),
      });

      if (!existing) {
        return res.status(404).json({ error: 'Score not found' });
      }

      await db.update(scoreLogs).set(updateData).where(eq(scoreLogs.id, parseInt(id)));
      updated = await db.query.scoreLogs.findFirst({
        where: eq(scoreLogs.id, parseInt(id)),
      });
    }

    res.json(updated);
  } catch (error) {
    console.error('Update score error:', error);
    res.status(500).json({ error: 'Failed to update score' });
  }
});

// Delete score
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (isDemoMode) {
      const existing = demoStore.findScoreById(parseInt(id));
      if (!existing || existing.userId !== req.user!.id) {
        return res.status(404).json({ error: 'Score not found' });
      }
      demoStore.deleteScore(parseInt(id));
    } else {
      const { db, scoreLogs } = await import('../db/index.js');
      const { eq, and } = await import('drizzle-orm');

      const existing = await db.query.scoreLogs.findFirst({
        where: and(eq(scoreLogs.id, parseInt(id)), eq(scoreLogs.userId, req.user!.id)),
      });

      if (!existing) {
        return res.status(404).json({ error: 'Score not found' });
      }

      await db.delete(scoreLogs).where(eq(scoreLogs.id, parseInt(id)));
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete score error:', error);
    res.status(500).json({ error: 'Failed to delete score' });
  }
});

export default router;
