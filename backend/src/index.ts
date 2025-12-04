import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.js';
import scoresRoutes from './routes/scores.js';
import coachesRoutes from './routes/coaches.js';
import chatRoutes from './routes/chat.js';
import equipmentRoutes from './routes/equipment.js';
import rankingsRoutes from './routes/rankings.js';
import teachingRoutes from './routes/teaching.js';
import archeryRoutes from './routes/archery.js';
import memosRoutes from './routes/memos.js';
import teamsRoutes from './routes/teams.js';
import adminRoutes from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || true, // true allows same-origin requests in production
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/scores', scoresRoutes);
app.use('/api/coaches', coachesRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/rankings', rankingsRoutes);
app.use('/api/teaching', teachingRoutes);
app.use('/api/archery', archeryRoutes);
app.use('/api/memos', memosRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/admin', adminRoutes);

// Serve static files from frontend build
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

// Serve uploaded files
const uploadsDir = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/') || req.path === '/health') {
    return next();
  }
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Run startup migrations
async function runStartupMigrations() {
  try {
    // Only run in production mode
    if (process.env.NODE_ENV === 'production' || process.env.DB_HOST) {
      const { db, coaches } = await import('./db/index.js');
      const { eq, sql } = await import('drizzle-orm');

      // Add new auth columns if they don't exist
      // password column for email authentication
      try {
        await db.execute(sql`ALTER TABLE users ADD COLUMN password VARCHAR(255)`);
        console.log('✅ Added password column');
      } catch (e: unknown) {
        const err = e as { code?: string };
        if (err.code !== 'ER_DUP_FIELDNAME') {
          console.log('ℹ️ password column already exists or error:', err.code);
        }
      }

      // is_admin column for admin functionality
      try {
        await db.execute(sql`ALTER TABLE users ADD COLUMN is_admin INT NOT NULL DEFAULT 0`);
        console.log('✅ Added is_admin column');
      } catch (e: unknown) {
        const err = e as { code?: string };
        if (err.code !== 'ER_DUP_FIELDNAME') {
          console.log('ℹ️ is_admin column already exists or error:', err.code);
        }
      }

      // auth_provider column to track login method
      try {
        await db.execute(sql`ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'google'`);
        console.log('✅ Added auth_provider column');
      } catch (e: unknown) {
        const err = e as { code?: string };
        if (err.code !== 'ER_DUP_FIELDNAME') {
          console.log('ℹ️ auth_provider column already exists or error:', err.code);
        }
      }

      // Update coach name from キム・チョンテ to Kim Chung Tae
      await db.update(coaches)
        .set({ name: 'Kim Chung Tae' })
        .where(eq(coaches.name, 'キム・チョンテ'));

      console.log('✅ Startup migrations completed');
    }
  } catch (error) {
    console.error('⚠️ Startup migration error (non-fatal):', error);
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`🏹 D2 Archery running on http://localhost:${PORT}`);
  await runStartupMigrations();
});

export default app;
