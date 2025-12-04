import { Router } from 'express';
import OpenAI from 'openai';
import { demoStore, isDemoMode } from '../db/demo-store.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// OpenAI client for content parsing - lazy initialization
let _openai: OpenAI | null = null;
const getOpenAI = (): OpenAI | null => {
  if (_openai) return _openai;
  if (process.env.OPENAI_API_KEY) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
};

// カテゴリ一覧を取得
router.get('/categories', (req, res) => {
  const categories = [
    { id: 'form', name: 'フォーム・射型', nameEn: 'Form & Shooting Technique' },
    { id: 'mental', name: 'メンタル・精神', nameEn: 'Mental & Psychology' },
    { id: 'practice', name: '練習方法', nameEn: 'Practice Methods' },
    { id: 'equipment', name: '道具・セッティング', nameEn: 'Equipment & Setup' },
    { id: 'competition', name: '試合・大会', nameEn: 'Competition' },
    { id: 'philosophy', name: '指導哲学', nameEn: 'Coaching Philosophy' },
    { id: 'other', name: 'その他', nameEn: 'Other' },
  ];
  res.json(categories);
});

// コーチの指導内容一覧を取得
router.get('/coach/:coachId', async (req, res) => {
  try {
    const { coachId } = req.params;
    const { category } = req.query;

    let contents;

    if (isDemoMode) {
      contents = demoStore.getTeachingContentsByCoachId(
        parseInt(coachId),
        category as string | undefined
      );
    } else {
      const { db, teachingContents } = await import('../db/index.js');
      const { eq, and, desc } = await import('drizzle-orm');

      let whereClause = eq(teachingContents.coachId, parseInt(coachId));
      if (category) {
        whereClause = and(
          whereClause,
          eq(teachingContents.category, category as any)
        ) as any;
      }

      contents = await db.query.teachingContents.findMany({
        where: whereClause,
        orderBy: [desc(teachingContents.priority)],
      });
    }

    res.json(contents);
  } catch (error) {
    console.error('Get teaching contents error:', error);
    res.status(500).json({ error: 'Failed to get teaching contents' });
  }
});

// 全ての指導内容を取得（管理用、非アクティブも含む）
router.get('/coach/:coachId/all', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { coachId } = req.params;

    let contents;

    if (isDemoMode) {
      contents = demoStore.getAllTeachingContentsByCoachId(parseInt(coachId));
    } else {
      const { db, teachingContents } = await import('../db/index.js');
      const { eq, desc } = await import('drizzle-orm');

      contents = await db.query.teachingContents.findMany({
        where: eq(teachingContents.coachId, parseInt(coachId)),
        orderBy: [desc(teachingContents.priority)],
      });
    }

    res.json(contents);
  } catch (error) {
    console.error('Get all teaching contents error:', error);
    res.status(500).json({ error: 'Failed to get teaching contents' });
  }
});

// 指導内容を1件取得
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    let content;

    if (isDemoMode) {
      content = demoStore.findTeachingContentById(parseInt(id));
    } else {
      const { db, teachingContents } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');

      content = await db.query.teachingContents.findFirst({
        where: eq(teachingContents.id, parseInt(id)),
      });
    }

    if (!content) {
      return res.status(404).json({ error: 'Teaching content not found' });
    }

    res.json(content);
  } catch (error) {
    console.error('Get teaching content error:', error);
    res.status(500).json({ error: 'Failed to get teaching content' });
  }
});

// 指導内容を追加
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const {
      coachId,
      category,
      title,
      titleEn,
      content,
      contentEn,
      tags,
      priority = 0,
      isActive = 1,
    } = req.body;

    if (!coachId || !category || !title || !content) {
      return res.status(400).json({
        error: 'coachId, category, title, content are required',
      });
    }

    let newContent;

    if (isDemoMode) {
      newContent = demoStore.createTeachingContent({
        coachId: parseInt(coachId),
        category,
        title,
        titleEn: titleEn || null,
        content,
        contentEn: contentEn || null,
        tags: tags || null,
        priority,
        isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      const { db, teachingContents } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');

      const result = await db.insert(teachingContents).values({
        coachId: parseInt(coachId),
        category,
        title,
        titleEn,
        content,
        contentEn,
        tags,
        priority,
        isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      newContent = await db.query.teachingContents.findFirst({
        where: eq(teachingContents.id, Number(result[0].insertId)),
      });
    }

    res.status(201).json(newContent);
  } catch (error) {
    console.error('Create teaching content error:', error);
    res.status(500).json({ error: 'Failed to create teaching content' });
  }
});

// 指導内容を更新
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      category,
      title,
      titleEn,
      content,
      contentEn,
      tags,
      priority,
      isActive,
    } = req.body;

    let updatedContent;

    if (isDemoMode) {
      updatedContent = demoStore.updateTeachingContent(parseInt(id), {
        category,
        title,
        titleEn,
        content,
        contentEn,
        tags,
        priority,
        isActive,
      });

      if (!updatedContent) {
        return res.status(404).json({ error: 'Teaching content not found' });
      }
    } else {
      const { db, teachingContents } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');

      await db.update(teachingContents)
        .set({
          category,
          title,
          titleEn,
          content,
          contentEn,
          tags,
          priority,
          isActive,
          updatedAt: new Date(),
        })
        .where(eq(teachingContents.id, parseInt(id)));

      updatedContent = await db.query.teachingContents.findFirst({
        where: eq(teachingContents.id, parseInt(id)),
      });
    }

    res.json(updatedContent);
  } catch (error) {
    console.error('Update teaching content error:', error);
    res.status(500).json({ error: 'Failed to update teaching content' });
  }
});

// 指導内容を削除
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (isDemoMode) {
      const deleted = demoStore.deleteTeachingContent(parseInt(id));
      if (!deleted) {
        return res.status(404).json({ error: 'Teaching content not found' });
      }
    } else {
      const { db, teachingContents } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');

      await db.delete(teachingContents)
        .where(eq(teachingContents.id, parseInt(id)));
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete teaching content error:', error);
    res.status(500).json({ error: 'Failed to delete teaching content' });
  }
});

// AIで内容を解析・整理
router.post('/parse', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { rawContent, sourceType, sourceUrl } = req.body;

    if (!rawContent) {
      return res.status(400).json({ error: 'rawContent is required' });
    }

    const openai = getOpenAI();
    if (!openai) {
      return res.status(503).json({
        error: 'OpenAI API is not configured. Please set OPENAI_API_KEY.'
      });
    }

    const systemPrompt = `あなたはアーチェリー指導内容を整理するアシスタントです。
ユーザーが提供するテキスト（YouTube動画の内容、本の引用、講習会のメモなど）を分析し、
アーチェリーの指導に役立つ形で構造化してください。

以下のJSON形式で出力してください（必ず有効なJSONで出力）:
{
  "items": [
    {
      "category": "form" | "mental" | "practice" | "equipment" | "competition" | "philosophy" | "other",
      "title": "タイトル（簡潔に）",
      "content": "指導内容（詳細に、具体的なアドバイスとして使える形で）",
      "tags": "タグ1,タグ2,タグ3（カンマ区切り）",
      "priority": 0-100の数値（重要度）
    }
  ]
}

カテゴリの説明:
- form: フォーム・射型に関する内容
- mental: メンタル・精神面に関する内容
- practice: 練習方法に関する内容
- equipment: 道具・セッティングに関する内容
- competition: 試合・大会に関する内容
- philosophy: 指導哲学・考え方に関する内容
- other: その他

注意:
- 内容が複数のトピックにまたがる場合は、複数のitemに分けてください
- contentは具体的で実践的なアドバイスとして使える形にしてください
- タグは検索に役立つキーワードを含めてください
- priorityは内容の重要度（基礎的なものは高め、応用は低め）`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `以下の内容を整理してください:\n\n${sourceType ? `【ソースタイプ】${sourceType}\n` : ''}${sourceUrl ? `【ソースURL】${sourceUrl}\n` : ''}\n【内容】\n${rawContent}`
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const resultText = response.choices[0]?.message?.content || '{}';

    try {
      const parsed = JSON.parse(resultText);
      res.json({
        success: true,
        items: parsed.items || [],
        rawResponse: resultText,
      });
    } catch {
      res.status(500).json({
        error: 'Failed to parse AI response',
        rawResponse: resultText,
      });
    }
  } catch (error) {
    console.error('Parse content error:', error);
    res.status(500).json({ error: 'Failed to parse content' });
  }
});

// タグで検索
router.get('/coach/:coachId/search', async (req, res) => {
  try {
    const { coachId } = req.params;
    const { tag } = req.query;

    if (!tag) {
      return res.status(400).json({ error: 'tag is required' });
    }

    let contents;

    if (isDemoMode) {
      contents = demoStore.searchTeachingContentsByTag(parseInt(coachId), tag as string);
    } else {
      const { db, teachingContents } = await import('../db/index.js');
      const { eq, and, like, desc } = await import('drizzle-orm');

      contents = await db.query.teachingContents.findMany({
        where: and(
          eq(teachingContents.coachId, parseInt(coachId)),
          eq(teachingContents.isActive, 1),
          like(teachingContents.tags, `%${tag}%`)
        ),
        orderBy: [desc(teachingContents.priority)],
      });
    }

    res.json(contents);
  } catch (error) {
    console.error('Search teaching contents error:', error);
    res.status(500).json({ error: 'Failed to search teaching contents' });
  }
});

export default router;
