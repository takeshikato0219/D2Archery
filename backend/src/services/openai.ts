import OpenAI from 'openai';
import type { Coach, ChatMessage, TeachingContent } from '../db/schema.js';
import { demoStore, isDemoMode } from '../db/demo-store.js';

// OpenAI client - lazy initialization to ensure dotenv is loaded first
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

interface ChatCompletionParams {
  coach: Coach;
  messages: ChatMessage[];
  userMessage: string;
  language: 'ja' | 'en';
  userContext?: {
    recentScores?: { date: string; score: number; maxScore: number }[];
    averageScore?: number;
    trend?: 'improving' | 'declining' | 'stable';
  };
}

// 指導内容を取得するヘルパー関数
async function getTeachingContents(coachId: number): Promise<TeachingContent[]> {
  if (isDemoMode) {
    return demoStore.getTeachingContentsByCoachId(coachId);
  } else {
    try {
      const { db, teachingContents } = await import('../db/index.js');
      const { eq, desc } = await import('drizzle-orm');
      return await db.query.teachingContents.findMany({
        where: eq(teachingContents.coachId, coachId),
        orderBy: [desc(teachingContents.priority)],
      });
    } catch (error) {
      // テーブルが存在しない場合は空配列を返す
      console.warn('Teaching contents table not found, skipping:', error);
      return [];
    }
  }
}

// 指導内容をプロンプト用にフォーマット
function formatTeachingContentsForPrompt(contents: TeachingContent[], language: 'ja' | 'en'): string {
  if (contents.length === 0) return '';

  const categoryNames: Record<string, { ja: string; en: string }> = {
    form: { ja: 'フォーム・射型', en: 'Form & Technique' },
    mental: { ja: 'メンタル・精神', en: 'Mental & Psychology' },
    practice: { ja: '練習方法', en: 'Practice Methods' },
    equipment: { ja: '道具・セッティング', en: 'Equipment & Setup' },
    competition: { ja: '試合・大会', en: 'Competition' },
    philosophy: { ja: '指導哲学', en: 'Coaching Philosophy' },
    other: { ja: 'その他', en: 'Other' },
  };

  // カテゴリごとにグループ化
  const grouped: Record<string, TeachingContent[]> = {};
  for (const content of contents) {
    if (!grouped[content.category]) {
      grouped[content.category] = [];
    }
    grouped[content.category].push(content);
  }

  let result = language === 'ja'
    ? '\n\n【コーチの指導内容・知識ベース】\n以下の内容を参考にしてアドバイスしてください。\n'
    : '\n\n【Coach\'s Teaching Content & Knowledge Base】\nPlease refer to the following when giving advice.\n';

  for (const [category, items] of Object.entries(grouped)) {
    const catName = categoryNames[category]?.[language] || category;
    result += `\n## ${catName}\n`;

    for (const item of items) {
      const title = language === 'ja' ? item.title : (item.titleEn || item.title);
      const content = language === 'ja' ? item.content : (item.contentEn || item.content);
      result += `\n### ${title}\n${content}\n`;
    }
  }

  return result;
}

// テキストを最大長に制限（トークン制限対策）
function limitText(text: string, maxLength: number = 8000): string {
  if (text.length <= maxLength) {
    return text;
  }
  // 行の途中で切れないように、最後の改行で切る
  const truncated = text.substring(0, maxLength);
  const lastNewline = truncated.lastIndexOf('\n');
  if (lastNewline > maxLength * 0.8) {
    return truncated.substring(0, lastNewline) + '\n\n[...省略...]';
  }
  return truncated + '\n\n[...省略...]';
}

export async function generateCoachResponse({
  coach,
  messages,
  userMessage,
  language,
  userContext,
}: ChatCompletionParams): Promise<string> {
  // 基本のシステムプロンプト
  const baseSystemPrompt = language === 'ja' ? coach.systemPrompt : coach.systemPromptEn;

  // 指導思想（長文可能）- トークン制限のため8000文字に制限
  const rawPhilosophy = language === 'ja' ? coach.teachingPhilosophy : coach.teachingPhilosophyEn;
  const philosophy = rawPhilosophy ? limitText(rawPhilosophy, 8000) : null;

  // 基本ルール（禁止事項など）- 3000文字に制限
  const rawBaseRules = language === 'ja' ? coach.baseRules : coach.baseRulesEn;
  const baseRules = rawBaseRules ? limitText(rawBaseRules, 3000) : null;

  // 詳細設定（口調、おすすめ、挨拶）- 各2000文字に制限
  const rawSpeakingTone = language === 'ja' ? coach.speakingTone : coach.speakingToneEn;
  const speakingTone = rawSpeakingTone ? limitText(rawSpeakingTone, 2000) : null;
  const rawRecommendations = language === 'ja' ? coach.recommendations : coach.recommendationsEn;
  const recommendations = rawRecommendations ? limitText(rawRecommendations, 2000) : null;
  const rawGreetings = language === 'ja' ? coach.greetings : coach.greetingsEn;
  const greetings = rawGreetings ? limitText(rawGreetings, 2000) : null;

  // 新しい設定フィールド（性格、応答スタイル、知識範囲）- 各2000文字に制限
  const rawPersonalitySettings = language === 'ja' ? coach.personalitySettings : coach.personalitySettingsEn;
  const personalitySettings = rawPersonalitySettings ? limitText(rawPersonalitySettings, 2000) : null;
  const rawResponseStyle = language === 'ja' ? coach.responseStyle : coach.responseStyleEn;
  const responseStyle = rawResponseStyle ? limitText(rawResponseStyle, 2000) : null;
  const rawKnowledgeScope = language === 'ja' ? coach.knowledgeScope : coach.knowledgeScopeEn;
  const knowledgeScope = rawKnowledgeScope ? limitText(rawKnowledgeScope, 2000) : null;

  // 指導内容を取得
  const teachingContents = await getTeachingContents(coach.id);
  const teachingContentsText = teachingContents.length > 0
    ? formatTeachingContentsForPrompt(teachingContents, language)
    : '';

  // Build context about user's recent performance if available
  let contextMessage = '';
  if (userContext) {
    if (language === 'ja') {
      contextMessage = '\n\n【ユーザーの最近の成績情報】\n';
      if (userContext.averageScore !== undefined) {
        contextMessage += `平均スコア: ${userContext.averageScore}点\n`;
      }
      if (userContext.trend) {
        const trendText = {
          improving: '上昇傾向',
          declining: '下降傾向',
          stable: '安定',
        };
        contextMessage += `傾向: ${trendText[userContext.trend]}\n`;
      }
      if (userContext.recentScores && userContext.recentScores.length > 0) {
        contextMessage += '最近の記録:\n';
        userContext.recentScores.slice(0, 5).forEach((score) => {
          contextMessage += `- ${score.date}: ${score.score}/${score.maxScore}点\n`;
        });
      }
    } else {
      contextMessage = '\n\n[User\'s Recent Performance]\n';
      if (userContext.averageScore !== undefined) {
        contextMessage += `Average Score: ${userContext.averageScore}\n`;
      }
      if (userContext.trend) {
        const trendText = {
          improving: 'Improving',
          declining: 'Declining',
          stable: 'Stable',
        };
        contextMessage += `Trend: ${trendText[userContext.trend]}\n`;
      }
      if (userContext.recentScores && userContext.recentScores.length > 0) {
        contextMessage += 'Recent Records:\n';
        userContext.recentScores.slice(0, 5).forEach((score) => {
          contextMessage += `- ${score.date}: ${score.score}/${score.maxScore}\n`;
        });
      }
    }
  }

  // Convert previous messages to OpenAI format
  const conversationHistory: OpenAI.ChatCompletionMessageParam[] = messages.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  const openai = getOpenAI();

  // Return mock response if OpenAI is not configured
  if (!openai) {
    const coachName = language === 'ja' ? coach.name : coach.nameEn;
    return language === 'ja'
      ? `【${coachName}からのアドバイス】\n\nご質問ありがとうございます。現在、AIコーチ機能はデモモードで動作しています。\n\n本番環境では、OPENAI_API_KEY を設定することで、パーソナライズされたアドバイスを受けることができます。`
      : `[Advice from ${coachName}]\n\nThank you for your question. The AI coach feature is currently running in demo mode.\n\nIn production, set OPENAI_API_KEY to receive personalized advice.`;
  }

  // メッセージを構築
  // 優先順位: 基本ルール（禁止事項） > 指導思想・哲学 > 基本プロンプト > 追加コンテンツ
  const apiMessages: OpenAI.ChatCompletionMessageParam[] = [];

  // 0. 基本ルール（禁止事項）が最優先（存在する場合）
  if (baseRules) {
    const rulesIntroText = language === 'ja'
      ? `【絶対厳守：基本ルール・禁止事項】
以下のルールは絶対に守らなければなりません。

`
      : `[ABSOLUTE PRIORITY: Base Rules & Prohibited Items]
The following rules MUST be followed at all times.

`;

    apiMessages.push({
      role: 'system',
      content: rulesIntroText + baseRules,
    });
  }

  // 0.5 性格設定（最重要 - コーチの性格を決定）
  if (personalitySettings) {
    const personalityIntro = language === 'ja'
      ? `【★最重要★ コーチの性格・キャラクター設定】
以下の性格設定は絶対に守ってください。これがあなたのキャラクターです。
すべての回答でこの性格を一貫して表現してください。

`
      : `[★CRITICAL★ Coach's Personality & Character Settings]
You MUST follow these personality settings at all times. This is your character.
Express this personality consistently in all responses.

`;
    apiMessages.push({
      role: 'system',
      content: personalityIntro + personalitySettings,
    });
  }

  // 0.6 応答スタイル（回答のフォーマットを決定）
  if (responseStyle) {
    const styleIntro = language === 'ja'
      ? `【★重要★ 応答スタイル・フォーマット】
以下のスタイルで回答してください。回答の長さ、形式、表現方法を必ず守ってください。

`
      : `[★IMPORTANT★ Response Style & Format]
Please respond using the following style. Always follow the length, format, and expression guidelines.

`;
    apiMessages.push({
      role: 'system',
      content: styleIntro + responseStyle,
    });
  }

  // 0.7 知識範囲（回答できるトピックの制限）
  if (knowledgeScope) {
    const scopeIntro = language === 'ja'
      ? `【知識範囲・回答可能なトピック】
以下の範囲に基づいて回答してください。範囲外の質問には丁重にお断りしてください。

`
      : `[Knowledge Scope & Answerable Topics]
Please respond based on the following scope. Politely decline questions outside this scope.

`;
    apiMessages.push({
      role: 'system',
      content: scopeIntro + knowledgeScope,
    });
  }

  // 0.8 詳細設定（口調、おすすめ、挨拶）
  const hasDetailSettings = speakingTone || recommendations || greetings;
  if (hasDetailSettings) {
    let detailsContent = language === 'ja'
      ? `【コーチの詳細設定】\n以下の設定に従ってコミュニケーションしてください。\n\n`
      : `[Coach's Detailed Settings]\nPlease follow these settings when communicating.\n\n`;

    if (speakingTone) {
      detailsContent += language === 'ja'
        ? `## 口調・話し方\n${speakingTone}\n\n`
        : `## Speaking Tone & Style\n${speakingTone}\n\n`;
    }

    if (recommendations) {
      detailsContent += language === 'ja'
        ? `## おすすめ（道具・練習方法など）\n質問があった場合、以下を参考におすすめしてください。\n${recommendations}\n\n`
        : `## Recommendations (Equipment, Practice Methods, etc.)\nWhen asked, please refer to the following recommendations.\n${recommendations}\n\n`;
    }

    if (greetings) {
      detailsContent += language === 'ja'
        ? `## 挨拶・定型句\n以下の挨拶やフレーズを適宜使用してください。\n${greetings}\n\n`
        : `## Greetings & Phrases\nPlease use the following greetings and phrases as appropriate.\n${greetings}\n\n`;
    }

    apiMessages.push({
      role: 'system',
      content: detailsContent,
    });
  }

  // 1. 指導思想・哲学（存在する場合）- 制限済みなのでチャンク分割不要
  if (philosophy) {
    const introText = language === 'ja'
      ? `【コーチの指導思想・哲学】
以下の指導思想に基づいてアドバイスしてください。

`
      : `[Coach's Teaching Philosophy]
Please advise based on the following teaching philosophy.

`;

    apiMessages.push({
      role: 'system',
      content: introText + philosophy,
    });
  }

  // 2. 基本のシステムプロンプト（指導思想がない場合のフォールバック、または補足情報として）
  const basePromptIntro = language === 'ja'
    ? (philosophy ? '【補足情報】\n' : '')
    : (philosophy ? '[Supplementary Information]\n' : '');

  apiMessages.push({
    role: 'system',
    content: basePromptIntro + baseSystemPrompt + contextMessage,
  });

  // 3. 追加の指導内容（teachingContentsテーブルから）- 4000文字に制限
  if (teachingContentsText) {
    const limitedContent = limitText(teachingContentsText, 4000);
    apiMessages.push({
      role: 'system',
      content: limitedContent,
    });
  }

  // 4. 会話履歴
  apiMessages.push(...conversationHistory);

  // 5. ユーザーの質問
  apiMessages.push({
    role: 'user',
    content: userMessage,
  });

  // 6. ★最重要★ ユーザーメッセージの直後にリマインダーを追加（最も効果的な位置）
  // GPT-4/gpt-4oは最後のシステムメッセージを最も重視する
  const styleInstructions: string[] = [];

  if (personalitySettings) {
    styleInstructions.push(personalitySettings);
  }
  if (responseStyle) {
    styleInstructions.push(responseStyle);
  }
  if (speakingTone) {
    styleInstructions.push(speakingTone);
  }

  if (styleInstructions.length > 0) {
    const reminder = language === 'ja'
      ? `【回答前の最終確認 - 必ず守ること】
あなたは今から回答します。以下を100%守ってください：

1. 回答は短く簡潔に（3〜5文程度）
2. **（太字）や見出し（#）は絶対に使わない。プレーンテキストのみ
3. 以下の口調・話し方を使う：

${styleInstructions.join('\n\n')}

長い回答は禁止。短くテンポよく答えてください。`
      : `[FINAL CHECK - MANDATORY]
You are about to respond. Follow these rules 100%:

1. Keep responses SHORT and concise (3-5 sentences max)
2. NEVER use ** (bold) or # (headings). Plain text only
3. Use the following speaking style:

${styleInstructions.join('\n\n')}

Long responses are PROHIBITED. Be brief and punchy.`;

    apiMessages.push({
      role: 'system',
      content: reminder,
    });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: apiMessages,
      temperature: 0.8,
      max_tokens: 300, // 短い回答に制限
    });

    return response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
  } catch (error) {
    console.error('OpenAI API error:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return language === 'ja'
      ? `申し訳ありません。現在AIサービスに接続できません。しばらくしてからもう一度お試しください。`
      : `Sorry, I cannot connect to the AI service right now. Please try again later.`;
  }
}

export async function generateScoreAdvice(
  coach: Coach,
  language: 'ja' | 'en',
  scores: { date: string; score: number; maxScore: number; arrowsCount: number; memo?: string | null }[]
): Promise<string> {
  const systemPrompt = language === 'ja' ? coach.systemPrompt : coach.systemPromptEn;

  let scoresInfo = '';
  if (language === 'ja') {
    scoresInfo = '以下はユーザーの最近の練習記録です。この記録を分析して、アドバイスを提供してください。\n\n';
    scores.forEach((score) => {
      scoresInfo += `日付: ${score.date}\n`;
      scoresInfo += `スコア: ${score.score}/${score.maxScore}点\n`;
      scoresInfo += `本数: ${score.arrowsCount}本\n`;
      if (score.memo) {
        scoresInfo += `メモ: ${score.memo}\n`;
      }
      scoresInfo += '\n';
    });
    scoresInfo += '上記の記録を踏まえて、改善点やアドバイスを提供してください。';
  } else {
    scoresInfo = 'Below are the user\'s recent practice records. Please analyze and provide advice.\n\n';
    scores.forEach((score) => {
      scoresInfo += `Date: ${score.date}\n`;
      scoresInfo += `Score: ${score.score}/${score.maxScore}\n`;
      scoresInfo += `Arrows: ${score.arrowsCount}\n`;
      if (score.memo) {
        scoresInfo += `Notes: ${score.memo}\n`;
      }
      scoresInfo += '\n';
    });
    scoresInfo += 'Based on the records above, please provide suggestions for improvement.';
  }

  const openai = getOpenAI();

  // Return mock response if OpenAI is not configured
  if (!openai) {
    const coachName = language === 'ja' ? coach.name : coach.nameEn;
    return language === 'ja'
      ? `【${coachName}からのスコア分析】\n\n練習お疲れ様です！記録を確認しました。\n\n現在、AIコーチ機能はデモモードで動作しています。本番環境では、OPENAI_API_KEY を設定することで、詳細なスコア分析とパーソナライズされたアドバイスを受けることができます。\n\n引き続き練習を記録して、上達を目指しましょう！`
      : `[Score Analysis from ${coachName}]\n\nGreat job practicing! I've reviewed your records.\n\nThe AI coach feature is currently running in demo mode. In production, set OPENAI_API_KEY to receive detailed score analysis and personalized advice.\n\nKeep recording your practice and aim for improvement!`;
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: scoresInfo,
      },
    ],
    temperature: 0.7,
    max_tokens: 1500,
  });

  return response.choices[0]?.message?.content || 'Sorry, I could not generate advice.';
}
