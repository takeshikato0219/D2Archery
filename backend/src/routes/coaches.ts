import { Router } from 'express';
import { demoStore, isDemoMode } from '../db/demo-store.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Setup multer for coach avatar uploads
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/coach-avatars');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'coach-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

// Get all coaches
router.get('/', async (req, res) => {
  try {
    let allCoaches;

    if (isDemoMode) {
      allCoaches = demoStore.getCoaches();
    } else {
      const { db } = await import('../db/index.js');
      allCoaches = await db.query.coaches.findMany();
    }

    res.json(allCoaches);
  } catch (error) {
    console.error('Get coaches error:', error);
    res.status(500).json({ error: 'Failed to get coaches' });
  }
});

// Get single coach
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let coach;

    if (isDemoMode) {
      coach = demoStore.findCoachById(parseInt(id));
    } else {
      const { db, coaches } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');
      coach = await db.query.coaches.findFirst({
        where: eq(coaches.id, parseInt(id)),
      });
    }

    if (!coach) {
      return res.status(404).json({ error: 'Coach not found' });
    }

    res.json(coach);
  } catch (error) {
    console.error('Get coach error:', error);
    res.status(500).json({ error: 'Failed to get coach' });
  }
});

// Update coach (teaching philosophy, system prompt, etc.)
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      nameEn,
      personality,
      personalityEn,
      systemPrompt,
      systemPromptEn,
      teachingPhilosophy,
      teachingPhilosophyEn,
      baseRules,
      baseRulesEn,
      speakingTone,
      speakingToneEn,
      recommendations,
      recommendationsEn,
      greetings,
      greetingsEn,
      specialty,
      specialtyEn,
      color,
    } = req.body;

    let updatedCoach;

    if (isDemoMode) {
      updatedCoach = demoStore.updateCoach(parseInt(id), {
        name,
        nameEn,
        personality,
        personalityEn,
        systemPrompt,
        systemPromptEn,
        teachingPhilosophy,
        teachingPhilosophyEn,
        baseRules,
        baseRulesEn,
        speakingTone,
        speakingToneEn,
        recommendations,
        recommendationsEn,
        greetings,
        greetingsEn,
        specialty,
        specialtyEn,
        color,
        updatedAt: new Date(),
      });

      if (!updatedCoach) {
        return res.status(404).json({ error: 'Coach not found' });
      }
    } else {
      const { db, coaches } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');

      await db.update(coaches)
        .set({
          name,
          nameEn,
          personality,
          personalityEn,
          systemPrompt,
          systemPromptEn,
          teachingPhilosophy,
          teachingPhilosophyEn,
          baseRules,
          baseRulesEn,
          speakingTone,
          speakingToneEn,
          recommendations,
          recommendationsEn,
          greetings,
          greetingsEn,
          specialty,
          specialtyEn,
          color,
          updatedAt: new Date(),
        })
        .where(eq(coaches.id, parseInt(id)));

      updatedCoach = await db.query.coaches.findFirst({
        where: eq(coaches.id, parseInt(id)),
      });
    }

    res.json(updatedCoach);
  } catch (error) {
    console.error('Update coach error:', error);
    res.status(500).json({ error: 'Failed to update coach' });
  }
});

// Update only teaching philosophy
router.patch('/:id/philosophy', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { teachingPhilosophy, teachingPhilosophyEn } = req.body;

    let updatedCoach;

    if (isDemoMode) {
      updatedCoach = demoStore.updateCoach(parseInt(id), {
        teachingPhilosophy,
        teachingPhilosophyEn,
        updatedAt: new Date(),
      });

      if (!updatedCoach) {
        return res.status(404).json({ error: 'Coach not found' });
      }
    } else {
      const { db, coaches } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');

      await db.update(coaches)
        .set({
          teachingPhilosophy,
          teachingPhilosophyEn,
          updatedAt: new Date(),
        })
        .where(eq(coaches.id, parseInt(id)));

      updatedCoach = await db.query.coaches.findFirst({
        where: eq(coaches.id, parseInt(id)),
      });
    }

    res.json(updatedCoach);
  } catch (error) {
    console.error('Update philosophy error:', error);
    res.status(500).json({ error: 'Failed to update philosophy' });
  }
});

// Update base rules (prohibited items, etc.)
router.patch('/:id/rules', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { baseRules, baseRulesEn } = req.body;

    let updatedCoach;

    if (isDemoMode) {
      updatedCoach = demoStore.updateCoach(parseInt(id), {
        baseRules,
        baseRulesEn,
        updatedAt: new Date(),
      });

      if (!updatedCoach) {
        return res.status(404).json({ error: 'Coach not found' });
      }
    } else {
      const { db, coaches } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');

      await db.update(coaches)
        .set({
          baseRules,
          baseRulesEn,
          updatedAt: new Date(),
        })
        .where(eq(coaches.id, parseInt(id)));

      updatedCoach = await db.query.coaches.findFirst({
        where: eq(coaches.id, parseInt(id)),
      });
    }

    res.json(updatedCoach);
  } catch (error) {
    console.error('Update rules error:', error);
    res.status(500).json({ error: 'Failed to update rules' });
  }
});

// Update system prompt (AI behavior)
router.patch('/:id/prompt', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { systemPrompt, systemPromptEn } = req.body;

    let updatedCoach;

    if (isDemoMode) {
      updatedCoach = demoStore.updateCoach(parseInt(id), {
        systemPrompt,
        systemPromptEn,
        updatedAt: new Date(),
      });

      if (!updatedCoach) {
        return res.status(404).json({ error: 'Coach not found' });
      }
    } else {
      const { db, coaches } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');

      await db.update(coaches)
        .set({
          systemPrompt,
          systemPromptEn,
          updatedAt: new Date(),
        })
        .where(eq(coaches.id, parseInt(id)));

      updatedCoach = await db.query.coaches.findFirst({
        where: eq(coaches.id, parseInt(id)),
      });
    }

    res.json(updatedCoach);
  } catch (error) {
    console.error('Update prompt error:', error);
    res.status(500).json({ error: 'Failed to update prompt' });
  }
});

// Update coach details (tone, recommendations, greetings)
router.patch('/:id/details', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { speakingTone, speakingToneEn, recommendations, recommendationsEn, greetings, greetingsEn } = req.body;

    let updatedCoach;

    if (isDemoMode) {
      updatedCoach = demoStore.updateCoach(parseInt(id), {
        speakingTone,
        speakingToneEn,
        recommendations,
        recommendationsEn,
        greetings,
        greetingsEn,
        updatedAt: new Date(),
      });

      if (!updatedCoach) {
        return res.status(404).json({ error: 'Coach not found' });
      }
    } else {
      const { db, coaches } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');

      await db.update(coaches)
        .set({
          speakingTone,
          speakingToneEn,
          recommendations,
          recommendationsEn,
          greetings,
          greetingsEn,
          updatedAt: new Date(),
        })
        .where(eq(coaches.id, parseInt(id)));

      updatedCoach = await db.query.coaches.findFirst({
        where: eq(coaches.id, parseInt(id)),
      });
    }

    res.json(updatedCoach);
  } catch (error) {
    console.error('Update details error:', error);
    res.status(500).json({ error: 'Failed to update details' });
  }
});

// Update coach basic info (name, specialty, color)
router.patch('/:id/basic', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, nameEn, specialty, specialtyEn, color } = req.body;

    let updatedCoach;

    if (isDemoMode) {
      updatedCoach = demoStore.updateCoach(parseInt(id), {
        name,
        nameEn,
        specialty,
        specialtyEn,
        color,
        updatedAt: new Date(),
      });

      if (!updatedCoach) {
        return res.status(404).json({ error: 'Coach not found' });
      }
    } else {
      const { db, coaches } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');

      await db.update(coaches)
        .set({
          name,
          nameEn,
          specialty,
          specialtyEn,
          color,
          updatedAt: new Date(),
        })
        .where(eq(coaches.id, parseInt(id)));

      updatedCoach = await db.query.coaches.findFirst({
        where: eq(coaches.id, parseInt(id)),
      });
    }

    res.json(updatedCoach);
  } catch (error) {
    console.error('Update basic info error:', error);
    res.status(500).json({ error: 'Failed to update basic info' });
  }
});

// Update personality settings (strict/gentle, formal/casual, etc.)
router.patch('/:id/personality-settings', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { personalitySettings, personalitySettingsEn } = req.body;

    let updatedCoach;

    if (isDemoMode) {
      updatedCoach = demoStore.updateCoach(parseInt(id), {
        personalitySettings,
        personalitySettingsEn,
        updatedAt: new Date(),
      });

      if (!updatedCoach) {
        return res.status(404).json({ error: 'Coach not found' });
      }
    } else {
      const { db, coaches } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');

      await db.update(coaches)
        .set({
          personalitySettings,
          personalitySettingsEn,
          updatedAt: new Date(),
        })
        .where(eq(coaches.id, parseInt(id)));

      updatedCoach = await db.query.coaches.findFirst({
        where: eq(coaches.id, parseInt(id)),
      });
    }

    res.json(updatedCoach);
  } catch (error) {
    console.error('Update personality settings error:', error);
    res.status(500).json({ error: 'Failed to update personality settings' });
  }
});

// Update response style (answer length, emoji usage, bullet points, etc.)
router.patch('/:id/response-style', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { responseStyle, responseStyleEn } = req.body;

    let updatedCoach;

    if (isDemoMode) {
      updatedCoach = demoStore.updateCoach(parseInt(id), {
        responseStyle,
        responseStyleEn,
        updatedAt: new Date(),
      });

      if (!updatedCoach) {
        return res.status(404).json({ error: 'Coach not found' });
      }
    } else {
      const { db, coaches } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');

      await db.update(coaches)
        .set({
          responseStyle,
          responseStyleEn,
          updatedAt: new Date(),
        })
        .where(eq(coaches.id, parseInt(id)));

      updatedCoach = await db.query.coaches.findFirst({
        where: eq(coaches.id, parseInt(id)),
      });
    }

    res.json(updatedCoach);
  } catch (error) {
    console.error('Update response style error:', error);
    res.status(500).json({ error: 'Failed to update response style' });
  }
});

// Update knowledge scope (allowed topics)
router.patch('/:id/knowledge-scope', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { knowledgeScope, knowledgeScopeEn } = req.body;

    let updatedCoach;

    if (isDemoMode) {
      updatedCoach = demoStore.updateCoach(parseInt(id), {
        knowledgeScope,
        knowledgeScopeEn,
        updatedAt: new Date(),
      });

      if (!updatedCoach) {
        return res.status(404).json({ error: 'Coach not found' });
      }
    } else {
      const { db, coaches } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');

      await db.update(coaches)
        .set({
          knowledgeScope,
          knowledgeScopeEn,
          updatedAt: new Date(),
        })
        .where(eq(coaches.id, parseInt(id)));

      updatedCoach = await db.query.coaches.findFirst({
        where: eq(coaches.id, parseInt(id)),
      });
    }

    res.json(updatedCoach);
  } catch (error) {
    console.error('Update knowledge scope error:', error);
    res.status(500).json({ error: 'Failed to update knowledge scope' });
  }
});

// Upload coach avatar
router.post('/:id/avatar', authMiddleware, upload.single('avatar'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const avatarUrl = `/uploads/coach-avatars/${file.filename}`;
    let updatedCoach;

    if (isDemoMode) {
      updatedCoach = demoStore.updateCoach(parseInt(id), {
        avatarUrl,
        updatedAt: new Date(),
      });

      if (!updatedCoach) {
        // Delete uploaded file if coach not found
        await fs.unlink(file.path).catch(() => {});
        return res.status(404).json({ error: 'Coach not found' });
      }
    } else {
      const { db, coaches } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');

      // Get existing coach to check for old avatar
      const existingCoach = await db.query.coaches.findFirst({
        where: eq(coaches.id, parseInt(id)),
      });

      if (!existingCoach) {
        await fs.unlink(file.path).catch(() => {});
        return res.status(404).json({ error: 'Coach not found' });
      }

      // Delete old avatar if exists
      if (existingCoach.avatarUrl) {
        const oldAvatarPath = path.join(__dirname, '../..', existingCoach.avatarUrl);
        await fs.unlink(oldAvatarPath).catch(() => {});
      }

      await db.update(coaches)
        .set({
          avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(coaches.id, parseInt(id)));

      updatedCoach = await db.query.coaches.findFirst({
        where: eq(coaches.id, parseInt(id)),
      });
    }

    res.json(updatedCoach);
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Delete coach avatar
router.delete('/:id/avatar', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    let updatedCoach;

    if (isDemoMode) {
      const coach = demoStore.findCoachById(parseInt(id));
      if (!coach) {
        return res.status(404).json({ error: 'Coach not found' });
      }

      // Delete avatar file if exists
      if (coach.avatarUrl) {
        const avatarPath = path.join(__dirname, '../..', coach.avatarUrl);
        await fs.unlink(avatarPath).catch(() => {});
      }

      updatedCoach = demoStore.updateCoach(parseInt(id), {
        avatarUrl: null,
        updatedAt: new Date(),
      });
    } else {
      const { db, coaches } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');

      const existingCoach = await db.query.coaches.findFirst({
        where: eq(coaches.id, parseInt(id)),
      });

      if (!existingCoach) {
        return res.status(404).json({ error: 'Coach not found' });
      }

      // Delete avatar file if exists
      if (existingCoach.avatarUrl) {
        const avatarPath = path.join(__dirname, '../..', existingCoach.avatarUrl);
        await fs.unlink(avatarPath).catch(() => {});
      }

      await db.update(coaches)
        .set({
          avatarUrl: null,
          updatedAt: new Date(),
        })
        .where(eq(coaches.id, parseInt(id)));

      updatedCoach = await db.query.coaches.findFirst({
        where: eq(coaches.id, parseInt(id)),
      });
    }

    res.json(updatedCoach);
  } catch (error) {
    console.error('Delete avatar error:', error);
    res.status(500).json({ error: 'Failed to delete avatar' });
  }
});

export default router;
