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

        // Seed default coach
        console.log('📦 Seeding default coach...');
        await db.execute(sql`
          INSERT INTO coaches (name, name_en, personality, personality_en, system_prompt, system_prompt_en, specialty, specialty_en, color)
          VALUES (
            'Kim Chung Tae',
            'Kim Chung Tae',
            '韓国のオリンピック金メダリスト。穏やかで励まし上手。技術的なアドバイスと精神面のサポートの両方を得意とする。',
            'Korean Olympic gold medalist. Calm and encouraging. Skilled at both technical advice and mental support.',
            'あなたはアーチェリーのAIコーチです。ユーザーの質問に対して、具体的で実践的なアドバイスを提供してください。長すぎる回答は避け、要点を絞って回答してください。マークダウン記法は使わないでください。',
            'You are an archery AI coach. Provide specific and practical advice to user questions. Avoid overly long answers and focus on key points. Do not use markdown formatting.',
            'フォーム改善・メンタル強化',
            'Form improvement and mental strengthening',
            '#3B82F6'
          )
        `);
        console.log('✅ Seeded default coach');
      } else {
        // Check if coaches table is empty and seed if needed
        const coachCount = await db.execute(sql`SELECT COUNT(*) as count FROM coaches`);
        const rows = coachCount[0] as unknown as Array<{ count: number }>;
        if (rows[0]?.count === 0) {
          console.log('📦 Coaches table empty, seeding default coach...');
          await db.execute(sql`
            INSERT INTO coaches (name, name_en, personality, personality_en, system_prompt, system_prompt_en, specialty, specialty_en, color)
            VALUES (
              'Kim Chung Tae',
              'Kim Chung Tae',
              '韓国のオリンピック金メダリスト。穏やかで励まし上手。技術的なアドバイスと精神面のサポートの両方を得意とする。',
              'Korean Olympic gold medalist. Calm and encouraging. Skilled at both technical advice and mental support.',
              'あなたはアーチェリーのAIコーチです。ユーザーの質問に対して、具体的で実践的なアドバイスを提供してください。長すぎる回答は避け、要点を絞って回答してください。マークダウン記法は使わないでください。',
              'You are an archery AI coach. Provide specific and practical advice to user questions. Avoid overly long answers and focus on key points. Do not use markdown formatting.',
              'フォーム改善・メンタル強化',
              'Form improvement and mental strengthening',
              '#3B82F6'
            )
          `);
          console.log('✅ Seeded default coach');
        }
      }

      // Create score_logs table if it doesn't exist
      if (!await tableExists(db, 'score_logs')) {
        console.log('📦 Creating score_logs table...');
        await db.execute(sql`
          CREATE TABLE score_logs (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            date DATE NOT NULL,
            score INT NOT NULL,
            max_score INT NOT NULL,
            arrows_count INT NOT NULL,
            distance INT NOT NULL,
            memo TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX user_id_idx (user_id),
            INDEX date_idx (date)
          )
        `);
        console.log('✅ Created score_logs table');
      }

      // Create archery_rounds table if it doesn't exist
      if (!await tableExists(db, 'archery_rounds')) {
        console.log('📦 Creating archery_rounds table...');
        await db.execute(sql`
          CREATE TABLE archery_rounds (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            date DATE NOT NULL,
            distance INT NOT NULL,
            distance_label VARCHAR(50),
            arrows_per_end INT NOT NULL DEFAULT 6,
            total_ends INT NOT NULL DEFAULT 12,
            total_arrows INT NOT NULL DEFAULT 72,
            round_type ENUM('personal', 'club', 'competition') DEFAULT 'personal',
            competition_name VARCHAR(255),
            location VARCHAR(255),
            start_time VARCHAR(10),
            weather ENUM('sunny', 'cloudy', 'rainy', 'snowy', 'windy', 'indoor'),
            \`condition\` ENUM('excellent', 'good', 'normal', 'poor', 'bad'),
            concerns TEXT,
            memo TEXT,
            total_score INT DEFAULT 0,
            total_x INT DEFAULT 0,
            total_10 INT DEFAULT 0,
            status ENUM('in_progress', 'completed', 'cancelled') DEFAULT 'in_progress',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX user_id_idx (user_id),
            INDEX date_idx (date)
          )
        `);
        console.log('✅ Created archery_rounds table');
      }

      // Create archery_ends table if it doesn't exist
      if (!await tableExists(db, 'archery_ends')) {
        console.log('📦 Creating archery_ends table...');
        await db.execute(sql`
          CREATE TABLE archery_ends (
            id INT PRIMARY KEY AUTO_INCREMENT,
            round_id INT NOT NULL,
            end_number INT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX round_id_idx (round_id)
          )
        `);
        console.log('✅ Created archery_ends table');
      }

      // Create archery_scores table if it doesn't exist
      if (!await tableExists(db, 'archery_scores')) {
        console.log('📦 Creating archery_scores table...');
        await db.execute(sql`
          CREATE TABLE archery_scores (
            id INT PRIMARY KEY AUTO_INCREMENT,
            end_id INT NOT NULL,
            arrow_number INT NOT NULL,
            score VARCHAR(2) NOT NULL,
            value INT NOT NULL,
            x_position FLOAT,
            y_position FLOAT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX end_id_idx (end_id)
          )
        `);
        console.log('✅ Created archery_scores table');
      }

      // Create chat_sessions table if it doesn't exist
      if (!await tableExists(db, 'chat_sessions')) {
        console.log('📦 Creating chat_sessions table...');
        await db.execute(sql`
          CREATE TABLE chat_sessions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            coach_id INT NOT NULL,
            title VARCHAR(255),
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX user_id_idx (user_id),
            INDEX coach_id_idx (coach_id)
          )
        `);
        console.log('✅ Created chat_sessions table');
      }

      // Create chat_messages table if it doesn't exist
      if (!await tableExists(db, 'chat_messages')) {
        console.log('📦 Creating chat_messages table...');
        await db.execute(sql`
          CREATE TABLE chat_messages (
            id INT PRIMARY KEY AUTO_INCREMENT,
            session_id INT,
            user_id INT NOT NULL,
            coach_id INT NOT NULL,
            role ENUM('user', 'assistant') NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX session_id_idx (session_id),
            INDEX user_id_idx (user_id),
            INDEX coach_id_idx (coach_id)
          )
        `);
        console.log('✅ Created chat_messages table');
      } else {
        // Add missing columns if they don't exist
        if (!await columnExists(db, 'chat_messages', 'user_id')) {
          await db.execute(sql`ALTER TABLE chat_messages ADD COLUMN user_id INT NOT NULL DEFAULT 0`);
          console.log('✅ Added user_id column to chat_messages');
        }
        if (!await columnExists(db, 'chat_messages', 'coach_id')) {
          await db.execute(sql`ALTER TABLE chat_messages ADD COLUMN coach_id INT NOT NULL DEFAULT 0`);
          console.log('✅ Added coach_id column to chat_messages');
        }
      }

      // Create practice_memos table if it doesn't exist
      if (!await tableExists(db, 'practice_memos')) {
        console.log('📦 Creating practice_memos table...');
        await db.execute(sql`
          CREATE TABLE practice_memos (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            date DATE NOT NULL,
            content TEXT NOT NULL,
            \`condition\` ENUM('excellent', 'good', 'normal', 'poor', 'bad'),
            weather ENUM('sunny', 'cloudy', 'rainy', 'snowy', 'windy', 'indoor'),
            location VARCHAR(255),
            media JSON,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX user_id_idx (user_id),
            INDEX date_idx (date)
          )
        `);
        console.log('✅ Created practice_memos table');
      }

      // Set admin user (by email)
      const { users } = await import('./db/index.js');
      try {
        await db.update(users)
          .set({ isAdmin: 1 })
          .where(eq(users.email, 'takeshi@katomotor.co.jp'));
        console.log('✅ Admin user configured');
      } catch (e) {
        // Ignore if user doesn't exist
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
