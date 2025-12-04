// Database seeding script - run this to populate initial data
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../src/db/schema.js';

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.log('⏭️  No DATABASE_URL set, skipping seed (demo mode will be used)');
    process.exit(0);
  }

  console.log('🌱 Starting database seed...');

  const poolConnection = mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  const db = drizzle(poolConnection, { schema, mode: 'default' });

  try {
    // Check if coaches already exist
    const existingCoaches = await db.query.coaches.findMany();
    if (existingCoaches.length > 0) {
      console.log('✅ Database already has data, skipping seed');
      await poolConnection.end();
      process.exit(0);
    }

    // Insert default coach (Kim Chung Tae)
    await db.insert(schema.coaches).values({
      name: 'Kim Chung Tae',
      nameEn: 'Kim Chung Tae',
      personality: '韓国アーチェリー界のレジェンド。オリンピック金メダリストを多数輩出した名コーチ。厳しくも愛情深い指導スタイルで、選手の潜在能力を最大限に引き出す。基礎の徹底と精神力の強化を重視し、「一射入魂」の精神を大切にする。',
      personalityEn: 'A legendary Korean archery coach who has produced numerous Olympic gold medalists. Known for his strict yet compassionate coaching style that maximizes athletes\' potential. Emphasizes thorough fundamentals and mental strength, valuing the spirit of "one arrow, one soul."',
      systemPrompt: `あなたはキム・チョンテ（Kim Chung Tae）コーチです。韓国アーチェリー界のレジェンドであり、オリンピック金メダリストを多数輩出した世界的な名コーチです。

【あなたの特徴】
- 厳しくも愛情深い指導スタイル
- 基礎の徹底を何より重視する
- 精神力・メンタルの強化に定評がある
- 「一射入魂」の精神を大切にする
- 選手の潜在能力を見抜き、最大限に引き出す力を持つ
- 時に厳しい言葉も使うが、それは選手への期待と愛情の表れ

【指導方針】
- まず基礎フォームを徹底的にチェックする
- 技術的な問題の根本原因を探る
- メンタル面のアドバイスも積極的に行う
- 具体的で実践的なアドバイスを心がける
- 選手の成長を信じ、励ましの言葉も忘れない

【話し方】
- 敬語を基本としつつ、時に親しみを込めた表現を使う
- 韓国のアーチェリー哲学や経験談を交えることがある
- 簡潔で力強い言葉を選ぶ`,
      systemPromptEn: `You are Coach Kim Chung Tae, a legendary figure in Korean archery who has produced numerous Olympic gold medalists.

【Your Characteristics】
- Strict yet compassionate coaching style
- Prioritizes thorough fundamentals above all
- Renowned for mental strength training
- Values the spirit of "one arrow, one soul"
- Ability to identify and maximize athletes' potential
- Sometimes uses tough words, but it reflects expectations and care for athletes

【Coaching Philosophy】
- Thoroughly check basic form first
- Find the root cause of technical issues
- Actively provide mental advice
- Give specific and practical advice
- Believe in athletes' growth and don't forget encouraging words

【Speaking Style】
- Polite but sometimes uses familiar expressions
- May share Korean archery philosophy and experiences
- Choose concise and powerful words`,
      specialty: '総合指導・オリンピックレベルコーチング',
      specialtyEn: 'Comprehensive Training & Olympic-level Coaching',
      color: '#DC2626',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Created default coach');

    // Insert demo users
    const demoUsers = [
      { email: 'test1@example.com', name: 'テストユーザー1', language: 'ja', gender: 'male', affiliation: '東京大学', nickname: 'アーチャー1号' },
      { email: 'test2@example.com', name: 'テストユーザー2', language: 'ja', gender: 'female', affiliation: '京都大学', nickname: 'アロー姫' },
      { email: 'test3@example.com', name: 'テストユーザー3', language: 'ja', gender: 'male', affiliation: '大阪大学', nickname: 'ゴールドハンター' },
      { email: 'test4@example.com', name: 'Test User 4', language: 'en', gender: 'female', affiliation: 'Stanford University', nickname: 'Bullseye' },
      { email: 'test5@example.com', name: 'テストユーザー5', language: 'ja', gender: 'other', affiliation: '早稲田大学', nickname: 'シューター' },
    ];

    for (const userData of demoUsers) {
      await db.insert(schema.users).values({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log('✅ Created demo users');

    // Insert default equipment
    await db.insert(schema.equipment).values([
      {
        category: 'bow',
        name: 'SF アクシオム ライザー',
        nameEn: 'SF Axiom Riser',
        brand: 'SF Archery',
        description: '初心者に最適なエントリーモデル。',
        descriptionEn: 'Perfect entry model for beginners.',
        priceRange: '¥15,000-25,000',
        level: 'beginner',
        createdAt: new Date(),
      },
      {
        category: 'arrow',
        name: 'イーストン ACE',
        nameEn: 'Easton ACE',
        brand: 'Easton',
        description: '中級者向けの高性能アロー。',
        descriptionEn: 'High-performance arrow for intermediate archers.',
        priceRange: '¥2,500-3,500/本',
        level: 'intermediate',
        createdAt: new Date(),
      },
    ]);

    console.log('✅ Created default equipment');
    console.log('🎉 Database seeding completed!');

    await poolConnection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    await poolConnection.end();
    process.exit(1);
  }
}

seed();
