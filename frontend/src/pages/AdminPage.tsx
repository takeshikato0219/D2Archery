import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import type { AdminUser, AdminChatSession, AdminChatMessage } from '../types';
import { Users, MessageSquare, BarChart3, Shield, ShieldOff, ChevronRight, ArrowLeft, X } from 'lucide-react';

type Tab = 'dashboard' | 'users' | 'chats';

interface DashboardStats {
  totalUsers: number;
  totalSessions: number;
  totalMessages: number;
}

interface ChatDetail {
  session: AdminChatSession;
  messages: AdminChatMessage[];
}

export function AdminPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [chats, setChats] = useState<AdminChatSession[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    loadData();
  }, [isAdmin, navigate, activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'dashboard') {
        const data = await api.adminGetStats();
        setStats(data);
      } else if (activeTab === 'users') {
        const data = await api.adminGetUsers();
        setUsers(data);
      } else if (activeTab === 'chats') {
        const data = await api.adminGetAllChats();
        setChats(data);
      }
    } catch (err) {
      setError('データの読み込みに失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdmin = async (userId: number, currentIsAdmin: number) => {
    try {
      await api.adminUpdateUser(userId, { isAdmin: currentIsAdmin !== 1 });
      setUsers(users.map(u =>
        u.id === userId ? { ...u, isAdmin: currentIsAdmin === 1 ? 0 : 1 } : u
      ));
    } catch (err) {
      setError('管理者権限の変更に失敗しました');
    }
  };

  const viewChatDetail = async (sessionId: number) => {
    try {
      const data = await api.adminGetChatSession(sessionId);
      setSelectedChat(data);
    } catch (err) {
      setError('チャット詳細の読み込みに失敗しました');
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">管理者ダッシュボード</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            統計
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Users className="w-5 h-5" />
            ユーザー
          </button>
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'chats'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            チャット履歴
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">総ユーザー数</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <MessageSquare className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">チャットセッション数</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <BarChart3 className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">総メッセージ数</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalMessages}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ユーザー</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">メール</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">認証方式</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">登録日</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">管理者</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <Users className="w-4 h-4 text-gray-500" />
                              </div>
                            )}
                            <span className="font-medium text-gray-900">{user.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            user.authProvider === 'google'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {user.authProvider === 'google' ? 'Google' : 'メール'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {new Date(user.createdAt).toLocaleDateString('ja-JP')}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleAdmin(user.id, user.isAdmin)}
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                              user.isAdmin === 1
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {user.isAdmin === 1 ? (
                              <>
                                <Shield className="w-4 h-4" />
                                管理者
                              </>
                            ) : (
                              <>
                                <ShieldOff className="w-4 h-4" />
                                一般
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Chats Tab */}
            {activeTab === 'chats' && !selectedChat && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">タイトル</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ユーザー</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">コーチ</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">メッセージ数</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">更新日</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {chats.map(chat => (
                      <tr key={chat.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {chat.title || '無題'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {chat.userName}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {chat.coachName}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {chat.messageCount}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {new Date(chat.updatedAt).toLocaleDateString('ja-JP')}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => viewChatDetail(chat.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Chat Detail Modal */}
            {activeTab === 'chats' && selectedChat && (
              <div className="bg-white rounded-xl shadow-sm">
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedChat(null)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {selectedChat.session.title || '無題'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {selectedChat.session.userName} → {selectedChat.session.coachName}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedChat(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                  {selectedChat.messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-xs mt-1 ${
                          msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'
                        }`}>
                          {new Date(msg.createdAt).toLocaleString('ja-JP')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
