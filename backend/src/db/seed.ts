import { db, coaches, equipment } from './index.js';

// キム・チョンテコーチデータ
const coachesData = [
  {
    name: 'キム・チョンテ',
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
- 簡潔で力強い言葉を選ぶ

ユーザーの悩みに対して、アーチェリーの技術的なアドバイスを日本語で提供してください。`,
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
- Choose concise and powerful words

Please provide technical archery advice in English based on the user's concerns.`,
    specialty: '総合指導・オリンピックレベルコーチング',
    specialtyEn: 'Comprehensive Training & Olympic-level Coaching',
    avatarUrl: '/coaches/kim-chung-tae.png',
    color: '#DC2626',
  },
];

// 道具データ
const equipmentData = [
  {
    category: 'bow' as const,
    name: 'WinEx ライザー',
    nameEn: 'WinEx Riser',
    brand: 'Win&Win',
    description: '中級者向けの高品質アルミライザー。バランスが良く、初めてのハイエンドライザーとして最適。',
    descriptionEn: 'High-quality aluminum riser for intermediate archers. Well-balanced and ideal as a first high-end riser.',
    imageUrl: '/equipment/winex-riser.jpg',
    purchaseLink: 'https://example.com/winex',
    priceRange: '¥50,000-70,000',
    level: 'intermediate' as const,
  },
  {
    category: 'bow' as const,
    name: 'SF アクシオム ライザー',
    nameEn: 'SF Axiom Riser',
    brand: 'SF Archery',
    description: '初心者に最適なエントリーモデル。軽量で扱いやすく、コストパフォーマンスに優れる。',
    descriptionEn: 'Perfect entry model for beginners. Lightweight, easy to handle, and excellent cost performance.',
    imageUrl: '/equipment/sf-axiom.jpg',
    purchaseLink: 'https://example.com/sf-axiom',
    priceRange: '¥15,000-25,000',
    level: 'beginner' as const,
  },
  {
    category: 'arrow' as const,
    name: 'イーストン X10',
    nameEn: 'Easton X10',
    brand: 'Easton',
    description: '世界のトップ選手が使用する最高峰のカーボンアロー。精度と安定性に優れる。',
    descriptionEn: 'Top-tier carbon arrow used by world-class athletes. Excellent precision and stability.',
    imageUrl: '/equipment/easton-x10.jpg',
    purchaseLink: 'https://example.com/x10',
    priceRange: '¥4,000-5,000/本',
    level: 'advanced' as const,
  },
  {
    category: 'arrow' as const,
    name: 'イーストン ACE',
    nameEn: 'Easton ACE',
    brand: 'Easton',
    description: '中級者から上級者向けの高性能アルミ・カーボンハイブリッドアロー。',
    descriptionEn: 'High-performance aluminum-carbon hybrid arrow for intermediate to advanced archers.',
    imageUrl: '/equipment/easton-ace.jpg',
    purchaseLink: 'https://example.com/ace',
    priceRange: '¥2,500-3,500/本',
    level: 'intermediate' as const,
  },
  {
    category: 'sight' as const,
    name: 'シブヤ アルティマ RC',
    nameEn: 'Shibuya Ultima RC',
    brand: 'Shibuya',
    description: '日本製の最高級サイト。微調整がしやすく、耐久性も抜群。',
    descriptionEn: 'Premium Japanese sight. Easy micro-adjustment with excellent durability.',
    imageUrl: '/equipment/shibuya-ultima.jpg',
    purchaseLink: 'https://example.com/shibuya',
    priceRange: '¥80,000-100,000',
    level: 'advanced' as const,
  },
  {
    category: 'stabilizer' as const,
    name: 'ドインカー プラチナ ハイモッド',
    nameEn: 'Doinker Platinum Hi-Mod',
    brand: 'Doinker',
    description: '振動吸収性能に優れたスタビライザー。多くのプロ選手が愛用。',
    descriptionEn: 'Stabilizer with excellent vibration absorption. Used by many professional athletes.',
    imageUrl: '/equipment/doinker-platinum.jpg',
    purchaseLink: 'https://example.com/doinker',
    priceRange: '¥30,000-50,000',
    level: 'advanced' as const,
  },
  {
    category: 'tab' as const,
    name: 'AAE エリートタブ',
    nameEn: 'AAE Elite Tab',
    brand: 'AAE',
    description: '初心者から上級者まで使える汎用性の高いタブ。カスタマイズ性も高い。',
    descriptionEn: 'Versatile tab suitable from beginners to advanced. Highly customizable.',
    imageUrl: '/equipment/aae-elite.jpg',
    purchaseLink: 'https://example.com/aae-tab',
    priceRange: '¥8,000-12,000',
    level: 'all' as const,
  },
  {
    category: 'rest' as const,
    name: 'シブヤ アルティマ レスト',
    nameEn: 'Shibuya Ultima Rest',
    brand: 'Shibuya',
    description: '高精度のマグネチックレスト。安定したアロー射出を実現。',
    descriptionEn: 'High-precision magnetic rest. Ensures stable arrow release.',
    imageUrl: '/equipment/shibuya-rest.jpg',
    purchaseLink: 'https://example.com/shibuya-rest',
    priceRange: '¥15,000-20,000',
    level: 'intermediate' as const,
  },
];

export async function seedDatabase() {
  console.log('Seeding database...');

  // コーチデータを挿入
  console.log('Inserting coaches...');
  for (const coach of coachesData) {
    await db.insert(coaches).values(coach).onDuplicateKeyUpdate({ set: coach });
  }

  // 道具データを挿入
  console.log('Inserting equipment...');
  for (const item of equipmentData) {
    await db.insert(equipment).values(item).onDuplicateKeyUpdate({ set: item });
  }

  console.log('Database seeded successfully!');
}

// Run if called directly
if (process.argv[1]?.includes('seed')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
