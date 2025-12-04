import { useEffect, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Calendar as CalendarIcon, X, Target,
  MapPin, Sun, Cloud, CloudRain, Home,
  ChevronLeft, ChevronRight, Smile, Meh, Frown,
  ArrowRight, Mic, MicOff, MessageCircle,
  Video, Upload, Trash2, Search, List, CalendarDays
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, addDays } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import type { Locale } from 'date-fns/locale';
import { api } from '../lib/api';
import type { ScoreLog, ArcheryRound, PracticeMemo, MemoMedia } from '../types';

// Weather icons
const weatherIcons: Record<string, React.ReactNode> = {
  sunny: <Sun className="w-4 h-4 text-yellow-500" />,
  cloudy: <Cloud className="w-4 h-4 text-gray-400" />,
  rainy: <CloudRain className="w-4 h-4 text-blue-400" />,
  indoor: <Home className="w-4 h-4 text-purple-500" />,
};

// Condition emojis
const conditionEmojis: Record<string, { icon: React.ReactNode; color: string }> = {
  excellent: { icon: <Smile className="w-4 h-4" />, color: 'text-green-500' },
  good: { icon: <Smile className="w-4 h-4" />, color: 'text-blue-500' },
  normal: { icon: <Meh className="w-4 h-4" />, color: 'text-gray-500' },
  poor: { icon: <Frown className="w-4 h-4" />, color: 'text-orange-500' },
  bad: { icon: <Frown className="w-4 h-4" />, color: 'text-red-500' },
};

export function ScoresPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [scores, setScores] = useState<ScoreLog[]>([]);
  const [archeryRounds, setArcheryRounds] = useState<ArcheryRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingScore, setEditingScore] = useState<ScoreLog | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [, setMemos] = useState<PracticeMemo[]>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [searchQuery, setSearchQuery] = useState('');

  const dateLocale = i18n.language === 'ja' ? ja : enUS;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [scoresData, roundsData, memosData] = await Promise.all([
        api.getScores({ limit: 100 }),
        api.getArcheryRounds(50).catch(() => []),
        api.getMemos({ limit: 100 }).catch(() => []),
      ]);
      setScores(scoresData);
      setArcheryRounds(roundsData);
      setMemos(memosData);
    } catch (error) {
      console.error('Load scores error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('common.delete') + '?')) return;
    try {
      await api.deleteScore(id);
      await loadData();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  // Get all days in current month for calendar
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get first day of week offset
  const startDayOfWeek = monthStart.getDay();

  // Group scores by date
  const scoresByDate = new Map<string, ScoreLog[]>();
  scores.forEach(score => {
    const dateKey = score.date.split('T')[0];
    if (!scoresByDate.has(dateKey)) {
      scoresByDate.set(dateKey, []);
    }
    scoresByDate.get(dateKey)!.push(score);
  });

  // Group archery rounds by date
  const roundsByDate = new Map<string, ArcheryRound[]>();
  archeryRounds.forEach(round => {
    const dateKey = typeof round.date === 'string'
      ? round.date.split('T')[0]
      : new Date(round.date).toISOString().split('T')[0];
    if (!roundsByDate.has(dateKey)) {
      roundsByDate.set(dateKey, []);
    }
    roundsByDate.get(dateKey)!.push(round);
  });

  // Get scores/rounds for selected date
  const selectedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const selectedScores = selectedDateKey ? scoresByDate.get(selectedDateKey) || [] : [];
  const selectedRounds = selectedDateKey ? roundsByDate.get(selectedDateKey) || [] : [];

  // Filter rounds for list view
  const filteredRounds = useMemo(() => {
    if (!searchQuery.trim()) return archeryRounds;
    const query = searchQuery.toLowerCase();
    return archeryRounds.filter(round => {
      const location = round.location?.toLowerCase() || '';
      const competition = round.competitionName?.toLowerCase() || '';
      const distance = `${round.distance}m`.toLowerCase();
      const score = round.totalScore?.toString() || '';
      return location.includes(query) || competition.includes(query) || distance.includes(query) || score.includes(query);
    });
  }, [archeryRounds, searchQuery]);

  // Sort rounds by date (newest first) for list view
  const sortedRounds = useMemo(() => {
    return [...filteredRounds].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
  }, [filteredRounds]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{t('scores.title')}</h1>
        {/* View Toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'calendar'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            カレンダー
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <List className="w-4 h-4" />
            履歴
          </button>
        </div>
      </div>

      {/* Search Bar (for list view) */}
      {viewMode === 'list' && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="場所、大会名、スコアで検索..."
            className="input pl-10 pr-4"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
      <>
          {/* Compact Date Picker */}
          <div className="relative mb-4">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="w-full card p-3 flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <CalendarIcon className="w-5 h-5 text-primary-600" />
                <div className="text-left">
                  <p className="font-semibold text-gray-900">
                    {selectedDate ? format(selectedDate, 'M月d日 (E)', { locale: dateLocale }) : '日付を選択'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedDate && isSameDay(selectedDate, new Date()) ? '今日' :
                     selectedDate ? format(selectedDate, 'yyyy年', { locale: dateLocale }) : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDate(addDays(selectedDate || new Date(), -1));
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDate(addDays(selectedDate || new Date(), 1));
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </button>

            {/* Dropdown Calendar */}
            {showDatePicker && (
              <div className="absolute top-full left-0 right-0 z-50 mt-2 card p-4 shadow-lg">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-1.5 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-medium text-sm">
                    {format(currentMonth, 'yyyy年 M月', { locale: dateLocale })}
                  </span>
                  <button
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-1.5 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
                    <div
                      key={day}
                      className={`text-center text-xs py-1 ${
                        i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar days (compact) */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: startDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="w-8 h-8" />
                  ))}
                  {daysInMonth.map((day) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayScores = scoresByDate.get(dateKey) || [];
                    const dayRounds = roundsByDate.get(dateKey) || [];
                    const hasData = dayScores.length > 0 || dayRounds.length > 0;
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());
                    const dayOfWeek = day.getDay();

                    return (
                      <button
                        key={dateKey}
                        onClick={() => {
                          setSelectedDate(day);
                          setShowDatePicker(false);
                        }}
                        className={`w-8 h-8 text-xs rounded-full flex items-center justify-center relative transition-all ${
                          isSelected
                            ? 'bg-primary-600 text-white'
                            : isToday
                            ? 'bg-primary-100 text-primary-700 font-bold'
                            : hasData
                            ? 'bg-green-100 hover:bg-green-200 font-medium'
                            : 'hover:bg-gray-100'
                        } ${
                          !isSelected && (dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : '')
                        }`}
                      >
                        {format(day, 'd')}
                        {hasData && !isSelected && (
                          <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-green-500" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Quick buttons */}
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <button
                    onClick={() => {
                      setSelectedDate(new Date());
                      setCurrentMonth(new Date());
                      setShowDatePicker(false);
                    }}
                    className="flex-1 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    今日
                  </button>
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="flex-1 py-1.5 text-sm bg-primary-100 text-primary-700 hover:bg-primary-200 rounded-lg"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Practice Info Form */}
          <QuickPracticeForm
            selectedDate={selectedDate}
            dateLocale={dateLocale}
            onStartScoring={(location, weather, condition) => {
              const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
              const params = new URLSearchParams();
              params.set('autoStart', 'true');
              if (dateStr) params.set('date', dateStr);
              if (location) params.set('location', location);
              if (weather) params.set('weather', weather);
              if (condition) params.set('condition', condition);
              navigate(`/scoring?${params.toString()}`);
            }}
            onOpenMemo={() => {
              setShowMemoModal(true);
            }}
          />

          {/* Selected Date Details */}
          {selectedDate && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  {format(selectedDate, 'M月d日 (E)', { locale: dateLocale })}の記録
                </h3>
                <button
                  onClick={() => {
                    setEditingScore(null);
                    setShowAddModal(true);
                  }}
                  className="text-primary-600 text-sm flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  簡易記録を追加
                </button>
              </div>

              {selectedScores.length === 0 && selectedRounds.length === 0 ? (
                <div className="card p-6 text-center">
                  <Target className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">この日の記録はありません</p>
                  <button
                    onClick={() => {
                      setEditingScore(null);
                      setShowAddModal(true);
                    }}
                    className="text-primary-600 text-sm mt-2"
                  >
                    練習を追加する →
                  </button>
                </div>
              ) : (
                <>
                  {/* Archery Rounds (点取り) */}
                  {selectedRounds.map((round) => (
                    <Link
                      key={`round-${round.id}`}
                      to={`/scoring?roundId=${round.id}`}
                      className="card p-4 block hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Target className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-gray-900">
                            点取り - {round.distanceLabel || `${round.distance}m`}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          round.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {round.status === 'completed' ? '完了' : '進行中'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                        <div>
                          <span className="text-gray-500">スコア</span>
                          <p className="font-bold text-lg text-gray-900">
                            {round.totalScore || 0}
                            <span className="text-sm font-normal text-gray-500">/{round.totalArrows * 10 || '-'}</span>
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">射数</span>
                          <p className="font-bold text-gray-900">{round.ends?.reduce((sum, e) => sum + (e.scores?.length || 0), 0) || 0}本</p>
                        </div>
                        <div>
                          <span className="text-gray-500">エンド</span>
                          <p className="font-bold text-gray-900">{round.ends?.length || 0}/{round.totalEnds || '-'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {round.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {round.location}
                          </span>
                        )}
                        {round.weather && weatherIcons[round.weather]}
                        {round.condition && (
                          <span className={conditionEmojis[round.condition]?.color}>
                            {conditionEmojis[round.condition]?.icon}
                          </span>
                        )}
                      </div>

                      {round.memo && (
                        <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
                          {round.memo}
                        </p>
                      )}

                      <div className="mt-2 text-right">
                        <span className="text-primary-600 text-sm flex items-center justify-end">
                          詳細を見る <ArrowRight className="w-4 h-4 ml-1" />
                        </span>
                      </div>
                    </Link>
                  ))}

                  {/* Score Logs (簡易記録) */}
                  {selectedScores.map((score) => (
                    <div
                      key={score.id}
                      onClick={() => {
                        setEditingScore(score);
                        setShowAddModal(true);
                      }}
                      className="card p-4 cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Target className="w-5 h-5 text-blue-600" />
                          <span className="font-medium text-gray-900">
                            練習記録 - {score.distance}m
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-2xl font-bold text-gray-900">{score.score}</span>
                          <span className="text-gray-500 ml-1">/ {score.maxScore}点</span>
                          <span className="text-gray-500 ml-2">({score.arrowsCount}本)</span>
                        </div>
                        <div
                          className="text-lg font-semibold"
                          style={{
                            color:
                              (score.score / score.maxScore) * 100 >= 80
                                ? '#10b981'
                                : (score.score / score.maxScore) * 100 >= 60
                                ? '#3b82f6'
                                : '#ef4444',
                          }}
                        >
                          {Math.round((score.score / score.maxScore) * 100)}%
                        </div>
                      </div>

                      {score.memo && (
                        <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
                          {score.memo}
                        </p>
                      )}
                    </div>
                  ))}
                </>
              )}

              {/* Quick Add Scoring Button */}
              <Link
                to={`/scoring?autoStart=true&date=${selectedDateKey}`}
                className="card p-4 border-2 border-dashed border-gray-300 flex items-center justify-center gap-2 text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
              >
                <Target className="w-5 h-5" />
                <span>点取りを開始する</span>
              </Link>
            </div>
          )}

        </>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {/* Stats Summary */}
          <div className="card p-4 bg-gradient-to-r from-primary-50 to-blue-50">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary-600">{sortedRounds.length}</p>
                <p className="text-xs text-gray-500">ラウンド</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {sortedRounds.reduce((sum, r) => sum + (r.totalArrows || 0), 0)}
                </p>
                <p className="text-xs text-gray-500">総射数</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {sortedRounds.length > 0
                    ? Math.round(sortedRounds.reduce((sum, r) => sum + (r.totalScore || 0), 0) / sortedRounds.length)
                    : '-'}
                </p>
                <p className="text-xs text-gray-500">平均点</p>
              </div>
            </div>
          </div>

          {/* Results count */}
          {searchQuery && (
            <p className="text-sm text-gray-500">
              {sortedRounds.length}件の結果
            </p>
          )}

          {/* Rounds List */}
          {sortedRounds.length === 0 ? (
            <div className="card p-8 text-center">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {searchQuery ? '検索結果がありません' : '練習記録がありません'}
              </p>
              {!searchQuery && (
                <Link
                  to="/scoring?autoStart=true"
                  className="text-primary-600 text-sm mt-2 inline-block"
                >
                  点取りを開始する →
                </Link>
              )}
            </div>
          ) : (
            sortedRounds.map((round) => (
              <Link
                key={`list-round-${round.id}`}
                to={`/scoring?roundId=${round.id}`}
                className="card p-4 block hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-500">
                      {format(new Date(round.date), 'M月d日 (E)', { locale: dateLocale })}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Target className={`w-5 h-5 ${round.roundType === 'competition' ? 'text-yellow-600' : 'text-green-600'}`} />
                      <span className="font-medium text-gray-900">
                        {round.roundType === 'competition' && round.competitionName
                          ? round.competitionName
                          : `点取り - ${round.distanceLabel || `${round.distance}m`}`}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    round.roundType === 'competition'
                      ? 'bg-yellow-100 text-yellow-700'
                      : round.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {round.roundType === 'competition' ? '大会' : round.status === 'completed' ? '完了' : '進行中'}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">スコア</span>
                    <p className="font-bold text-lg text-gray-900">{round.totalScore || 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">X</span>
                    <p className="font-bold text-gray-900">{round.totalX || 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">10</span>
                    <p className="font-bold text-gray-900">{round.total10 || 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">距離</span>
                    <p className="font-bold text-gray-900">{round.distance}m</p>
                  </div>
                </div>

                {round.location && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                    <MapPin className="w-3 h-3" />
                    {round.location}
                  </div>
                )}

                <div className="mt-2 text-right">
                  <span className="text-primary-600 text-sm flex items-center justify-end">
                    詳細を見る <ArrowRight className="w-4 h-4 ml-1" />
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <PracticeModal
          score={editingScore}
          defaultDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined}
          onClose={() => {
            setShowAddModal(false);
            setEditingScore(null);
          }}
          onSave={async () => {
            setShowAddModal(false);
            setEditingScore(null);
            await loadData();
          }}
          onDelete={editingScore ? () => handleDelete(editingScore.id) : undefined}
          onConsultCoach={(memo) => {
            // Navigate to coaches page with the memo as a pre-filled message
            setShowAddModal(false);
            setEditingScore(null);
            navigate(`/coaches/1?message=${encodeURIComponent(memo)}`);
          }}
        />
      )}

      {/* Memo Modal */}
      {showMemoModal && (
        <MemoModal
          defaultDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined}
          onClose={() => setShowMemoModal(false)}
          onSave={async () => {
            setShowMemoModal(false);
            await loadData();
          }}
          onConsultCoach={(memo) => {
            setShowMemoModal(false);
            navigate(`/coaches/1?message=${encodeURIComponent(memo)}`);
          }}
        />
      )}
    </div>
  );
}

interface PracticeModalProps {
  score: ScoreLog | null;
  defaultDate?: string;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
  onConsultCoach?: (memo: string) => void;
}

function PracticeModal({ score, defaultDate, onClose, onSave, onDelete, onConsultCoach }: PracticeModalProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const [form, setForm] = useState({
    date: score?.date.split('T')[0] || defaultDate || new Date().toISOString().split('T')[0],
    score: score?.score.toString() || '',
    maxScore: score?.maxScore.toString() || '360',
    arrowsCount: score?.arrowsCount.toString() || '36',
    distance: score?.distance.toString() || '18',
    memo: score?.memo || '',
  });

  // Check for Web Speech API support
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ja-JP';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setForm(prev => ({
            ...prev,
            memo: prev.memo + (prev.memo ? ' ' : '') + finalTranscript
          }));
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.score || !form.arrowsCount) return;

    setSaving(true);
    try {
      if (score) {
        await api.updateScore(score.id, {
          date: form.date,
          score: parseInt(form.score),
          maxScore: parseInt(form.maxScore),
          arrowsCount: parseInt(form.arrowsCount),
          distance: parseInt(form.distance),
          memo: form.memo.trim() || undefined,
        });
      } else {
        await api.createScore({
          date: form.date,
          score: parseInt(form.score),
          maxScore: parseInt(form.maxScore),
          arrowsCount: parseInt(form.arrowsCount),
          distance: parseInt(form.distance),
          memo: form.memo.trim() || undefined,
        });
      }
      onSave();
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto safe-area-bottom">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">
            {score ? '記録を編集' : '練習を記録'}
          </h2>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              📅 {t('scores.date')}
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="input"
              required
            />
          </div>

          {/* Score Section */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              スコア記録
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('scores.score')}
                </label>
                <input
                  type="number"
                  value={form.score}
                  onChange={(e) => setForm({ ...form, score: e.target.value })}
                  className="input text-lg font-bold"
                  min="0"
                  placeholder="320"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('scores.maxScore')}
                </label>
                <input
                  type="number"
                  value={form.maxScore}
                  onChange={(e) => setForm({ ...form, maxScore: e.target.value })}
                  className="input"
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('scores.arrows')}
                </label>
                <input
                  type="number"
                  value={form.arrowsCount}
                  onChange={(e) =>
                    setForm({ ...form, arrowsCount: e.target.value })
                  }
                  className="input"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('scores.distance')}
                </label>
                <select
                  value={form.distance}
                  onChange={(e) => setForm({ ...form, distance: e.target.value })}
                  className="input"
                >
                  <option value="18">18m</option>
                  <option value="30">30m</option>
                  <option value="50">50m</option>
                  <option value="70">70m</option>
                </select>
              </div>
            </div>
          </div>

          {/* Memo with Voice Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                📝 {t('scores.memo')}
              </label>
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm transition-all ${
                    isRecording
                      ? 'bg-red-100 text-red-600 animate-pulse'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      <span>停止</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>音声入力</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="relative">
              <textarea
                value={form.memo}
                onChange={(e) => setForm({ ...form, memo: e.target.value })}
                className={`input min-h-[120px] ${isRecording ? 'border-red-300 bg-red-50' : ''}`}
                placeholder={isRecording ? '話してください...' : '今日の調子、気づいたこと、課題など...'}
              />
              {isRecording && (
                <div className="absolute bottom-2 right-2 flex items-center gap-1 text-red-500 text-xs">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  録音中...
                </div>
              )}
            </div>
          </div>

          {/* AI Coach Consultation Button */}
          {form.memo && onConsultCoach && (
            <button
              type="button"
              onClick={() => onConsultCoach(form.memo)}
              className="w-full p-3 flex items-center justify-center gap-2 bg-purple-50 text-purple-700 rounded-lg font-medium hover:bg-purple-100 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              このメモについてAIコーチに相談する
            </button>
          )}

          {/* Quick Scoring Link */}
          <Link
            to={`/scoring?date=${form.date}`}
            className="block w-full p-3 text-center bg-green-50 text-green-700 rounded-lg font-medium hover:bg-green-100 transition-colors"
          >
            🎯 点取りで詳細に記録する
          </Link>

          <div className="flex space-x-3 pt-2">
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="flex-1 py-3 text-red-600 font-medium"
              >
                {t('common.delete')}
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex-1 btn-primary py-3"
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Quick Practice Form Component (displayed below calendar)
interface QuickPracticeFormProps {
  selectedDate: Date | null;
  dateLocale: Locale;
  onStartScoring: (location: string, weather: string, condition: string) => void;
  onOpenMemo: () => void;
}

function QuickPracticeForm({ selectedDate, dateLocale, onStartScoring, onOpenMemo }: QuickPracticeFormProps) {
  const [location, setLocation] = useState('');
  const [weather, setWeather] = useState('sunny');
  const [condition, setCondition] = useState('normal');

  const weatherOptions = [
    { value: 'sunny', label: '☀️ 晴れ' },
    { value: 'cloudy', label: '☁️ 曇り' },
    { value: 'rainy', label: '🌧️ 雨' },
    { value: 'indoor', label: '🏠 室内' },
  ];

  const conditionOptions = [
    { value: 'excellent', label: '😄 絶好調' },
    { value: 'good', label: '🙂 好調' },
    { value: 'normal', label: '😐 普通' },
    { value: 'poor', label: '😕 不調' },
    { value: 'bad', label: '😫 絶不調' },
  ];

  return (
    <div className="card p-4 mb-4">
      <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
        <Target className="w-5 h-5 text-primary-600" />
        {selectedDate ? format(selectedDate, 'M月d日', { locale: dateLocale }) : '今日'}の練習
      </h3>

      {/* Location */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          📍 練習場所
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="input"
          placeholder="例: 〇〇大学アーチェリー場"
        />
      </div>

      {/* Weather & Condition */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            天気
          </label>
          <select
            value={weather}
            onChange={(e) => setWeather(e.target.value)}
            className="input"
          >
            {weatherOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            コンディション
          </label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="input"
          >
            {conditionOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Start Scoring Button */}
      <button
        onClick={() => onStartScoring(location, weather, condition)}
        className="w-full btn-primary py-3 flex items-center justify-center gap-2"
      >
        <Target className="w-5 h-5" />
        点取りを開始する
      </button>

      {/* Memo Button */}
      <button
        onClick={onOpenMemo}
        className="w-full mt-2 py-3 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
      >
        <Plus className="w-5 h-5" />
        メモを追加する
      </button>
    </div>
  );
}

// Simple Memo Modal (no score, just memo)
interface MemoModalProps {
  defaultDate?: string;
  onClose: () => void;
  onSave: () => void;
  onConsultCoach?: (memo: string) => void;
}

function MemoModal({ defaultDate, onClose, onSave, onConsultCoach }: MemoModalProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState<MemoMedia[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const [form, setForm] = useState({
    date: defaultDate || new Date().toISOString().split('T')[0],
    content: '',
    condition: 'normal' as 'excellent' | 'good' | 'normal' | 'poor' | 'bad',
    weather: 'sunny' as 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy' | 'indoor',
    location: '',
  });

  // Check for Web Speech API support
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ja-JP';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setForm(prev => ({
            ...prev,
            content: prev.content + (prev.content ? ' ' : '') + finalTranscript
          }));
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.content.trim() && media.length === 0) return;

    setSaving(true);
    try {
      await api.createMemo({
        date: form.date,
        content: form.content.trim() || '(メディアのみ)',
        condition: form.condition,
        weather: form.weather,
        location: form.location.trim() || undefined,
        media: media.length > 0 ? media : undefined,
      });
      onSave();
    } catch (error) {
      console.error('Save memo error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const uploadedMedia = await api.uploadMemoMedia(file);
        setMedia(prev => [...prev, uploadedMedia]);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('ファイルのアップロードに失敗しました');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeMedia = (index: number) => {
    setMedia(prev => prev.filter((_, i) => i !== index));
  };

  const conditionOptions = [
    { value: 'excellent', label: '😄 絶好調' },
    { value: 'good', label: '🙂 好調' },
    { value: 'normal', label: '😐 普通' },
    { value: 'poor', label: '😕 不調' },
    { value: 'bad', label: '😫 絶不調' },
  ];

  const weatherOptions = [
    { value: 'sunny', label: '☀️ 晴れ' },
    { value: 'cloudy', label: '☁️ 曇り' },
    { value: 'rainy', label: '🌧️ 雨' },
    { value: 'indoor', label: '🏠 室内' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto safe-area-bottom">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">
            📝 今日のメモ
          </h2>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              📅 {t('scores.date')}
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="input"
              required
            />
          </div>

          {/* Condition & Weather */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                調子
              </label>
              <select
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value as typeof form.condition })}
                className="input"
              >
                {conditionOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                天気
              </label>
              <select
                value={form.weather}
                onChange={(e) => setForm({ ...form, weather: e.target.value as typeof form.weather })}
                className="input"
              >
                {weatherOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              📍 場所
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="input"
              placeholder="例: 〇〇大学アーチェリー場"
            />
          </div>

          {/* Memo with Voice Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                📝 メモ
              </label>
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm transition-all ${
                    isRecording
                      ? 'bg-red-100 text-red-600 animate-pulse'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      <span>停止</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>音声入力</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="relative">
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className={`input min-h-[150px] ${isRecording ? 'border-red-300 bg-red-50' : ''}`}
                placeholder={isRecording ? '話してください...' : '今日の調子、気づいたこと、課題など...'}
                required
              />
              {isRecording && (
                <div className="absolute bottom-2 right-2 flex items-center gap-1 text-red-500 text-xs">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  録音中...
                </div>
              )}
            </div>
          </div>

          {/* Media Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📷 動画・画像を追加
            </label>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Upload buttons */}
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    <span>アップロード中...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>ファイルを選択</span>
                  </>
                )}
              </button>
            </div>

            {/* Media preview */}
            {media.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {media.map((item, index) => (
                  <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    {item.type === 'image' ? (
                      <img
                        src={item.url}
                        alt={item.fileName || 'アップロード画像'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-800">
                        <video
                          src={item.url}
                          className="max-w-full max-h-full"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Video className="w-8 h-8 text-white opacity-80" />
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                      <span className="text-white text-xs truncate block">
                        {item.type === 'video' ? '🎥' : '📷'} {item.fileName || 'メディア'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Coach Consultation Button */}
          {form.content && onConsultCoach && (
            <button
              type="button"
              onClick={() => onConsultCoach(form.content)}
              className="w-full p-3 flex items-center justify-center gap-2 bg-purple-50 text-purple-700 rounded-lg font-medium hover:bg-purple-100 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              このメモについてAIコーチに相談する
            </button>
          )}

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-gray-600 font-medium"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || uploading || (!form.content.trim() && media.length === 0)}
              className="flex-1 btn-primary py-3"
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
