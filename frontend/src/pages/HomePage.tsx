import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, Target, Award, ArrowRight, Trophy, Calendar, Crown, Medal, Flame, MessageCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, getAssetUrl } from '../lib/api';
import type { ScoreStats, ScoreLog, ArcherRating, DailyRankingEntry, RankingEntry, Coach } from '../types';

export function HomePage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState<ScoreStats | null>(null);
  const [recentScore, setRecentScore] = useState<ScoreLog | null>(null);
  const [archerRating, setArcherRating] = useState<ArcherRating | null>(null);
  const [dailyRankings, setDailyRankings] = useState<DailyRankingEntry[]>([]);
  const [dailyDate, setDailyDate] = useState<string>('');
  const [practiceRankings, setPracticeRankings] = useState<RankingEntry[]>([]);
  const [practicePeriod, setPracticePeriod] = useState<string>('');
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getScoreStats(),
      api.getScores({ limit: 1 }),
      api.getMyArcherRating().catch(() => ({ rating: null })),
      api.getDailyRanking().catch(() => ({ rankings: [], date: '' })),
      api.getPracticeRanking({ period: 'month' }).catch(() => ({ rankings: [], period: '' })),
      api.getCoaches().catch(() => []),
    ])
      .then(([statsData, scoresData, archerRatingData, dailyData, practiceData, coachesData]) => {
        setStats(statsData);
        setRecentScore(scoresData[0] || null);
        setArcherRating(archerRatingData.rating);
        setDailyRankings(dailyData.rankings || []);
        setDailyDate(dailyData.date || '');
        setPracticeRankings(practiceData.rankings || []);
        setPracticePeriod(practiceData.period || '');
        setCoaches(coachesData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'declining':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      default:
        return <Minus className="w-5 h-5 text-gray-400" />;
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-500">{rank}</span>;
    }
  };

  const getGenderIcon = (gender: string) => {
    if (gender === 'female') {
      return <span className="text-pink-500 text-xs">♀</span>;
    } else if (gender === 'male') {
      return <span className="text-blue-500 text-xs">♂</span>;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      {/* Header - Top Priority */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('home.welcome')}, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-gray-500 mt-1">今日も練習を頑張りましょう</p>
      </div>

      {/* Archer Rating Card */}
      {archerRating && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-500">あなたのレーティング</h2>
            <Link to="/ranking" className="text-primary-600 text-sm">
              詳細を見る →
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6">
            {/* Rating Score */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="w-8 h-8" style={{ color: archerRating.rankColor }} />
                <span className="text-4xl font-bold" style={{ color: archerRating.rankColor }}>
                  {archerRating.rating.toFixed(2)}
                </span>
              </div>
              <span
                className="px-4 py-1 rounded-full text-sm font-bold"
                style={{ backgroundColor: archerRating.rankColor, color: archerRating.rank === 'SA' ? '#000' : '#fff' }}
              >
                {archerRating.rank}ランク
              </span>
            </div>
            {/* Breakdown */}
            <div className="border-l border-gray-200 pl-6 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-600">試合:</span>
                <span className="font-bold text-gray-900">{archerRating.competitionRating.toFixed(2)}</span>
                <span className="text-xs text-gray-400">({archerRating.competitionCount}回)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-600">練習:</span>
                <span className="font-bold text-gray-900">{archerRating.practiceRating.toFixed(2)}</span>
                <span className="text-xs text-gray-400">({archerRating.practiceCount}回)</span>
              </div>
            </div>
          </div>
          {/* Rating Legend */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded bg-yellow-400 text-black font-bold">SA 16+</span>
              <span className="px-2 py-0.5 rounded bg-gray-400 text-white font-bold">AA 13+</span>
              <span className="px-2 py-0.5 rounded bg-amber-600 text-white font-bold">A 10+</span>
              <span className="px-2 py-0.5 rounded bg-blue-500 text-white font-bold">BB 7+</span>
              <span className="px-2 py-0.5 rounded bg-green-500 text-white font-bold">B 5+</span>
              <span className="px-2 py-0.5 rounded bg-gray-500 text-white font-bold">C 0+</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && stats.totalSessions > 0 ? (
        <>
          {/* Recent Score Card */}
          {recentScore && (
            <div className="card p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-gray-500">
                  {t('home.recentScore')}
                </h2>
                <span className="text-xs text-gray-400">
                  {new Date(recentScore.date).toLocaleDateString(i18n.language)}
                </span>
              </div>
              <div className="flex items-center">
                <div
                  className="relative w-24 h-24 rounded-full score-ring mr-6"
                  style={{
                    '--score-percent': (recentScore.score / recentScore.maxScore) * 100,
                    '--ring-color': '#3b82f6',
                  } as React.CSSProperties}
                >
                  <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">
                      {recentScore.score}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    / {recentScore.maxScore}点 ({recentScore.arrowsCount}本)
                  </p>
                  <div className="flex items-center mt-2">
                    {getTrendIcon(stats.recentTrend)}
                    <span className="ml-2 text-sm">
                      {t(`home.trend.${stats.recentTrend}`)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="card p-4">
              <div className="flex items-center text-gray-500 mb-2">
                <Target className="w-4 h-4 mr-2" />
                <span className="text-xs">{t('home.totalSessions')}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center text-gray-500 mb-2">
                <Award className="w-4 h-4 mr-2" />
                <span className="text-xs">{t('home.highScore')}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.highScore}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center text-gray-500 mb-2">
                <span className="text-xs">{t('home.totalArrows')}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalArrows.toLocaleString()}
              </p>
            </div>
            <div className="card p-4">
              <div className="flex items-center text-gray-500 mb-2">
                <span className="text-xs">{t('home.averageScore')}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.averageScore}%</p>
            </div>
          </div>
        </>
      ) : (
        <div className="card p-8 text-center mb-6">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('home.noScores')}
          </h3>
          <p className="text-gray-500 mb-4">{t('home.startRecording')}</p>
          <Link to="/scores" className="btn-primary inline-flex items-center">
            {t('scores.addScore')}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      )}

      {/* Today's National Ranking Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">本日の全国ランキング</h2>
          </div>
          <Link to="/ranking" className="text-primary-600 text-sm font-medium">
            もっと見る
          </Link>
        </div>
        {dailyDate && (
          <p className="text-xs text-gray-500 mb-3">{dailyDate}</p>
        )}
        {dailyRankings.length > 0 ? (
          <div className="card divide-y divide-gray-100">
            {dailyRankings.slice(0, 5).map((entry) => (
              <div
                key={`${entry.userId}-${entry.rank}`}
                className={`flex items-center p-3 ${
                  entry.userId === user?.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="w-8 flex justify-center">
                  {getRankIcon(entry.rank)}
                </div>
                <div className="flex-1 min-w-0 ml-3">
                  <div className="flex items-center gap-1">
                    <p className="font-medium text-gray-900 truncate">
                      {entry.userName}
                      {entry.userId === user?.id && (
                        <span className="ml-1 text-xs text-blue-600">(You)</span>
                      )}
                    </p>
                    {getGenderIcon(entry.gender)}
                  </div>
                  {entry.nickname && (
                    <p className="text-xs text-primary-600 truncate">"{entry.nickname}"</p>
                  )}
                  <p className="text-xs text-gray-500">
                    {entry.distanceLabel} / {entry.roundType === 'competition' ? '試合' : '練習'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    {entry.score}
                    <span className="text-sm font-normal text-gray-500">点</span>
                  </p>
                  {entry.adjustedScore !== entry.score && (
                    <p className="text-xs text-gray-400">
                      (補正: {entry.adjustedScore})
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-6 text-center text-gray-500">
            <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm">本日のスコアはまだありません</p>
            <Link to="/scoring" className="text-primary-600 text-sm font-medium mt-2 inline-block">
              点数を入力する →
            </Link>
          </div>
        )}
      </div>

      {/* Monthly Practice Ranking Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900">今月の練習量ランキング</h2>
          </div>
          <Link to="/ranking" className="text-primary-600 text-sm font-medium">
            もっと見る
          </Link>
        </div>
        {practicePeriod && (
          <p className="text-xs text-gray-500 mb-3">{practicePeriod}</p>
        )}
        {practiceRankings.length > 0 ? (
          <div className="card divide-y divide-gray-100">
            {practiceRankings.slice(0, 5).map((entry) => (
              <div
                key={`practice-${entry.userId}-${entry.rank}`}
                className={`flex items-center p-3 ${
                  entry.userId === user?.id ? 'bg-orange-50' : ''
                }`}
              >
                <div className="w-8 flex justify-center">
                  {getRankIcon(entry.rank)}
                </div>
                <div className="flex-1 min-w-0 ml-3">
                  <div className="flex items-center gap-1">
                    <p className="font-medium text-gray-900 truncate">
                      {entry.userName}
                      {entry.userId === user?.id && (
                        <span className="ml-1 text-xs text-orange-600">(You)</span>
                      )}
                    </p>
                    {entry.gender && getGenderIcon(entry.gender)}
                  </div>
                  {entry.nickname && (
                    <p className="text-xs text-primary-600 truncate">"{entry.nickname}"</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    {entry.totalArrows?.toLocaleString()}
                    <span className="text-sm font-normal text-gray-500">本</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-6 text-center text-gray-500">
            <Flame className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm">今月の練習記録はまだありません</p>
            <Link to="/scoring" className="text-primary-600 text-sm font-medium mt-2 inline-block">
              点数を入力する →
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Link
          to="/scores"
          className="card p-4 flex items-center hover:shadow-soft transition-shadow"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
            <Target className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{t('scores.addScore')}</p>
            <p className="text-xs text-gray-500">練習を記録</p>
          </div>
        </Link>
        <Link
          to="/ranking"
          className="card p-4 flex items-center hover:shadow-soft transition-shadow"
        >
          <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center mr-3">
            <Award className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{t('ranking.title')}</p>
            <p className="text-xs text-gray-500">順位を確認</p>
          </div>
        </Link>
      </div>

      {/* AI Coach Section */}
      {coaches.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">AIコーチ</h2>
            </div>
            <Link to="/coaches" className="text-primary-600 text-sm font-medium">
              すべて見る
            </Link>
          </div>
          <div className="space-y-3">
            {coaches.map((coach) => {
              const coachName = i18n.language === 'ja' ? coach.name : coach.nameEn;
              const personality = i18n.language === 'ja' ? coach.personality : coach.personalityEn;
              return (
                <Link
                  key={coach.id}
                  to={`/coaches/${coach.id}`}
                  className="card p-4 flex items-start hover:shadow-soft transition-shadow block"
                >
                  {getAssetUrl(coach.avatarUrl) ? (
                    <img
                      src={getAssetUrl(coach.avatarUrl)!}
                      alt={coachName}
                      className="w-14 h-14 rounded-full flex-shrink-0 object-cover mr-4"
                    />
                  ) : (
                    <div
                      className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xl font-bold mr-4"
                      style={{ backgroundColor: coach.color }}
                    >
                      {coachName.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">{coachName}</h3>
                    <p className="text-sm text-primary-600 mb-1">
                      {i18n.language === 'ja' ? coach.specialty : coach.specialtyEn}
                    </p>
                    <p className="text-sm text-gray-500 line-clamp-2">{personality}</p>
                  </div>
                  <MessageCircle className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                </Link>
              );
            })}
          </div>

          {/* Quick Chat Prompts */}
          {coaches[0] && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">よくある相談:</p>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/coaches/${coaches[0].id}?message=${encodeURIComponent('最近調子が悪いのですが、どうすればいいですか？')}`}
                  className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors"
                >
                  調子が悪い時のアドバイス
                </Link>
                <Link
                  to={`/coaches/${coaches[0].id}?message=${encodeURIComponent('フォームを改善したいです。基本的なポイントを教えてください。')}`}
                  className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors"
                >
                  フォーム改善
                </Link>
                <Link
                  to={`/coaches/${coaches[0].id}?message=${encodeURIComponent('試合前の緊張を和らげる方法を教えてください。')}`}
                  className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors"
                >
                  メンタル強化
                </Link>
                <Link
                  to={`/coaches/${coaches[0].id}?message=${encodeURIComponent('今週の練習メニューを提案してください。')}`}
                  className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors"
                >
                  練習メニュー提案
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
