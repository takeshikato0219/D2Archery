import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

console.log('🏹 Starting D2 Archery server...');

// Import routes
console.log('📦 Loading routes...');
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
console.log('✅ Routes loaded');

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

// Helper function to check if table exists
async function tableExists(db: any, tableName: string): Promise<boolean> {
  const { sql } = await import('drizzle-orm');
  const result = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = ${tableName}
  `);
  return result[0]?.[0]?.count > 0;
}

// Helper function to check if column exists
async function columnExists(db: any, tableName: string, columnName: string): Promise<boolean> {
  const { sql } = await import('drizzle-orm');
  const result = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = ${tableName}
    AND COLUMN_NAME = ${columnName}
  `);
  return result[0]?.[0]?.count > 0;
}

// Run startup migrations
async function runStartupMigrations() {
  try {
    // Only run in production mode
    if (process.env.NODE_ENV === 'production' || process.env.DB_HOST) {
      const { db, coaches } = await import('./db/index.js');
      const { eq, sql } = await import('drizzle-orm');

      console.log('🔄 Running startup migrations...');

      // Check if users table has the email column (if it exists but is broken, drop it)
      if (await tableExists(db, 'users')) {
        const hasEmail = await columnExists(db, 'users', 'email');
        if (!hasEmail) {
          console.log('⚠️ Users table exists but is missing email column. Dropping and recreating...');
          await db.execute(sql`DROP TABLE IF EXISTS users`);
        }
      }

      // Create users table if it doesn't exist
      if (!await tableExists(db, 'users')) {
        console.log('📦 Creating users table...');
        await db.execute(sql`
          CREATE TABLE users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            email VARCHAR(255) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            avatar_url VARCHAR(500),
            google_id VARCHAR(255) UNIQUE,
            password VARCHAR(255),
            is_admin INT NOT NULL DEFAULT 0,
            auth_provider ENUM('google', 'email') NOT NULL DEFAULT 'google',
            language ENUM('ja', 'en') NOT NULL DEFAULT 'ja',
            gender ENUM('male', 'female', 'other'),
            affiliation VARCHAR(255),
            nickname VARCHAR(100),
            best_scores TEXT,
            masters_rating INT DEFAULT 0,
            masters_rank INT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX email_idx (email),
            INDEX google_id_idx (google_id)
          )
        `);
        console.log('✅ Created users table');
      } else {
        console.log('ℹ️ users table already exists');

        // Add password column for email authentication
        if (!await columnExists(db, 'users', 'password')) {
          await db.execute(sql`ALTER TABLE users ADD COLUMN password VARCHAR(255)`);
          console.log('✅ Added password column');
        }

        // Add is_admin column for admin functionality
        if (!await columnExists(db, 'users', 'is_admin')) {
          await db.execute(sql`ALTER TABLE users ADD COLUMN is_admin INT NOT NULL DEFAULT 0`);
          console.log('✅ Added is_admin column');
        }

        // Add auth_provider column to track login method
        if (!await columnExists(db, 'users', 'auth_provider')) {
          await db.execute(sql`ALTER TABLE users ADD COLUMN auth_provider ENUM('google', 'email') NOT NULL DEFAULT 'google'`);
          console.log('✅ Added auth_provider column');
        }
      }

      // Create coaches table if it doesn't exist
      if (!await tableExists(db, 'coaches')) {
        console.log('📦 Creating coaches table...');
        await db.execute(sql`
          CREATE TABLE coaches (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            name_en VARCHAR(255) NOT NULL,
            personality TEXT NOT NULL,
            personality_en TEXT NOT NULL,
            system_prompt TEXT NOT NULL,
            system_prompt_en TEXT NOT NULL,
            teaching_philosophy TEXT,
            teaching_philosophy_en TEXT,
            base_rules TEXT,
            base_rules_en TEXT,
            speaking_tone TEXT,
            speaking_tone_en TEXT,
            recommendations TEXT,
            recommendations_en TEXT,
            greetings TEXT,
            greetings_en TEXT,
            personality_settings TEXT,
            personality_settings_en TEXT,
            response_style TEXT,
            response_style_en TEXT,
            knowledge_scope TEXT,
            knowledge_scope_en TEXT,
            specialty VARCHAR(255) NOT NULL,
            specialty_en VARCHAR(255) NOT NULL,
            avatar_url VARCHAR(500),
            color VARCHAR(7) DEFAULT '#3B82F6',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        console.log('✅ Created coaches table');
      }

      // Update coach name from キム・チョンテ to Kim Chung Tae
      try {
        await db.update(coaches)
          .set({ name: 'Kim Chung Tae' })
          .where(eq(coaches.name, 'キム・チョンテ'));
      } catch (e) {
        // Ignore error if coaches table is empty
      }

      console.log('✅ Startup migrations completed');
    }
  } catch (error) {
    console.error('⚠️ Startup migration error (non-fatal):', error);
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`🏹 D2 Archery running on port ${PORT}`);
  console.log(`📁 __dirname: ${__dirname}`);
  console.log(`📁 Frontend dist path: ${path.join(__dirname, '../../frontend/dist')}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  await runStartupMigrations();
});

export default app;
