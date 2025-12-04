import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Send, Sparkles, Trash2, Plus, Menu, X, MessageSquare, Pencil, Check } from 'lucide-react';
import { api } from '../lib/api';
import type { Coach, ChatMessage, ChatSession } from '../types';

export function ChatPage() {
  const { coachId } = useParams<{ coachId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialMessageSent = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load coach and sessions
  useEffect(() => {
    if (!coachId) return;

    Promise.all([
      api.getCoach(parseInt(coachId)),
      api.getChatSessions(parseInt(coachId)),
    ])
      .then(([coachData, sessionsData]) => {
        setCoach(coachData);
        setSessions(sessionsData);
        // Auto-select first session if exists
        if (sessionsData.length > 0) {
          setCurrentSession(sessionsData[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [coachId]);

  // Load messages when session changes
  useEffect(() => {
    if (!currentSession) {
      setMessages([]);
      return;
    }

    api.getSessionMessages(currentSession.id)
      .then(setMessages)
      .catch(console.error);
  }, [currentSession]);

  // Handle pre-filled message from URL parameter
  useEffect(() => {
    const messageParam = searchParams.get('message');
    if (messageParam && !loading && coach && !initialMessageSent.current) {
      initialMessageSent.current = true;
      // Create a new session and send the message
      handleNewChat(messageParam);
    }
  }, [searchParams, loading, coach, coachId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleNewChat = async (initialMessage?: string) => {
    if (!coachId) return;

    try {
      const session = await api.createChatSession(parseInt(coachId));
      setSessions(prev => [session, ...prev]);
      setCurrentSession(session);
      setMessages([]);
      setSidebarOpen(false);

      if (initialMessage) {
        // Auto-send initial message
        setTimeout(() => {
          setInput(initialMessage);
          handleSendWithSession(session.id, initialMessage);
        }, 100);
      }
    } catch (error) {
      console.error('Create session error:', error);
    }
  };

  const handleSendWithSession = async (sessionId: number, messageContent: string) => {
    if (!messageContent.trim() || sending) return;

    setInput('');
    setSending(true);

    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      sessionId,
      userId: 0,
      coachId: parseInt(coachId!),
      role: 'user',
      content: messageContent,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const { response } = await api.sendSessionMessage(sessionId, messageContent);
      const assistantMsg: ChatMessage = {
        id: Date.now() + 1,
        sessionId,
        userId: 0,
        coachId: parseInt(coachId!),
        role: 'assistant',
        content: response,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Refresh sessions to get updated title
      const updatedSessions = await api.getChatSessions(parseInt(coachId!));
      setSessions(updatedSessions);
    } catch (error) {
      console.error('Send message error:', error);
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
      setInput(messageContent);
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || sending || !coachId) return;

    // If no current session, create one first
    if (!currentSession) {
      await handleNewChat(input.trim());
      return;
    }

    await handleSendWithSession(currentSession.id, input.trim());
  };

  const handleSelectSession = (session: ChatSession) => {
    setCurrentSession(session);
    setSidebarOpen(false);
  };

  const handleDeleteSession = async (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t('chat.deleteSession') || 'このチャットを削除しますか？')) return;

    try {
      await api.deleteChatSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSession?.id === sessionId) {
        setCurrentSession(sessions.find(s => s.id !== sessionId) || null);
      }
    } catch (error) {
      console.error('Delete session error:', error);
    }
  };

  const handleStartEditTitle = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const handleSaveTitle = async (sessionId: number) => {
    if (!editingTitle.trim()) return;

    try {
      const updated = await api.updateChatSession(sessionId, editingTitle.trim());
      setSessions(prev => prev.map(s => s.id === sessionId ? updated : s));
      if (currentSession?.id === sessionId) {
        setCurrentSession(updated);
      }
    } catch (error) {
      console.error('Update session title error:', error);
    } finally {
      setEditingSessionId(null);
      setEditingTitle('');
    }
  };

  const handleGetAdvice = async () => {
    if (sending || !coachId) return;

    // Create a new session for advice if needed
    let session = currentSession;
    if (!session) {
      session = await api.createChatSession(parseInt(coachId));
      setSessions(prev => [session!, ...prev]);
      setCurrentSession(session);
    }

    setSending(true);
    try {
      await api.getAdvice(parseInt(coachId));
      const updatedMessages = await api.getSessionMessages(session.id);
      setMessages(updatedMessages);
    } catch (error) {
      console.error('Get advice error:', error);
    } finally {
      setSending(false);
    }
  };

  if (loading || !coach) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  const coachName = i18n.language === 'ja' ? coach.name : coach.nameEn;
  const coachAvatarUrl = coach.avatarUrl;

  return (
    <div className="flex h-[calc(100dvh-4rem)] bg-gray-50">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile, shown on lg+ */}
      <aside
        className={`fixed lg:relative top-0 bottom-16 left-0 z-50 w-72 bg-gray-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } lg:bottom-0`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between safe-area-top">
          <button
            onClick={() => handleNewChat()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>{t('chat.newChat') || '新しいチャット'}</span>
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden ml-2 p-2 hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              {t('chat.noSessions') || 'チャット履歴がありません'}
            </div>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                onClick={() => handleSelectSession(session)}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  currentSession?.id === session.id
                    ? 'bg-gray-700'
                    : 'hover:bg-gray-800'
                }`}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0 text-gray-400" />
                {editingSessionId === session.id ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={e => setEditingTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveTitle(session.id);
                      if (e.key === 'Escape') setEditingSessionId(null);
                    }}
                    onClick={e => e.stopPropagation()}
                    className="flex-1 bg-gray-600 text-white text-sm px-2 py-1 rounded outline-none"
                    autoFocus
                  />
                ) : (
                  <span className="flex-1 text-sm truncate">{session.title}</span>
                )}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {editingSessionId === session.id ? (
                    <button
                      onClick={() => handleSaveTitle(session.id)}
                      className="p-1 hover:bg-gray-600 rounded"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={e => handleStartEditTitle(session, e)}
                        className="p-1 hover:bg-gray-600 rounded"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={e => handleDeleteSession(session.id, e)}
                        className="p-1 hover:bg-gray-600 rounded text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Footer - Back to coaches */}
        <div className="p-4 border-t border-gray-700 safe-area-bottom">
          <button
            onClick={() => navigate('/coaches')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-full"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t('chat.backToCoaches') || 'コーチ一覧に戻る'}</span>
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        {/* Header */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden mr-3 p-2 -ml-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          {coachAvatarUrl ? (
            <img
              src={coachAvatarUrl}
              alt={coachName}
              className="w-10 h-10 rounded-full object-cover mr-3"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mr-3"
              style={{ backgroundColor: coach.color }}
            >
              {coachName.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-gray-900 truncate">{coachName}</h1>
            <p className="text-xs text-gray-500 truncate">
              {i18n.language === 'ja' ? coach.specialty : coach.specialtyEn}
            </p>
          </div>
        </header>

        {/* Messages - scrollable area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
          {(!currentSession && messages.length === 0) || (messages.length === 0 && currentSession) ? (
            <div className="flex flex-col items-center justify-center h-full">
              {coachAvatarUrl ? (
                <img
                  src={coachAvatarUrl}
                  alt={coachName}
                  className="w-16 h-16 rounded-full object-cover mb-4"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full mb-4 flex items-center justify-center text-white text-2xl font-bold"
                  style={{ backgroundColor: coach.color }}
                >
                  {coachName.charAt(0)}
                </div>
              )}
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {coachName}
              </h2>
              <p className="text-gray-500 text-sm text-center max-w-md">
                {i18n.language === 'ja' ? coach.specialty : coach.specialtyEn}
              </p>
            </div>
          ) : (
            <>
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    coachAvatarUrl ? (
                      <img
                        src={coachAvatarUrl}
                        alt={coachName}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0 mr-2"
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold mr-2"
                        style={{ backgroundColor: coach.color }}
                      >
                        {coachName.charAt(0)}
                      </div>
                    )
                  )}
                  <div
                    className={
                      message.role === 'user'
                        ? 'chat-bubble-user'
                        : 'chat-bubble-assistant'
                    }
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {/* Typing Indicator */}
              {sending && (
                <div className="flex justify-start">
                  {coachAvatarUrl ? (
                    <img
                      src={coachAvatarUrl}
                      alt={coachName}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0 mr-2"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold mr-2"
                      style={{ backgroundColor: coach.color }}
                    >
                      {coachName.charAt(0)}
                    </div>
                  )}
                  <div className="chat-bubble-assistant flex items-center gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Suggestion Buttons - only show when no messages */}
        {messages.length === 0 && (
          <div className="flex-shrink-0 px-4 pb-4">
            <div className="max-w-2xl mx-auto">
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  { text: 'フォームの改善点', icon: '🎯' },
                  { text: 'スコアを伸ばすコツ', icon: '📈' },
                  { text: 'メンタル強化法', icon: '💪' },
                  { text: '練習メニュー提案', icon: '📋' },
                ].map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(suggestion.text);
                      setTimeout(() => {
                        if (!currentSession) {
                          handleNewChat(suggestion.text);
                        } else {
                          handleSendWithSession(currentSession.id, suggestion.text);
                        }
                      }, 100);
                    }}
                    disabled={sending}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
                  >
                    <span>{suggestion.icon}</span>
                    <span>{suggestion.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input - ChatGPT style */}
        <div className="flex-shrink-0 bg-gradient-to-t from-white via-white to-transparent px-4 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="relative flex items-end bg-white border border-gray-300 rounded-2xl shadow-sm focus-within:border-gray-400 focus-within:shadow-md transition-all">
              <textarea
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  // Auto-resize
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={t('chat.placeholder') || '質問してみましょう'}
                className="flex-1 resize-none bg-transparent px-4 py-3 pr-12 text-base outline-none max-h-[200px] min-h-[48px]"
                disabled={sending}
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className={`absolute right-2 bottom-2 p-2 rounded-full transition-colors ${
                  input.trim() && !sending
                    ? 'bg-gray-900 text-white hover:bg-gray-700'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">
              AIコーチはアーチェリーのアドバイスを提供します
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
