import { Router, type Response } from 'express';
import { demoStore, isDemoMode } from '../db/demo-store.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const auth = authMiddleware as any;

const router = Router();

// Helper: Convert score string to value
function scoreToValue(score: string): number {
  if (score === 'X') return 10;
  if (score === 'M') return 0;
  return parseInt(score) || 0;
}

// Helper: Calculate round stats
function calculateRoundStats(ends: { scores: { score: string; scoreValue: number }[] }[]) {
  let totalScore = 0;
  let totalX = 0;
  let total10 = 0;

  for (const end of ends) {
    for (const score of end.scores) {
      totalScore += score.scoreValue;
      if (score.score === 'X') {
        totalX++;
        total10++;
      } else if (score.score === '10') {
        total10++;
      }
    }
  }

  return { totalScore, totalX, total10 };
}

// ===== ROUNDS =====

// Get all rounds for user
router.get('/rounds', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 20;

    let rounds: ReturnType<typeof demoStore.getRoundsByUserId>;

    if (isDemoMode) {
      rounds = demoStore.getRoundsByUserId(userId, limit);
    } else {
      // TODO: Database implementation
      rounds = [];
    }

    res.json(rounds);
  } catch (error) {
    console.error('Get rounds error:', error);
    res.status(500).json({ error: 'Failed to get rounds' });
  }
});

// Get single round with all ends and scores
router.get('/rounds/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    let round;

    if (isDemoMode) {
      round = demoStore.findRoundById(parseInt(id));
    } else {
      // TODO: Database implementation
      round = null;
    }

    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    res.json(round);
  } catch (error) {
    console.error('Get round error:', error);
    res.status(500).json({ error: 'Failed to get round' });
  }
});

// Create new round
router.post('/rounds', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      distance = 18,
      distanceLabel,
      arrowsPerEnd = 6,
      totalEnds = 6,
      totalArrows = 36,
      roundType = 'personal',
      competitionName,
      location,
      startTime,
      condition,
      weather,
      concerns,
      memo
    } = req.body;

    // Validate competition name for competition rounds
    if (roundType === 'competition' && !competitionName) {
      return res.status(400).json({ error: '試合名は必須です' });
    }

    let round;

    if (isDemoMode) {
      round = demoStore.createRound({
        userId,
        date: new Date(),
        distance,
        distanceLabel: distanceLabel || null,
        arrowsPerEnd,
        totalEnds,
        totalArrows,
        roundType,
        competitionName: competitionName || null,
        location: location || null,
        startTime: startTime || null,
        condition: condition || null,
        weather: weather || null,
        concerns: concerns || null,
        totalScore: 0,
        totalX: 0,
        total10: 0,
        status: 'in_progress',
        memo: memo || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create all ends for the round
      for (let i = 1; i <= totalEnds; i++) {
        demoStore.createEnd({
          roundId: round.id,
          endNumber: i,
          totalScore: 0,
          createdAt: new Date(),
        });
      }

      // Return round with ends
      round = demoStore.findRoundById(round.id);
    } else {
      // TODO: Database implementation
      round = null;
    }

    res.status(201).json(round);
  } catch (error) {
    console.error('Create round error:', error);
    res.status(500).json({ error: 'Failed to create round' });
  }
});

// Update round (status, memo)
router.patch('/rounds/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, memo } = req.body;

    let round;

    if (isDemoMode) {
      round = demoStore.updateRound(parseInt(id), { status, memo });
      if (round) {
        round = demoStore.findRoundById(parseInt(id));
      }
    } else {
      // TODO: Database implementation
      round = null;
    }

    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    res.json(round);
  } catch (error) {
    console.error('Update round error:', error);
    res.status(500).json({ error: 'Failed to update round' });
  }
});

// Delete round
router.delete('/rounds/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (isDemoMode) {
      const deleted = demoStore.deleteRound(parseInt(id));
      if (!deleted) {
        return res.status(404).json({ error: 'Round not found' });
      }
    } else {
      // TODO: Database implementation
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete round error:', error);
    res.status(500).json({ error: 'Failed to delete round' });
  }
});

// ===== SCORES =====

// Add score to end
router.post('/ends/:endId/scores', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { endId } = req.params;
    const { arrowNumber, score, positionX, positionY } = req.body;

    if (!arrowNumber || !score) {
      return res.status(400).json({ error: 'arrowNumber and score are required' });
    }

    const scoreValue = scoreToValue(score);

    let newScore;
    let end;
    let round;

    if (isDemoMode) {
      // Check if end exists
      end = demoStore.findEndById(parseInt(endId));
      if (!end) {
        return res.status(404).json({ error: 'End not found' });
      }

      // Check if score already exists for this arrow
      const existingScore = demoStore.findArcheryScoreByEndAndArrow(parseInt(endId), arrowNumber);
      if (existingScore) {
        // Update existing score
        newScore = demoStore.updateArcheryScore(existingScore.id, {
          score,
          scoreValue,
          positionX: positionX ?? null,
          positionY: positionY ?? null,
        });
      } else {
        // Create new score
        newScore = demoStore.createArcheryScore({
          endId: parseInt(endId),
          arrowNumber,
          score,
          scoreValue,
          positionX: positionX ?? null,
          positionY: positionY ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Update end total
      end = demoStore.findEndById(parseInt(endId));
      if (end) {
        const endTotal = end.scores.reduce((sum, s) => sum + s.scoreValue, 0);
        demoStore.updateEnd(parseInt(endId), { totalScore: endTotal });
      }

      // Update round totals
      end = demoStore.findEndById(parseInt(endId));
      if (end) {
        round = demoStore.findRoundById(end.roundId);
        if (round) {
          const stats = calculateRoundStats(round.ends);
          demoStore.updateRound(round.id, stats);
          round = demoStore.findRoundById(round.id);
        }
      }
    } else {
      // TODO: Database implementation
    }

    res.json({
      score: newScore,
      end: demoStore.findEndById(parseInt(endId)),
      round,
    });
  } catch (error) {
    console.error('Add score error:', error);
    res.status(500).json({ error: 'Failed to add score' });
  }
});

// Update score
router.patch('/scores/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { score, positionX, positionY } = req.body;

    if (!score) {
      return res.status(400).json({ error: 'score is required' });
    }

    const scoreValue = scoreToValue(score);

    let updatedScore;
    let end;
    let round;

    if (isDemoMode) {
      const existingScore = demoStore.findArcheryScoreById(parseInt(id));
      if (!existingScore) {
        return res.status(404).json({ error: 'Score not found' });
      }

      updatedScore = demoStore.updateArcheryScore(parseInt(id), {
        score,
        scoreValue,
        positionX: positionX ?? existingScore.positionX,
        positionY: positionY ?? existingScore.positionY,
      });

      // Update end total
      end = demoStore.findEndById(existingScore.endId);
      if (end) {
        const endTotal = end.scores.reduce((sum, s) => sum + s.scoreValue, 0);
        demoStore.updateEnd(existingScore.endId, { totalScore: endTotal });

        // Update round totals
        round = demoStore.findRoundById(end.roundId);
        if (round) {
          const stats = calculateRoundStats(round.ends);
          demoStore.updateRound(round.id, stats);
          round = demoStore.findRoundById(round.id);
        }
      }
    } else {
      // TODO: Database implementation
    }

    res.json({
      score: updatedScore,
      end,
      round,
    });
  } catch (error) {
    console.error('Update score error:', error);
    res.status(500).json({ error: 'Failed to update score' });
  }
});

// Delete score (undo)
router.delete('/scores/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    let end;
    let round;

    if (isDemoMode) {
      const existingScore = demoStore.findArcheryScoreById(parseInt(id));
      if (!existingScore) {
        return res.status(404).json({ error: 'Score not found' });
      }

      const endId = existingScore.endId;
      demoStore.deleteArcheryScore(parseInt(id));

      // Update end total
      end = demoStore.findEndById(endId);
      if (end) {
        const endTotal = end.scores.reduce((sum, s) => sum + s.scoreValue, 0);
        demoStore.updateEnd(endId, { totalScore: endTotal });

        // Update round totals
        round = demoStore.findRoundById(end.roundId);
        if (round) {
          const stats = calculateRoundStats(round.ends);
          demoStore.updateRound(round.id, stats);
          round = demoStore.findRoundById(round.id);
        }
      }
    } else {
      // TODO: Database implementation
    }

    res.json({
      success: true,
      end,
      round,
    });
  } catch (error) {
    console.error('Delete score error:', error);
    res.status(500).json({ error: 'Failed to delete score' });
  }
});

// Complete round
router.post('/rounds/:id/complete', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    let round;

    if (isDemoMode) {
      round = demoStore.findRoundById(parseInt(id));
      if (!round) {
        return res.status(404).json({ error: 'Round not found' });
      }

      // Calculate final stats
      const stats = calculateRoundStats(round.ends);
      demoStore.updateRound(parseInt(id), {
        ...stats,
        status: 'completed',
      });

      round = demoStore.findRoundById(parseInt(id));
    } else {
      // TODO: Database implementation
    }

    res.json(round);
  } catch (error) {
    console.error('Complete round error:', error);
    res.status(500).json({ error: 'Failed to complete round' });
  }
});

export default router;
