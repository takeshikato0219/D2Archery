import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { LogOut, Globe, User, ChevronRight, Target, Settings, Edit2, X, Trophy, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BEST_SCORE_DISTANCES, type BestScores } from '../types';

// Gender options
const GENDER_OPTIONS = [
  { value: 'male', label: '男性', labelEn: 'Male' },
  { value: 'female', label: '女性', labelEn: 'Female' },
  { value: 'other', label: 'その他', labelEn: 'Other' },
] as const;

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user, logout, updateUser, isAdmin } = useAuth();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState(user?.name || '');
  const [editAffiliation, setEditAffiliation] = useState(user?.affiliation || '');
  const [editNickname, setEditNickname] = useState(user?.nickname || '');
  const [editGender, setEditGender] = useState<'male' | 'female' | 'other' | ''>(user?.gender || '');
  const [editBestScores, setEditBestScores] = useState<BestScores>(user?.bestScores || {});

  const handleLanguageChange = async (lang: 'ja' | 'en') => {
    setUpdating(true);
    try {
      await updateUser({ language: lang });
      i18n.changeLanguage(lang);
      setShowLanguageModal(false);
    } catch (error) {
      console.error('Language update error:', error);
    } finally {
      setUpdating(false);
    }
  };

  const openEditModal = () => {
    setEditName(user?.name || '');
    setEditAffiliation(user?.affiliation || '');
    setEditNickname(user?.nickname || '');
    setEditGender(user?.gender || '');
    setEditBestScores(user?.bestScores || {});
    setShowEditModal(true);
  };

  const updateBestScore = (distance: string, field: 'score' | 'date', value: string) => {
    setEditBestScores(prev => {
      const newScores = { ...prev };
      if (field === 'score') {
        const scoreNum = parseInt(value);
        if (value === '' || isNaN(scoreNum)) {
          // Remove the distance if score is empty
          delete newScores[distance];
        } else {
          newScores[distance] = {
            ...newScores[distance],
            score: scoreNum,
          };
        }
      } else if (field === 'date') {
        if (newScores[distance]) {
          newScores[distance] = {
            ...newScores[distance],
            date: value || undefined,
          };
        }
      }
      return newScores;
    });
  };

  const handleSaveProfile = async () => {
    setUpdating(true);
    try {
      // Clean up empty entries
      const cleanedBestScores: BestScores = {};
      Object.entries(editBestScores).forEach(([distance, entry]) => {
        if (entry && entry.score > 0) {
          cleanedBestScores[distance] = entry;
        }
      });

      await updateUser({
        name: editName,
        affiliation: editAffiliation || undefined,
        nickname: editNickname || undefined,
        gender: editGender || undefined,
        bestScores: Object.keys(cleanedBestScores).length > 0 ? cleanedBestScores : undefined,
      });
      setShowEditModal(false);
    } catch (error) {
      console.error('Profile update error:', error);
      alert('更新に失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = () => {
    if (confirm(t('auth.logout') + '?')) {
      logout();
    }
  };

  const isJa = i18n.language === 'ja';

  // Get best scores for display
  const displayBestScores = user?.bestScores
    ? Object.entries(user.bestScores)
        .filter(([, entry]) => entry && entry.score > 0)
        .sort((a, b) => b[1].score - a[1].score)
    : [];

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {t('profile.title')}
      </h1>

      {/* User Info Card */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden mr-4">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-primary-600" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{user?.name}</h2>
              {user?.nickname && (
                <p className="text-sm text-primary-600 font-medium">"{user.nickname}"</p>
              )}
              <p className="text-gray-500 text-sm">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={openEditModal}
            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
          >
            <Edit2 size={20} />
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
          {user?.affiliation && (
            <div className="flex items-center text-sm">
              <span className="text-gray-500 w-16">{isJa ? '所属' : 'Team'}:</span>
              <span className="text-gray-900 font-medium">{user.affiliation}</span>
            </div>
          )}
          {user?.gender && (
            <div className="flex items-center text-sm">
              <span className="text-gray-500 w-16">{isJa ? '性別' : 'Gender'}:</span>
              <span className="text-gray-900">
                {GENDER_OPTIONS.find(g => g.value === user.gender)?.[isJa ? 'label' : 'labelEn']}
              </span>
            </div>
          )}
        </div>

        {/* Best Scores Display */}
        {displayBestScores.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span className="font-medium text-gray-900">
                {isJa ? '自己ベスト' : 'Personal Best'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {displayBestScores.map(([distance, entry]) => (
                <div
                  key={distance}
                  className="bg-gray-50 rounded-lg p-3 border border-gray-100"
                >
                  <div className="text-xs text-gray-500 mb-1">{distance}</div>
                  <div className="text-lg font-bold text-gray-900">{entry.score}</div>
                  {entry.date && (
                    <div className="text-xs text-gray-400">{entry.date}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="card divide-y divide-gray-100">
        <h3 className="text-sm font-medium text-gray-500 px-4 py-3">
          {t('profile.settings')}
        </h3>

        {/* Edit Profile */}
        <button
          onClick={openEditModal}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <User className="w-5 h-5 text-gray-400 mr-3" />
            <span className="text-gray-900">{isJa ? 'プロフィール編集' : 'Edit Profile'}</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        {/* Language Setting */}
        <button
          onClick={() => setShowLanguageModal(true)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <Globe className="w-5 h-5 text-gray-400 mr-3" />
            <span className="text-gray-900">{t('profile.language')}</span>
          </div>
          <div className="flex items-center">
            <span className="text-gray-500 mr-2">
              {user?.language === 'ja' ? '日本語' : 'English'}
            </span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </button>

        {/* Admin: Teaching Content Management */}
        <Link
          to="/admin/teaching"
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <Settings className="w-5 h-5 text-gray-400 mr-3" />
            <span className="text-gray-900">
              {isJa ? '指導内容管理' : 'Teaching Content'}
            </span>
          </div>
          <div className="flex items-center">
            <span className="text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded mr-2">
              Admin
            </span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </Link>

        {/* Admin: Dashboard (only for admins) */}
        {isAdmin && (
          <Link
            to="/admin"
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center">
              <Shield className="w-5 h-5 text-gray-400 mr-3" />
              <span className="text-gray-900">
                {isJa ? '管理者ダッシュボード' : 'Admin Dashboard'}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded mr-2">
                Admin Only
              </span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </Link>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center p-4 hover:bg-gray-50 transition-colors text-red-600"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span>{t('auth.logout')}</span>
        </button>
      </div>

      {/* App Info */}
      <div className="mt-8 text-center">
        <div className="flex items-center justify-center mb-2">
          <Target className="w-6 h-6 text-primary-600 mr-2" />
          <span className="text-lg font-semibold text-gray-900">
            D2 Archery
          </span>
        </div>
        <p className="text-sm text-gray-500">Version 1.0.0</p>
        <p className="text-xs text-gray-400 mt-1">
          Powered by AI Coaching Technology
        </p>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 pt-6 pb-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">{isJa ? 'プロフィール編集' : 'Edit Profile'}</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isJa ? '名前' : 'Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder={isJa ? '名前を入力' : 'Enter name'}
                />
              </div>

              {/* Nickname */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isJa ? '通り名・ニックネーム' : 'Nickname'}
                </label>
                <input
                  type="text"
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder={isJa ? '例: 不動の弓' : 'e.g. The Archer'}
                />
              </div>

              {/* Affiliation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isJa ? '所属' : 'Affiliation'}
                </label>
                <input
                  type="text"
                  value={editAffiliation}
                  onChange={(e) => setEditAffiliation(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder={isJa ? '例: ○○大学アーチェリー部' : 'e.g. University Archery Club'}
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isJa ? '性別' : 'Gender'}
                </label>
                <div className="flex gap-2">
                  {GENDER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setEditGender(editGender === opt.value ? '' : opt.value)}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-all ${
                        editGender === opt.value
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {isJa ? opt.label : opt.labelEn}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {isJa ? '※ランキングのハンデ計算に使用されます' : '* Used for ranking handicap calculation'}
                </p>
              </div>

              {/* Best Scores Section */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <span className="font-medium text-gray-900">
                    {isJa ? '距離別自己ベスト' : 'Personal Best by Distance'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  {isJa ? '各距離のベストスコアを入力してください' : 'Enter your best scores for each distance'}
                </p>

                <div className="space-y-3">
                  {BEST_SCORE_DISTANCES.map((distance) => (
                    <div key={distance} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{distance}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <input
                            type="number"
                            value={editBestScores[distance]?.score || ''}
                            onChange={(e) => updateBestScore(distance, 'score', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                            placeholder={isJa ? '点数' : 'Score'}
                            min="0"
                            max="720"
                          />
                        </div>
                        <div>
                          <input
                            type="date"
                            value={editBestScores[distance]?.date || ''}
                            onChange={(e) => updateBestScore(distance, 'date', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                            disabled={!editBestScores[distance]?.score}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={updating}
                >
                  {isJa ? 'キャンセル' : 'Cancel'}
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={updating || !editName.trim()}
                  className="flex-1 py-3 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {updating ? (isJa ? '保存中...' : 'Saving...') : (isJa ? '保存' : 'Save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Language Modal */}
      {showLanguageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl w-full max-w-lg safe-area-bottom">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-center">
                {t('profile.language')}
              </h2>
            </div>
            <div className="p-4 space-y-2">
              <button
                onClick={() => handleLanguageChange('ja')}
                disabled={updating}
                className={`w-full p-4 rounded-lg text-left flex items-center justify-between ${
                  user?.language === 'ja'
                    ? 'bg-primary-50 border-2 border-primary-500'
                    : 'bg-gray-50 border-2 border-transparent'
                }`}
              >
                <span className="font-medium">日本語</span>
                {user?.language === 'ja' && (
                  <span className="text-primary-600">✓</span>
                )}
              </button>
              <button
                onClick={() => handleLanguageChange('en')}
                disabled={updating}
                className={`w-full p-4 rounded-lg text-left flex items-center justify-between ${
                  user?.language === 'en'
                    ? 'bg-primary-50 border-2 border-primary-500'
                    : 'bg-gray-50 border-2 border-transparent'
                }`}
              >
                <span className="font-medium">English</span>
                {user?.language === 'en' && (
                  <span className="text-primary-600">✓</span>
                )}
              </button>
            </div>
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setShowLanguageModal(false)}
                className="w-full py-3 text-gray-600 font-medium"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
