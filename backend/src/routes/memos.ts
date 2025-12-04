import { Router } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { demoStore, isDemoMode } from '../db/demo-store.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  },
});

// Get all memos for current user
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { limit = '50', date } = req.query;
    let memos;

    if (isDemoMode) {
      memos = demoStore.getMemosByUserId(req.user!.id, parseInt(limit as string));
      if (date) {
        const targetDate = (date as string).split('T')[0];
        memos = memos.filter(m => {
          const memoDate = new Date(m.date).toISOString().split('T')[0];
          return memoDate === targetDate;
        });
      }
    } else {
      const { db, practiceMemos } = await import('../db/index.js');
      const { eq, desc, and } = await import('drizzle-orm');

      if (date) {
        const targetDate = new Date(date as string);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const { gte, lt } = await import('drizzle-orm');
        memos = await db.query.practiceMemos.findMany({
          where: and(
            eq(practiceMemos.userId, req.user!.id),
            gte(practiceMemos.date, targetDate),
            lt(practiceMemos.date, nextDay)
          ),
          orderBy: [desc(practiceMemos.date)],
          limit: parseInt(limit as string),
        });
      } else {
        memos = await db.query.practiceMemos.findMany({
          where: eq(practiceMemos.userId, req.user!.id),
          orderBy: [desc(practiceMemos.date)],
          limit: parseInt(limit as string),
        });
      }
    }

    res.json(memos);
  } catch (error) {
    console.error('Get memos error:', error);
    res.status(500).json({ error: 'Failed to get memos' });
  }
});

// Upload media file
router.post('/upload', authMiddleware, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const isVideo = file.mimetype.startsWith('video/');
    const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
    const fileUrl = `${baseUrl}/uploads/${file.filename}`;

    res.json({
      url: fileUrl,
      type: isVideo ? 'video' : 'image',
      fileName: file.originalname,
      size: file.size,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Create new memo
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { date, content, condition, weather, location, media } = req.body;

    if (!date || !content) {
      return res.status(400).json({ error: 'Missing required fields (date, content)' });
    }

    let newMemo;

    if (isDemoMode) {
      newMemo = demoStore.createMemo({
        userId: req.user!.id,
        date: new Date(date),
        content,
        condition: condition || null,
        weather: weather || null,
        location: location || null,
        media: media ? JSON.stringify(media) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      const { db, practiceMemos } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');
      const result = await db.insert(practiceMemos).values({
        userId: req.user!.id,
        date: new Date(date),
        content,
        condition: condition || null,
        weather: weather || null,
        location: location || null,
        media: media ? JSON.stringify(media) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      newMemo = await db.query.practiceMemos.findFirst({
        where: eq(practiceMemos.id, Number(result[0].insertId)),
      });
    }

    res.status(201).json(newMemo);
  } catch (error) {
    console.error('Create memo error:', error);
    res.status(500).json({ error: 'Failed to create memo' });
  }
});

// Update memo
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { date, content, condition, weather, location, media } = req.body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (date) updateData.date = new Date(date);
    if (content !== undefined) updateData.content = content;
    if (condition !== undefined) updateData.condition = condition;
    if (weather !== undefined) updateData.weather = weather;
    if (location !== undefined) updateData.location = location;
    if (media !== undefined) updateData.media = media ? JSON.stringify(media) : null;

    let updated;

    if (isDemoMode) {
      const existing = demoStore.findMemoById(parseInt(id));
      if (!existing || existing.userId !== req.user!.id) {
        return res.status(404).json({ error: 'Memo not found' });
      }
      updated = demoStore.updateMemo(parseInt(id), updateData);
    } else {
      const { db, practiceMemos } = await import('../db/index.js');
      const { eq, and } = await import('drizzle-orm');

      const existing = await db.query.practiceMemos.findFirst({
        where: and(eq(practiceMemos.id, parseInt(id)), eq(practiceMemos.userId, req.user!.id)),
      });

      if (!existing) {
        return res.status(404).json({ error: 'Memo not found' });
      }

      await db.update(practiceMemos).set(updateData).where(eq(practiceMemos.id, parseInt(id)));
      updated = await db.query.practiceMemos.findFirst({
        where: eq(practiceMemos.id, parseInt(id)),
      });
    }

    res.json(updated);
  } catch (error) {
    console.error('Update memo error:', error);
    res.status(500).json({ error: 'Failed to update memo' });
  }
});

// Delete memo
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (isDemoMode) {
      const existing = demoStore.findMemoById(parseInt(id));
      if (!existing || existing.userId !== req.user!.id) {
        return res.status(404).json({ error: 'Memo not found' });
      }
      demoStore.deleteMemo(parseInt(id));
    } else {
      const { db, practiceMemos } = await import('../db/index.js');
      const { eq, and } = await import('drizzle-orm');

      const existing = await db.query.practiceMemos.findFirst({
        where: and(eq(practiceMemos.id, parseInt(id)), eq(practiceMemos.userId, req.user!.id)),
      });

      if (!existing) {
        return res.status(404).json({ error: 'Memo not found' });
      }

      await db.delete(practiceMemos).where(eq(practiceMemos.id, parseInt(id)));
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete memo error:', error);
    res.status(500).json({ error: 'Failed to delete memo' });
  }
});

export default router;
