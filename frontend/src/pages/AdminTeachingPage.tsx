import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, Save, X, Sparkles, Check, FileText, BookOpen, ShieldAlert, Settings, User, Brain, MessageSquare, Target, Upload, Image } from 'lucide-react';
import { api } from '../lib/api';
import type { TeachingContent, TeachingCategory } from '../types';

interface FormData {
  category: string;
  title: string;
  titleEn: string;
  content: string;
  contentEn: string;
  tags: string;
  priority: number;
}

interface ParsedItem {
  category: string;
  title: string;
  content: string;
  tags: string;
  priority: number;
  selected: boolean;
}

const initialFormData: FormData = {
  category: 'form',
  title: '',
  titleEn: '',
  content: '',
  contentEn: '',
  tags: '',
  priority: 0,
};

export function AdminTeachingPage() {
  const { i18n } = useTranslation();
  const [contents, setContents] = useState<TeachingContent[]>([]);
  const [categories, setCategories] = useState<TeachingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Main input state - always visible
  const [rawContent, setRawContent] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [importingSaving, setImportingSaving] = useState(false);

  // View mode: 'basic' (coach info), 'philosophy' (main), 'rules' (base rules/prohibitions), 'settings' (tone, recommendations, greetings), 'details' (individual items), or 'list'
  const [viewMode, setViewMode] = useState<'basic' | 'philosophy' | 'rules' | 'settings' | 'details' | 'list'>('basic');

  // Coach philosophy (full text, not parsed)
  const [philosophyText, setPhilosophyText] = useState('');
  const [savingPhilosophy, setSavingPhilosophy] = useState(false);

  // Base rules (prohibitions, etc.)
  const [baseRulesText, setBaseRulesText] = useState('');
  const [savingRules, setSavingRules] = useState(false);

  // Detail settings (tone, recommendations, greetings)
  const [speakingTone, setSpeakingTone] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [greetings, setGreetings] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Basic coach info (name, specialty, color, avatar)
  const [coachName, setCoachName] = useState('');
  const [coachSpecialty, setCoachSpecialty] = useState('');
  const [coachColor, setCoachColor] = useState('#3B82F6');
  const [coachAvatarUrl, setCoachAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [personalitySettings, setPersonalitySettings] = useState('');
  const [responseStyle, setResponseStyle] = useState('');
  const [knowledgeScope, setKnowledgeScope] = useState('');
  const [savingBasic, setSavingBasic] = useState(false);

  const coachId = 1; // Kim Chung Tae

  useEffect(() => {
    Promise.all([
      api.getCoach(coachId),
      api.getTeachingContents(coachId, true),
      api.getTeachingCategories(),
    ])
      .then(([coachData, contentsData, categoriesData]) => {
        setPhilosophyText(coachData.teachingPhilosophy || '');
        setBaseRulesText(coachData.baseRules || '');
        setSpeakingTone(coachData.speakingTone || '');
        setRecommendations(coachData.recommendations || '');
        setGreetings(coachData.greetings || '');
        // Basic info
        setCoachName(coachData.name || '');
        setCoachSpecialty(coachData.specialty || '');
        setCoachColor(coachData.color || '#3B82F6');
        setCoachAvatarUrl(coachData.avatarUrl || null);
        setSystemPrompt(coachData.systemPrompt || '');
        setPersonalitySettings(coachData.personalitySettings || '');
        setResponseStyle(coachData.responseStyle || '');
        setKnowledgeScope(coachData.knowledgeScope || '');
        setContents(contentsData);
        setCategories(categoriesData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Save full philosophy text directly to coach
  const handleSavePhilosophy = async () => {
    if (!philosophyText.trim()) return;

    setSavingPhilosophy(true);
    try {
      await api.updateCoachPhilosophy(coachId, philosophyText);
      alert('指導思想を保存しました。AIコーチがこの内容を参考にしてアドバイスします。');
    } catch (error) {
      console.error('Save philosophy error:', error);
      alert('保存に失敗しました');
    } finally {
      setSavingPhilosophy(false);
    }
  };

  // Save base rules (prohibitions) directly to coach
  const handleSaveRules = async () => {
    setSavingRules(true);
    try {
      await api.updateCoachRules(coachId, baseRulesText);
      alert('基本ルール・禁止事項を保存しました。AIコーチはこのルールを最優先で守ります。');
    } catch (error) {
      console.error('Save rules error:', error);
      alert('保存に失敗しました');
    } finally {
      setSavingRules(false);
    }
  };

  // Save detail settings (tone, recommendations, greetings)
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await api.updateCoachDetails(coachId, {
        speakingTone,
        recommendations,
        greetings,
      });
      alert('詳細設定を保存しました。AIコーチがこの設定を参考にしてアドバイスします。');
    } catch (error) {
      console.error('Save settings error:', error);
      alert('保存に失敗しました');
    } finally {
      setSavingSettings(false);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('JPEG、PNG、GIF、WebP形式の画像のみ対応しています。');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('ファイルサイズは5MB以下にしてください。');
      return;
    }

    setUploadingAvatar(true);
    try {
      const updatedCoach = await api.uploadCoachAvatar(coachId, file);
      setCoachAvatarUrl(updatedCoach.avatarUrl || null);
      alert('アバター画像をアップロードしました。');
    } catch (error) {
      console.error('Upload avatar error:', error);
      alert('アップロードに失敗しました。');
    } finally {
      setUploadingAvatar(false);
      // Reset file input
      e.target.value = '';
    }
  };

  // Handle avatar delete
  const handleAvatarDelete = async () => {
    if (!confirm('アバター画像を削除しますか？')) return;

    setUploadingAvatar(true);
    try {
      await api.deleteCoachAvatar(coachId);
      setCoachAvatarUrl(null);
      alert('アバター画像を削除しました。');
    } catch (error) {
      console.error('Delete avatar error:', error);
      alert('削除に失敗しました。');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Save basic coach settings (all settings at once)
  const handleSaveBasic = async () => {
    setSavingBasic(true);
    try {
      // Save basic info
      await api.updateCoachBasic(coachId, {
        name: coachName,
        specialty: coachSpecialty,
        color: coachColor,
      });
      // Save system prompt
      await api.updateCoachPrompt(coachId, { systemPrompt });
      // Save personality settings
      await api.updateCoachPersonalitySettings(coachId, { personalitySettings });
      // Save response style
      await api.updateCoachResponseStyle(coachId, { responseStyle });
      // Save knowledge scope
      await api.updateCoachKnowledgeScope(coachId, { knowledgeScope });

      alert('基本設定を保存しました。AIコーチの動作に反映されます。');
    } catch (error) {
      console.error('Save basic error:', error);
      alert('保存に失敗しました');
    } finally {
      setSavingBasic(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingId) {
        const updated = await api.updateTeachingContent(editingId, formData);
        setContents(contents.map((c) => (c.id === editingId ? updated : c)));
      } else {
        const created = await api.createTeachingContent({
          coachId,
          ...formData,
        });
        setContents([created, ...contents]);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData(initialFormData);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (content: TeachingContent) => {
    setFormData({
      category: content.category,
      title: content.title,
      titleEn: content.titleEn || '',
      content: content.content,
      contentEn: content.contentEn || '',
      tags: content.tags || '',
      priority: content.priority,
    });
    setEditingId(content.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(i18n.language === 'ja' ? '削除しますか？' : 'Delete this content?')) {
      return;
    }

    try {
      await api.deleteTeachingContent(id);
      setContents(contents.filter((c) => c.id !== id));
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete');
    }
  };

  const handleToggleActive = async (content: TeachingContent) => {
    try {
      const updated = await api.updateTeachingContent(content.id, {
        isActive: content.isActive ? 0 : 1,
      });
      setContents(contents.map((c) => (c.id === content.id ? updated : c)));
    } catch (error) {
      console.error('Toggle error:', error);
    }
  };

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? (i18n.language === 'ja' ? cat.name : cat.nameEn) : categoryId;
  };

  // Split text into chunks for processing large content
  const splitTextIntoChunks = (text: string, chunkSize: number = 4000): string[] => {
    const chunks: string[] = [];
    const lines = text.split('\n');
    let currentChunk = '';

    for (const line of lines) {
      // If adding this line would exceed chunk size, save current chunk and start new one
      if (currentChunk.length + line.length + 1 > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      currentChunk += line + '\n';
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  };

  // Parse progress state
  const [parseProgress, setParseProgress] = useState<{ current: number; total: number } | null>(null);

  // Parse and analyze the raw content
  const handleParse = async () => {
    if (!rawContent.trim()) return;

    setParsing(true);
    setParseProgress(null);

    try {
      const allItems: ParsedItem[] = [];

      // If content is large, split into chunks
      if (rawContent.length > 5000) {
        const chunks = splitTextIntoChunks(rawContent, 4000);
        setParseProgress({ current: 0, total: chunks.length });

        for (let i = 0; i < chunks.length; i++) {
          setParseProgress({ current: i + 1, total: chunks.length });

          try {
            const result = await api.parseTeachingContent({
              rawContent: chunks[i],
              sourceType: 'other',
              sourceUrl: undefined,
            });

            if (result.success && result.items.length > 0) {
              allItems.push(...result.items.map(item => ({ ...item, selected: true })));
            }
          } catch (chunkError) {
            console.error(`Error parsing chunk ${i + 1}:`, chunkError);
            // Continue with next chunk even if one fails
          }

          // Small delay between API calls to avoid rate limiting
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      } else {
        // Process small content normally
        const result = await api.parseTeachingContent({
          rawContent,
          sourceType: 'other',
          sourceUrl: undefined,
        });

        if (result.success && result.items.length > 0) {
          allItems.push(...result.items.map(item => ({ ...item, selected: true })));
        }
      }

      if (allItems.length > 0) {
        setParsedItems(allItems);
        setShowReview(true);
      } else {
        alert(i18n.language === 'ja'
          ? '内容を解析できませんでした。もう少し詳細な内容を入力してください。'
          : 'Could not parse content. Please provide more detailed content.');
      }
    } catch (error) {
      console.error('Parse error:', error);
      alert(i18n.language === 'ja'
        ? '解析中にエラーが発生しました'
        : 'Error parsing content');
    } finally {
      setParsing(false);
      setParseProgress(null);
    }
  };

  const handleImportSave = async () => {
    const selectedItems = parsedItems.filter(item => item.selected);
    if (selectedItems.length === 0) return;

    setImportingSaving(true);
    try {
      const newContents: TeachingContent[] = [];
      for (const item of selectedItems) {
        const created = await api.createTeachingContent({
          coachId,
          category: item.category,
          title: item.title,
          content: item.content,
          tags: item.tags,
          priority: item.priority,
        });
        newContents.push(created);
      }
      setContents([...newContents, ...contents]);

      // Reset state
      setShowReview(false);
      setRawContent('');
      setParsedItems([]);
      setViewMode('list');

      alert(i18n.language === 'ja'
        ? `${newContents.length}件の指導内容を追加しました`
        : `Added ${newContents.length} teaching contents`);
    } catch (error) {
      console.error('Import save error:', error);
      alert('Failed to save');
    } finally {
      setImportingSaving(false);
    }
  };

  const toggleItemSelection = (index: number) => {
    setParsedItems(items =>
      items.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const updateParsedItem = (index: number, field: keyof ParsedItem, value: string | number) => {
    setParsedItems(items =>
      items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          KIM CHUNG TAE コーチ 指導思想管理
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          コーチの指導思想・哲学を入力してください。AIがこの内容を参考にして選手にアドバイスします。
        </p>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setViewMode('basic')}
          className={`flex-1 min-w-[100px] py-3 px-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-sm ${
            viewMode === 'basic'
              ? 'bg-blue-500 text-white'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
          }`}
        >
          <User className="w-4 h-4" />
          基本設定
        </button>
        <button
          onClick={() => setViewMode('philosophy')}
          className={`flex-1 min-w-[100px] py-3 px-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-sm ${
            viewMode === 'philosophy'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          指導思想
        </button>
        <button
          onClick={() => setViewMode('rules')}
          className={`flex-1 min-w-[100px] py-3 px-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-sm ${
            viewMode === 'rules'
              ? 'bg-red-500 text-white'
              : 'bg-red-50 text-red-700 hover:bg-red-100'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          禁止事項
        </button>
        <button
          onClick={() => setViewMode('settings')}
          className={`flex-1 min-w-[100px] py-3 px-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-sm ${
            viewMode === 'settings'
              ? 'bg-purple-500 text-white'
              : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
          }`}
        >
          <Settings className="w-4 h-4" />
          詳細設定
        </button>
        <button
          onClick={() => setViewMode('details')}
          className={`flex-1 min-w-[100px] py-3 px-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-sm ${
            viewMode === 'details'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          詳細追加
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`flex-1 min-w-[100px] py-3 px-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-sm ${
            viewMode === 'list'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          一覧 ({contents.length})
        </button>
      </div>

      {/* Basic Settings View - Coach profile, system prompt, personality, response style, knowledge scope */}
      {viewMode === 'basic' && (
        <div className="space-y-6">
          {/* Coach Basic Info */}
          <div className="card p-6 border-blue-200">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-blue-700 mb-2 flex items-center gap-2">
                <User className="w-5 h-5" />
                コーチ基本情報
              </h2>
              <p className="text-sm text-gray-600">
                コーチの名前、専門分野、テーマカラーを設定します。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  コーチ名
                </label>
                <input
                  type="text"
                  value={coachName}
                  onChange={(e) => setCoachName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: KIM CHUNG TAE"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  専門分野
                </label>
                <input
                  type="text"
                  value={coachSpecialty}
                  onChange={(e) => setCoachSpecialty(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: リカーブアーチェリー、メンタルコーチング"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  テーマカラー
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={coachColor}
                    onChange={(e) => setCoachColor(e.target.value)}
                    className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={coachColor}
                    onChange={(e) => setCoachColor(e.target.value)}
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  アバター画像
                </label>
                <div className="flex items-center gap-4">
                  {/* Avatar preview */}
                  <div className="relative">
                    {coachAvatarUrl ? (
                      <img
                        src={coachAvatarUrl}
                        alt="Coach avatar"
                        className="w-20 h-20 rounded-full object-cover border-2 border-gray-300"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                        <Image className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  {/* Upload/Delete buttons */}
                  <div className="flex flex-col gap-2">
                    <label className="btn btn-secondary px-4 py-2 cursor-pointer flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      <span>アップロード</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleAvatarUpload}
                        disabled={uploadingAvatar}
                        className="hidden"
                      />
                    </label>
                    {coachAvatarUrl && (
                      <button
                        type="button"
                        onClick={handleAvatarDelete}
                        disabled={uploadingAvatar}
                        className="btn px-4 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>削除</span>
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  JPEG、PNG、GIF、WebP形式、5MB以下
                </p>
              </div>
            </div>
          </div>

          {/* System Prompt */}
          <div className="card p-6 border-green-200">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-green-700 mb-2 flex items-center gap-2">
                <Brain className="w-5 h-5" />
                システムプロンプト
              </h2>
              <p className="text-sm text-gray-600">
                AIコーチの基本的な振る舞いを定義するシステムプロンプトです。
                これはAIに対する直接的な指示となります。
              </p>
            </div>

            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-48 p-4 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm resize-y font-mono"
              placeholder={`例:
あなたはKIM CHUNG TAEコーチとして、アーチェリーの指導を行います。
選手の質問に対して、以下の点を意識して回答してください：
- 技術的な説明は具体的かつ分かりやすく
- 安全面を最優先に考慮
- 励ましの言葉を添えながら指導`}
            />
          </div>

          {/* Personality Settings */}
          <div className="card p-6 border-amber-200">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-amber-700 mb-2 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                性格設定
              </h2>
              <p className="text-sm text-gray-600">
                コーチの性格・キャラクターを設定します。
                厳しい/優しい、フォーマル/カジュアルなどのバランスを調整できます。
              </p>
            </div>

            <textarea
              value={personalitySettings}
              onChange={(e) => setPersonalitySettings(e.target.value)}
              className="w-full h-40 p-4 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm resize-y"
              placeholder={`例:
【性格タイプ】
- 厳しさレベル: 中程度（必要な時は厳しく、基本は優しく）
- 話し方: フォーマル寄り（敬語を基本とする）
- 熱意: 高い（情熱的に指導する）

【コミュニケーションスタイル】
- 質問には丁寧に答える
- ミスを指摘する時も励ましを忘れない
- 褒める時はしっかり褒める`}
            />
          </div>

          {/* Response Style */}
          <div className="card p-6 border-indigo-200">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-indigo-700 mb-2 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                応答スタイル
              </h2>
              <p className="text-sm text-gray-600">
                AIの回答フォーマットを設定します。
                回答の長さ、絵文字の使用、箇条書きの使用などを調整できます。
              </p>
            </div>

            <textarea
              value={responseStyle}
              onChange={(e) => setResponseStyle(e.target.value)}
              className="w-full h-40 p-4 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-y"
              placeholder={`例:
【回答の長さ】
- 基本は簡潔に（3-5文程度）
- 技術的な説明は詳しく

【フォーマット】
- 箇条書きを積極的に使用
- 重要なポイントは強調
- ステップバイステップで説明

【絵文字・表現】
- 絵文字は控えめに使用
- 「！」は適度に使用
- 「〜」などの記号は使わない`}
            />
          </div>

          {/* Knowledge Scope */}
          <div className="card p-6 border-cyan-200">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-cyan-700 mb-2 flex items-center gap-2">
                <Target className="w-5 h-5" />
                知識範囲
              </h2>
              <p className="text-sm text-gray-600">
                AIコーチが回答できるトピックの範囲を設定します。
                専門外の質問に対する対応方法も定義できます。
              </p>
            </div>

            <textarea
              value={knowledgeScope}
              onChange={(e) => setKnowledgeScope(e.target.value)}
              className="w-full h-40 p-4 border border-cyan-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm resize-y"
              placeholder={`例:
【回答可能なトピック】
- アーチェリーの技術全般（フォーム、射法、など）
- メンタルトレーニング
- 練習方法・計画
- 道具の選び方・調整
- 試合での心構え

【回答を控えるトピック】
- 医療的なアドバイス → 「専門医に相談してください」
- 他のコーチの批評 → 丁重にお断り
- アーチェリー以外の競技 → 「専門外です」

【不明な質問への対応】
「申し訳ありませんが、その点については確かな情報を持っていません。」`}
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveBasic}
              disabled={savingBasic}
              className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-2 px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {savingBasic ? '保存中...' : '基本設定を保存'}
            </button>
          </div>
        </div>
      )}

      {/* Philosophy View - Direct text input, no parsing */}
      {viewMode === 'philosophy' && (
        <div className="card p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              指導思想・哲学（全文）
            </h2>
            <p className="text-sm text-gray-600">
              KIM CHUNG TAEコーチの指導思想をそのまま入力してください。
              <strong>15000文字以上でもOK</strong> - AIコーチがこの全文を参考にして選手にアドバイスします。
            </p>
          </div>

          <textarea
            value={philosophyText}
            onChange={(e) => setPhilosophyText(e.target.value)}
            className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm resize-y"
            placeholder={`ここにKIM CHUNG TAEコーチの指導思想を入力してください。

長い文章でも大丈夫です。分割せずにそのまま保存されます。

例：
- アーチェリーに対する基本的な考え方
- 技術指導の哲学
- メンタルコーチングの方針
- 練習に対する姿勢
- 試合での心構え
- 選手との向き合い方

...など、コーチの指導に関する全ての考えを自由に書いてください。`}
          />

          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-gray-500">
              {philosophyText.length > 0 ? `${philosophyText.length.toLocaleString()}文字` : ''}
            </span>
            <button
              onClick={handleSavePhilosophy}
              disabled={!philosophyText.trim() || savingPhilosophy}
              className="btn-primary flex items-center gap-2 px-6 py-3"
            >
              <Save className="w-5 h-5" />
              {savingPhilosophy ? '保存中...' : '指導思想を保存'}
            </button>
          </div>

          {philosophyText.length > 0 && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg text-sm text-green-700">
              保存すると、AIコーチがチャット時にこの内容全体を参照してアドバイスを行います。
            </div>
          )}
        </div>
      )}

      {/* Rules View - Base rules and prohibitions */}
      {viewMode === 'rules' && (
        <div className="card p-6 border-red-200">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-red-700 mb-2 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              基本ルール・禁止事項
            </h2>
            <p className="text-sm text-gray-600">
              AIコーチが<strong className="text-red-600">絶対に守るべきルール・禁止事項</strong>を記載してください。
              ここに記載された内容は、指導思想よりも優先して適用されます。
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-700">
              <strong>例：</strong>
            </p>
            <ul className="text-sm text-red-600 mt-1 ml-4 list-disc">
              <li>特定の道具やブランドを勧めない</li>
              <li>医療的なアドバイスをしない</li>
              <li>他のコーチや選手の批判をしない</li>
              <li>危険な練習方法を提案しない</li>
            </ul>
          </div>

          <textarea
            value={baseRulesText}
            onChange={(e) => setBaseRulesText(e.target.value)}
            className="w-full h-64 p-4 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm resize-y"
            placeholder={`禁止事項や基本ルールを記載してください。

例：
【禁止事項】
- 特定の道具メーカーやブランドを推薦しない
- 他のコーチや選手を批判しない
- 医療的な診断やアドバイスをしない
- 怪我につながる可能性のある練習方法を提案しない

【基本ルール】
- 必ず安全を最優先にアドバイスする
- 選手の体調を確認してからアドバイスを行う
- 分からないことは「わかりません」と正直に答える`}
          />

          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-gray-500">
              {baseRulesText.length > 0 ? `${baseRulesText.length.toLocaleString()}文字` : ''}
            </span>
            <button
              onClick={handleSaveRules}
              disabled={savingRules}
              className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {savingRules ? '保存中...' : '禁止事項を保存'}
            </button>
          </div>

          {baseRulesText.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg text-sm text-red-700">
              保存すると、AIコーチはこのルールを<strong>最優先</strong>で守ります。指導思想よりも優先されます。
            </div>
          )}
        </div>
      )}

      {/* Settings View - Detailed coach settings (tone, recommendations, greetings) */}
      {viewMode === 'settings' && (
        <div className="card p-6 border-purple-200">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-purple-700 mb-2 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              詳細設定
            </h2>
            <p className="text-sm text-gray-600">
              AIコーチの口調、おすすめ、挨拶などの詳細設定を行います。
            </p>
          </div>

          {/* Speaking Tone */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              口調・話し方
            </label>
            <p className="text-xs text-gray-500 mb-2">
              コーチがどのような口調で話すかを設定します。敬語、タメ口、厳しい口調、優しい口調など。
            </p>
            <textarea
              value={speakingTone}
              onChange={(e) => setSpeakingTone(e.target.value)}
              className="w-full h-32 p-4 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm resize-y"
              placeholder={`例：
- 敬語を基本としつつ、親しみやすい口調で話す
- 「〜ですね」「〜ましょう」など優しい語尾を使う
- 時々「頑張りましょう！」などの励ましを入れる
- 怒らず、常に前向きな言葉で指導する`}
            />
          </div>

          {/* Recommendations */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              おすすめ（道具、練習方法など）
            </label>
            <p className="text-xs text-gray-500 mb-2">
              選手におすすめしたい道具、練習方法、参考資料などを記載してください。
            </p>
            <textarea
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              className="w-full h-40 p-4 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm resize-y"
              placeholder={`例：
【おすすめの道具】
- 初心者には○○のリムをおすすめする
- 矢はカーボン製を推奨

【おすすめの練習方法】
- 毎日の素引き練習を重視
- 鏡を見ながらのフォームチェック

【参考資料】
- 「○○」という本がおすすめ
- YouTubeの「○○」チャンネルが参考になる`}
            />
          </div>

          {/* Greetings */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              挨拶・定型句
            </label>
            <p className="text-xs text-gray-500 mb-2">
              会話の最初や最後に使う挨拶、よく使うフレーズなどを設定します。
            </p>
            <textarea
              value={greetings}
              onChange={(e) => setGreetings(e.target.value)}
              className="w-full h-32 p-4 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm resize-y"
              placeholder={`例：
【挨拶】
- 「こんにちは！今日も一緒に頑張りましょう！」
- 「お疲れ様でした。また一緒に練習しましょうね。」

【よく使うフレーズ】
- 「焦らず、一歩ずつ上達していきましょう」
- 「大丈夫、あなたならできます！」`}
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <span className="text-sm text-gray-500">
              {(speakingTone.length + recommendations.length + greetings.length) > 0
                ? `合計 ${(speakingTone.length + recommendations.length + greetings.length).toLocaleString()}文字`
                : ''}
            </span>
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="bg-purple-500 hover:bg-purple-600 text-white flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {savingSettings ? '保存中...' : '詳細設定を保存'}
            </button>
          </div>

          {(speakingTone.length > 0 || recommendations.length > 0 || greetings.length > 0) && (
            <div className="mt-4 p-3 bg-purple-50 rounded-lg text-sm text-purple-700">
              保存すると、AIコーチがこれらの設定を参考にして選手とコミュニケーションします。
            </div>
          )}
        </div>
      )}

      {/* Details View - AI parsing for additional structured content */}
      {viewMode === 'details' && !showReview && (
        <div className="card p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              詳細な指導内容を追加（オプション）
            </h2>
            <p className="text-sm text-gray-600">
              特定のトピック（フォーム、メンタル、練習方法など）について詳細なメモを追加したい場合はこちら。
              AIが自動的に分類・整理します。
            </p>
          </div>

          <textarea
            value={rawContent}
            onChange={(e) => setRawContent(e.target.value)}
            className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm resize-none"
            placeholder={`例:

【フォームについて】
スタンスは肩幅に開き、両足に均等に体重をかける。
アンカーは顎の下、同じ位置に毎回つける。

【メンタルコーチング】
試合では緊張するのは当たり前。
緊張を敵と思わず、味方にする。`}
          />

          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-gray-500">
              {rawContent.length > 0 ? `${rawContent.length}文字` : ''}
            </span>
            <button
              onClick={handleParse}
              disabled={!rawContent.trim() || parsing}
              className="btn-primary flex items-center gap-2 px-6 py-3"
            >
              <Sparkles className="w-5 h-5" />
              {parsing
                ? parseProgress
                  ? `AI解析中... (${parseProgress.current}/${parseProgress.total})`
                  : 'AI解析中...'
                : 'AIで整理・分類する'}
            </button>
          </div>
        </div>
      )}

      {/* Review View */}
      {viewMode === 'details' && showReview && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                解析結果を確認
              </h2>
              <p className="text-sm text-gray-600">
                {parsedItems.length}件の指導内容が抽出されました。内容を確認・編集して保存してください。
              </p>
            </div>
            <button
              onClick={() => {
                setShowReview(false);
                setParsedItems([]);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto mb-4">
            {parsedItems.map((item, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${item.selected ? 'border-primary-300 bg-primary-50/30' : 'border-gray-200 opacity-50'}`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleItemSelection(index)}
                    className={`mt-1 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                      item.selected
                        ? 'bg-primary-500 text-white'
                        : 'border-2 border-gray-300'
                    }`}
                  >
                    {item.selected && <Check className="w-3 h-3" />}
                  </button>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <select
                        value={item.category}
                        onChange={(e) => updateParsedItem(index, 'category', e.target.value)}
                        className="input text-sm py-1"
                        disabled={!item.selected}
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {i18n.language === 'ja' ? cat.name : cat.nameEn}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={item.priority}
                        onChange={(e) => updateParsedItem(index, 'priority', parseInt(e.target.value) || 0)}
                        className="input text-sm py-1 w-20"
                        min="0"
                        max="100"
                        disabled={!item.selected}
                        placeholder="優先度"
                      />
                    </div>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateParsedItem(index, 'title', e.target.value)}
                      className="input w-full text-sm font-medium"
                      disabled={!item.selected}
                      placeholder="タイトル"
                    />
                    <textarea
                      value={item.content}
                      onChange={(e) => updateParsedItem(index, 'content', e.target.value)}
                      className="input w-full text-sm h-24"
                      disabled={!item.selected}
                      placeholder="内容"
                    />
                    <input
                      type="text"
                      value={item.tags}
                      onChange={(e) => updateParsedItem(index, 'tags', e.target.value)}
                      className="input w-full text-sm"
                      disabled={!item.selected}
                      placeholder="タグ（カンマ区切り）"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setShowReview(false);
                setParsedItems([]);
              }}
              className="btn-secondary"
            >
              戻って編集
            </button>
            <div className="flex gap-3 items-center">
              <span className="text-sm text-gray-500">
                {parsedItems.filter(i => i.selected).length} / {parsedItems.length} 件選択中
              </span>
              <button
                onClick={handleImportSave}
                disabled={parsedItems.filter(i => i.selected).length === 0 || importingSaving}
                className="btn-primary flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {importingSaving ? '保存中...' : '選択した内容を保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                setFormData(initialFormData);
                setEditingId(null);
                setShowForm(true);
              }}
              className="btn-secondary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              手動で追加
            </button>
          </div>

          <div className="space-y-3">
            {contents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium">指導内容がまだありません</p>
                <p className="mt-2 text-sm">
                  「思想を入力」タブでコーチの指導思想を入力してください
                </p>
                <button
                  onClick={() => setViewMode('philosophy')}
                  className="btn-primary mt-4"
                >
                  思想を入力する
                </button>
              </div>
            ) : (
              contents.map((content) => (
                <div
                  key={content.id}
                  className={`card ${content.isActive ? '' : 'opacity-50'}`}
                >
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() =>
                      setExpandedId(expandedId === content.id ? null : content.id)
                    }
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="px-2 py-0.5 text-xs rounded-full bg-primary-100 text-primary-700"
                          >
                            {getCategoryName(content.category)}
                          </span>
                          {content.priority > 0 && (
                            <span className="text-xs text-gray-500">
                              優先度: {content.priority}
                            </span>
                          )}
                          {!content.isActive && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-200 text-gray-600">
                              無効
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900">
                          {i18n.language === 'ja' ? content.title : content.titleEn || content.title}
                        </h3>
                        {content.tags && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {content.tags.split(',').map((tag, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600"
                              >
                                {tag.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(content);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(content.id);
                          }}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {expandedId === content.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedId === content.id && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap text-gray-700">
                          {i18n.language === 'ja'
                            ? content.content
                            : content.contentEn || content.content}
                        </p>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <button
                          onClick={() => handleToggleActive(content)}
                          className={`text-sm ${
                            content.isActive
                              ? 'text-red-600 hover:text-red-700'
                              : 'text-green-600 hover:text-green-700'
                          }`}
                        >
                          {content.isActive ? '無効にする' : '有効にする'}
                        </button>
                        <span className="text-xs text-gray-400">
                          {new Date(content.updatedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Manual Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">
                  {editingId ? '指導内容を編集' : '新しい指導内容'}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    カテゴリ
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="input w-full"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {i18n.language === 'ja' ? cat.name : cat.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    タイトル
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="input w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    内容
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    className="input w-full h-40"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      タグ (カンマ区切り)
                    </label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) =>
                        setFormData({ ...formData, tags: e.target.value })
                      }
                      className="input w-full"
                      placeholder="例: 基礎,スタンス,初心者"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      優先度
                    </label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })
                      }
                      className="input w-full"
                      min="0"
                      max="100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      高いほど優先的にAIが参照します
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="btn-secondary"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? '保存中...' : '保存'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
