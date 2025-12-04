import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import type { AuthRequest } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { demoStore, isDemoMode } from '../db/demo-store.js';

const router = Router();
const SALT_ROUNDS = 10;

const SESSION_SECRET = process.env.SESSION_SECRET || 'demo-secret-key-change-in-production';

// Get demo users list (for demo login selection)
router.get('/demo-users', async (_req, res) => {
  try {
    if (!isDemoMode) {
      return res.status(403).json({ error: 'Demo users are only available in demo mode' });
    }

    const users = demoStore.getUsers();
    res.json(users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      affiliation: user.affiliation,
      nickname: user.nickname,
    })));
  } catch (error) {
    console.error('Get demo users error:', error);
    res.status(500).json({ error: 'Failed to get demo users' });
  }
});

// Demo login (for development/testing only)
router.post('/demo-login', async (req, res) => {
  try {
    if (!isDemoMode) {
      return res.status(403).json({ error: 'Demo login is only available in demo mode' });
    }

    const { userId } = req.body;

    // Get user by ID or default to first user
    const users = demoStore.getUsers();
    let user;

    if (userId) {
      user = users.find(u => u.id === userId);
    }

    if (!user) {
      user = users[0];
    }

    if (!user) {
      return res.status(500).json({ error: 'No demo users available' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        language: user.language,
      },
      SESSION_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        language: user.language,
      },
    });
  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({ error: 'Demo login failed' });
  }
});

// Google OAuth callback
router.post('/google', async (req, res) => {
  try {
    const { googleId, email, name, avatarUrl, language = 'ja' } = req.body;

    if (!googleId || !email || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let user;

    if (isDemoMode) {
      // Demo mode: use in-memory store
      user = demoStore.findUserByGoogleId(googleId);
      if (!user) {
        user = demoStore.createUser({
          googleId,
          email,
          name,
          avatarUrl: avatarUrl || null,
          password: null,
          isAdmin: 0,
          authProvider: 'google',
          language: language as 'ja' | 'en',
          gender: null,
          affiliation: null,
          nickname: null,
          bestScores: null,
          mastersRating: 0,
          mastersRank: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        user = demoStore.updateUser(user.id, {
          email,
          name,
          avatarUrl: avatarUrl || null,
          updatedAt: new Date(),
        });
      }
    } else {
      // Production mode: use database
      const { db, users } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');

      user = await db.query.users.findFirst({
        where: eq(users.googleId, googleId),
      });

      if (!user) {
        const result = await db.insert(users).values({
          googleId,
          email,
          name,
          avatarUrl,
          language: language as 'ja' | 'en',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        user = await db.query.users.findFirst({
          where: eq(users.id, Number(result[0].insertId)),
        });
      } else {
        await db
          .update(users)
          .set({
            email,
            name,
            avatarUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));

        user = await db.query.users.findFirst({
          where: eq(users.id, user.id),
        });
      }
    }

    if (!user) {
      return res.status(500).json({ error: 'Failed to create/find user' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        language: user.language,
      },
      SESSION_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        language: user.language,
      },
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Email registration
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, language = 'ja' } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'メールアドレス、パスワード、名前は必須です' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'パスワードは6文字以上必要です' });
    }

    if (isDemoMode) {
      return res.status(403).json({ error: 'デモモードではメール登録は利用できません' });
    }

    const { db, users } = await import('../db/index.js');
    const { eq } = await import('drizzle-orm');

    // Check if email already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const result = await db.insert(users).values({
      email,
      password: hashedPassword,
      name,
      language: language as 'ja' | 'en',
      authProvider: 'email',
      isAdmin: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const user = await db.query.users.findFirst({
      where: eq(users.id, Number(result[0].insertId)),
    });

    if (!user) {
      return res.status(500).json({ error: 'ユーザー作成に失敗しました' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        language: user.language,
      },
      SESSION_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        language: user.language,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: '登録に失敗しました' });
  }
});

// Email login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'メールアドレスとパスワードは必須です' });
    }

    if (isDemoMode) {
      return res.status(403).json({ error: 'デモモードではメールログインは利用できません' });
    }

    const { db, users } = await import('../db/index.js');
    const { eq } = await import('drizzle-orm');

    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
    }

    // Check if user registered with email (has password)
    if (!user.password) {
      return res.status(401).json({ error: 'このアカウントはGoogleでログインしてください' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        language: user.language,
      },
      SESSION_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        language: user.language,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'ログインに失敗しました' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    let user;

    if (isDemoMode) {
      user = demoStore.findUserById(req.user!.id);
    } else {
      const { db, users } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');
      user = await db.query.users.findFirst({
        where: eq(users.id, req.user!.id),
      });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Parse bestScores JSON
    let bestScores = null;
    try {
      const bestScoresStr = (user as any).bestScores;
      if (bestScoresStr) {
        bestScores = JSON.parse(bestScoresStr);
      }
    } catch (e) {
      // Invalid JSON, ignore
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      language: user.language,
      gender: (user as any).gender,
      affiliation: (user as any).affiliation,
      nickname: (user as any).nickname,
      bestScores,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user settings
router.patch('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, language, gender, affiliation, nickname, bestScores } = req.body;
    let user;

    if (isDemoMode) {
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (name !== undefined) updateData.name = name;
      if (language && ['ja', 'en'].includes(language)) updateData.language = language;
      if (gender !== undefined) updateData.gender = gender || null;
      if (affiliation !== undefined) updateData.affiliation = affiliation || null;
      if (nickname !== undefined) updateData.nickname = nickname || null;
      if (bestScores !== undefined) {
        updateData.bestScores = bestScores ? JSON.stringify(bestScores) : null;
      }

      user = demoStore.updateUser(req.user!.id, updateData);
    } else {
      const { db, users } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (name !== undefined) updateData.name = name;
      if (language && ['ja', 'en'].includes(language)) updateData.language = language;
      if (gender !== undefined) updateData.gender = gender || null;
      if (affiliation !== undefined) updateData.affiliation = affiliation || null;
      if (nickname !== undefined) updateData.nickname = nickname || null;
      if (bestScores !== undefined) {
        updateData.bestScores = bestScores ? JSON.stringify(bestScores) : null;
      }

      await db.update(users).set(updateData).where(eq(users.id, req.user!.id));

      user = await db.query.users.findFirst({
        where: eq(users.id, req.user!.id),
      });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Parse bestScores JSON for response
    let parsedBestScores = null;
    try {
      const bestScoresStr = (user as any).bestScores;
      if (bestScoresStr) {
        parsedBestScores = JSON.parse(bestScoresStr);
      }
    } catch (e) {
      // Invalid JSON, ignore
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      language: user.language,
      gender: (user as any).gender,
      affiliation: (user as any).affiliation,
      nickname: (user as any).nickname,
      bestScores: parsedBestScores,
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

export default router;
