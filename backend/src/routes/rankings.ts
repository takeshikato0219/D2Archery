import { Router } from 'express';
import { demoStore, isDemoMode, DemoStore } from '../db/demo-store.js';
import { optionalAuthMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// Masters rank info (APEX風 1-18ランク)
router.get('/masters/ranks', async (_req, res) => {
  try {
    res.json({
      ranks: DemoStore.MASTERS_RANKS,
      genderHandicap: DemoStore.GENDER_HANDICAP,
    });
  } catch (error) {
    console.error('Get masters ranks error:', error);
    res.status(500).json({ error: 'Failed to get masters ranks' });
  }
});

// Archer rating info (SA/AA/A/BB/B/C)
router.get('/archer-rating/ranks', async (_req, res) => {
  try {
    res.json({
      ranks: DemoStore.ARCHER_RATING_RANKS,
    });
  } catch (error) {
    console.error('Get archer rating ranks error:', error);
    res.status(500).json({ error: 'Failed to get archer rating ranks' });
  }
});

// Get user's archer rating
router.get('/archer-rating/me', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (isDemoMode) {
      const rating = demoStore.calculateUserArcherRating(req.user.id);
      res.json({ rating });
    } else {
      // TODO: Database implementation
      res.json({ rating: null });
    }
  } catch (error) {
    console.error('Get archer rating error:', error);
    res.status(500).json({ error: 'Failed to get archer rating' });
  }
});

// Masters ranking (Top 30)
router.get('/masters', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const { limit = '30' } = req.query;

    let rankings: ReturnType<typeof demoStore.getMastersRanking> = [];
    let userRank = null;

    if (isDemoMode) {
      rankings = demoStore.getMastersRanking(parseInt(limit as string));

      if (req.user) {
        const allRankings = demoStore.getMastersRanking(100);
        const userEntry = allRankings.find(r => r.userId === req.user!.id);
        if (userEntry) {
          userRank = {
            rank: userEntry.rank,
            mastersRank: userEntry.mastersRank,
            mastersRating: userEntry.mastersRating,
            adjustedRating: userEntry.adjustedRating,
            rankInfo: demoStore.getRankInfo(userEntry.mastersRank),
          };
        }
      }
    } else {
      // TODO: Database implementation
      rankings = [];
    }

    res.json({
      rankings,
      userRank,
      ranks: DemoStore.MASTERS_RANKS,
    });
  } catch (error) {
    console.error('Get masters ranking error:', error);
    res.status(500).json({ error: 'Failed to get masters rankings' });
  }
});

// Daily ranking (今日の全国Top 10)
router.get('/daily', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const { date, limit = '10' } = req.query;

    let targetDate: Date | undefined;
    if (date) {
      targetDate = new Date(date as string);
    }

    let rankings: ReturnType<typeof demoStore.getDailyRanking> = [];
    let userRank = null;

    if (isDemoMode) {
      rankings = demoStore.getDailyRanking(targetDate, parseInt(limit as string));

      if (req.user) {
        const allRankings = demoStore.getDailyRanking(targetDate, 100);
        const userEntry = allRankings.find(r => r.userId === req.user!.id);
        if (userEntry) {
          userRank = {
            rank: userEntry.rank,
            score: userEntry.score,
            adjustedScore: userEntry.adjustedScore,
            distanceLabel: userEntry.distanceLabel,
          };
        }
      }
    } else {
      // TODO: Database implementation
      rankings = [];
    }

    const displayDate = targetDate || new Date();
    res.json({
      rankings,
      userRank,
      date: displayDate.toISOString().split('T')[0],
    });
  } catch (error) {
    console.error('Get daily ranking error:', error);
    res.status(500).json({ error: 'Failed to get daily rankings' });
  }
});

// Get score ranking (highest scores)
router.get('/scores', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const { limit = '50' } = req.query;

    let rankings;
    let userRank = null;

    if (isDemoMode) {
      rankings = demoStore.getScoreRankings().slice(0, parseInt(limit as string));

      if (req.user) {
        const userEntry = demoStore.getScoreRankings().find(r => r.userId === req.user!.id);
        if (userEntry) {
          userRank = {
            rank: userEntry.rank,
            highScore: userEntry.highScore,
          };
        }
      }
    } else {
      const { db, scoreLogs, users } = await import('../db/index.js');
      const { eq, sql } = await import('drizzle-orm');

      // Get highest scores per user
      rankings = await db
        .select({
          rank: sql<number>`RANK() OVER (ORDER BY MAX(${scoreLogs.score}) DESC)`.as('rank'),
          userId: users.id,
          userName: users.name,
          avatarUrl: users.avatarUrl,
          highScore: sql<number>`MAX(${scoreLogs.score})`.as('high_score'),
          maxScore: sql<number>`MAX(${scoreLogs.maxScore})`.as('max_score'),
          totalSessions: sql<number>`COUNT(DISTINCT ${scoreLogs.id})`.as('total_sessions'),
        })
        .from(scoreLogs)
        .innerJoin(users, eq(scoreLogs.userId, users.id))
        .groupBy(users.id, users.name, users.avatarUrl)
        .orderBy(sql`high_score DESC`)
        .limit(parseInt(limit as string));

      // Find current user's rank if authenticated
      if (req.user) {
        const userRankResult = await db
          .select({
            rank: sql<number>`(
              SELECT COUNT(DISTINCT u2.id) + 1
              FROM ${scoreLogs} s2
              INNER JOIN ${users} u2 ON s2.user_id = u2.id
              WHERE (SELECT MAX(s3.score) FROM ${scoreLogs} s3 WHERE s3.user_id = u2.id) >
                    (SELECT MAX(s4.score) FROM ${scoreLogs} s4 WHERE s4.user_id = ${req.user.id})
            )`.as('rank'),
            highScore: sql<number>`MAX(${scoreLogs.score})`.as('high_score'),
          })
          .from(scoreLogs)
          .where(eq(scoreLogs.userId, req.user.id));

        if (userRankResult[0] && userRankResult[0].highScore) {
          userRank = {
            rank: userRankResult[0].rank || 1,
            highScore: userRankResult[0].highScore,
          };
        }
      }
    }

    res.json({
      rankings,
      userRank,
    });
  } catch (error) {
    console.error('Get score ranking error:', error);
    res.status(500).json({ error: 'Failed to get rankings' });
  }
});

// Get best score ranking for archery rounds (練習ベスト / 試合ベスト)
router.get('/best-scores', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const { type = 'practice', distance, limit = '50' } = req.query;

    // type: 'practice' = personal + club, 'competition' = 試合のみ, 'all' = すべて
    const roundType = type as 'practice' | 'competition' | 'all';

    let rankings: ReturnType<typeof demoStore.getBestScoreRankings> = [];
    let userRank = null;

    if (isDemoMode) {
      rankings = demoStore.getBestScoreRankings(roundType, distance as string | undefined)
        .slice(0, parseInt(limit as string));

      if (req.user) {
        const allRankings = demoStore.getBestScoreRankings(roundType, distance as string | undefined);
        const userEntry = allRankings.find(r => r.userId === req.user!.id);
        if (userEntry) {
          userRank = {
            rank: userEntry.rank,
            bestScore: userEntry.bestScore,
            totalX: userEntry.totalX,
            distanceLabel: userEntry.distanceLabel,
          };
        }
      }
    } else {
      // TODO: Database implementation
      rankings = [];
    }

    res.json({
      rankings,
      userRank,
      type: roundType,
      distance: distance || null,
    });
  } catch (error) {
    console.error('Get best score ranking error:', error);
    res.status(500).json({ error: 'Failed to get best score rankings' });
  }
});

// Get practice volume ranking (arrows shot this month/week)
router.get('/practice', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const { period = 'month', limit = '50' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    if (period === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else {
      // month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    let rankings;
    let userRank = null;

    if (isDemoMode) {
      rankings = demoStore.getPracticeRankings(startDate).slice(0, parseInt(limit as string));

      if (req.user) {
        const userEntry = demoStore.getPracticeRankings(startDate).find(r => r.userId === req.user!.id);
        if (userEntry) {
          userRank = {
            rank: userEntry.rank,
            totalArrows: userEntry.totalArrows,
          };
        }
      }
    } else {
      const { db, scoreLogs, users } = await import('../db/index.js');
      const { eq, sql, and, gte } = await import('drizzle-orm');

      // Get total arrows shot per user in the period
      rankings = await db
        .select({
          rank: sql<number>`RANK() OVER (ORDER BY SUM(${scoreLogs.arrowsCount}) DESC)`.as('rank'),
          userId: users.id,
          userName: users.name,
          avatarUrl: users.avatarUrl,
          totalArrows: sql<number>`SUM(${scoreLogs.arrowsCount})`.as('total_arrows'),
          sessionCount: sql<number>`COUNT(DISTINCT ${scoreLogs.id})`.as('session_count'),
        })
        .from(scoreLogs)
        .innerJoin(users, eq(scoreLogs.userId, users.id))
        .where(gte(scoreLogs.date, startDate))
        .groupBy(users.id, users.name, users.avatarUrl)
        .orderBy(sql`total_arrows DESC`)
        .limit(parseInt(limit as string));

      // Find current user's rank if authenticated
      if (req.user) {
        const userStats = await db
          .select({
            totalArrows: sql<number>`SUM(${scoreLogs.arrowsCount})`.as('total_arrows'),
          })
          .from(scoreLogs)
          .where(
            and(
              eq(scoreLogs.userId, req.user.id),
              gte(scoreLogs.date, startDate)
            )
          );

        if (userStats[0] && userStats[0].totalArrows) {
          // Count users with more arrows
          const rankResult = await db
            .select({
              count: sql<number>`COUNT(DISTINCT ${users.id})`.as('count'),
            })
            .from(scoreLogs)
            .innerJoin(users, eq(scoreLogs.userId, users.id))
            .where(gte(scoreLogs.date, startDate))
            .groupBy(users.id)
            .having(sql`SUM(${scoreLogs.arrowsCount}) > ${userStats[0].totalArrows}`);

          userRank = {
            rank: rankResult.length + 1,
            totalArrows: userStats[0].totalArrows,
          };
        }
      }
    }

    res.json({
      rankings,
      userRank,
      period,
      startDate: startDate.toISOString().split('T')[0],
    });
  } catch (error) {
    console.error('Get practice ranking error:', error);
    res.status(500).json({ error: 'Failed to get rankings' });
  }
});

export default router;
