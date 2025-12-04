import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Target, Award, Medal, Star, Flame, Crown, Calendar } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type { RankingEntry, BestScoreRankingEntry, MastersRankingEntry, DailyRankingEntry, BestScores, ArcherRating } from '../types';

type RankingType = 'masters' | 'daily' | 'bestPractice' | 'bestCompetition' | 'practice';
type PracticePeriod = 'week' | 'month';

// Masters rank info
interface MastersRankInfo {
  rank: number;
  name: string;
  nameJa: string;
  minPoints: number;
  color: string;
}

export function RankingPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [rankingType, setRankingType] = useState<RankingType>('masters');
  const [practicePeriod, setPracticePeriod] = useState<PracticePeriod>('month');

  // Rankings data
  const [mastersRankings, setMastersRankings] = useState<MastersRankingEntry[]>([]);
  const [mastersRanks, setMastersRanks] = useState<MastersRankInfo[]>([]);
  const [dailyRankings, setDailyRankings] = useState<DailyRankingEntry[]>([]);
  const [dailyDate, setDailyDate] = useState<string>('');
  const [practiceRankings, setPracticeRankings] = useState<RankingEntry[]>([]);
  const [bestPracticeRankings, setBestPracticeRankings] = useState<BestScoreRankingEntry[]>([]);
  const [bestCompetitionRankings, setBestCompetitionRankings] = useState<BestScoreRankingEntry[]>([]);

  // User archer rating (Rt)
  const [myArcherRating, setMyArcherRating] = useState<ArcherRating | null>(null);

  // User ranks
  const [userMastersRank, setUserMastersRank] = useState<{
    rank: number;
    mastersRank: number;
    mastersRating: number;
    adjustedRating: number;
    rankInfo: MastersRankInfo;
  } | null>(null);
  const [userDailyRank, setUserDailyRank] = useState<{
    rank: number;
    score: number;
    adjustedScore: number;
    distanceLabel: string;
  } | null>(null);
  const [userPracticeRank, setUserPracticeRank] = useState<{
    rank: number;
    totalArrows: number;
  } | null>(null);
  const [userBestPracticeRank, setUserBestPracticeRank] = useState<{
    rank: number;
    bestScore: number;
    totalX: number;
    distanceLabel: string;
  } | null>(null);
  const [userBestCompetitionRank, setUserBestCompetitionRank] = useState<{
    rank: number;
    bestScore: number;
    totalX: number;
    distanceLabel: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRankings();
  }, [practicePeriod]);

  const loadRankings = async () => {
    setLoading(true);
    try {
      const [mastersData, dailyData, practiceData, bestPracticeData, bestCompetitionData] = await Promise.all([
        api.getMastersRanking({ limit: 30 }),
        api.getDailyRanking({ limit: 10 }),
        api.getPracticeRanking({ period: practicePeriod, limit: 50 }),
        api.getBestScoreRanking({ type: 'practice', limit: 50 }),
        api.getBestScoreRanking({ type: 'competition', limit: 50 }),
      ]);

      setMastersRankings(mastersData.rankings);
      setMastersRanks(mastersData.ranks);
      setUserMastersRank(mastersData.userRank);

      setDailyRankings(dailyData.rankings);
      setDailyDate(dailyData.date);
      setUserDailyRank(dailyData.userRank);

      setPracticeRankings(practiceData.rankings);
      setUserPracticeRank(practiceData.userRank);

      setBestPracticeRankings(bestPracticeData.rankings);
      setUserBestPracticeRank(bestPracticeData.userRank);

      setBestCompetitionRankings(bestCompetitionData.rankings);
      setUserBestCompetitionRank(bestCompetitionData.userRank);

      // Load user's archer rating if authenticated
      if (user) {
        try {
          const archerRatingData = await api.getMyArcherRating();
          setMyArcherRating(archerRatingData.rating);
        } catch (e) {
          console.error('Load archer rating error:', e);
        }
      }
    } catch (error) {
      console.error('Load rankings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return (
          <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-medium">
            {rank}
          </span>
        );
    }
  };

  const getMastersRankBadge = (mastersRank: number) => {
    const rankInfo = mastersRanks.find(r => r.rank === mastersRank);
    if (!rankInfo) return null;

    return (
      <span
        className="px-2 py-0.5 rounded text-xs font-bold"
        style={{
          backgroundColor: rankInfo.color,
          color: rankInfo.rank <= 5 ? '#fff' : '#000'
        }}
      >
        {rankInfo.nameJa}
      </span>
    );
  };

  const getGenderIcon = (gender: string) => {
    if (gender === 'female') {
      return <span className="text-pink-500 text-xs">♀</span>;
    } else if (gender === 'male') {
      return <span className="text-blue-500 text-xs">♂</span>;
    }
    return null;
  };

  // Get top best score from user's best scores
  const getTopBestScore = (bestScores: BestScores | undefined): { score: number; distance: string } | null => {
    if (!bestScores) return null;
    const entries = Object.entries(bestScores).filter(([, entry]) => entry && entry.score > 0);
    if (entries.length === 0) return null;
    const sorted = entries.sort((a, b) => b[1].score - a[1].score);
    return { score: sorted[0][1].score, distance: sorted[0][0] };
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        {t('ranking.title')}
      </h1>

      {/* My Archer Rating Card */}
      {user && myArcherRating && (
        <div className="mb-6 p-4 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-sm">
                  {user.name?.[0]}
                </div>
              )}
              <div>
                <p className="font-bold">{user.name}</p>
                {user.nickname && <p className="text-xs text-gray-400">"{user.nickname}"</p>}
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold" style={{ color: myArcherRating.rankColor }}>
                  Rt {myArcherRating.rating.toFixed(2)}
                </span>
              </div>
              <span
                className="px-2 py-0.5 rounded text-xs font-bold"
                style={{ backgroundColor: myArcherRating.rankColor, color: '#000' }}
              >
                {myArcherRating.rank}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-700/50 rounded-lg p-2">
              <div className="text-gray-400 text-xs mb-1">試合 ({myArcherRating.competitionCount}/5)</div>
              <div className="font-bold text-lg">{myArcherRating.competitionRating.toFixed(2)}</div>
              {myArcherRating.competitionScores.length > 0 && (
                <div className="text-xs text-gray-400 truncate">
                  {myArcherRating.competitionScores.join(', ')}点
                </div>
              )}
            </div>
            <div className="bg-gray-700/50 rounded-lg p-2">
              <div className="text-gray-400 text-xs mb-1">練習 ({myArcherRating.practiceCount}/5)</div>
              <div className="font-bold text-lg">{myArcherRating.practiceRating.toFixed(2)}</div>
              {myArcherRating.practiceScores.length > 0 && (
                <div className="text-xs text-gray-400 truncate">
                  {myArcherRating.practiceScores.join(', ')}点
                </div>
              )}
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400 text-center">
            SA(16~18.99) / AA(13~16) / A(10~13) / BB(7~10) / B(5~7) / C(0~5)
          </div>
        </div>
      )}

      {/* Main Ranking Type Toggle - 2 rows */}
      <div className="mb-4 space-y-2">
        {/* Top row: Masters & Daily */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setRankingType('masters')}
            className={`flex-1 py-2 px-2 rounded-md flex items-center justify-center text-sm transition-all ${
              rankingType === 'masters'
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-sm font-medium'
                : 'text-gray-600'
            }`}
          >
            <Crown className="w-4 h-4 mr-1" />
            マスターズ
          </button>
          <button
            onClick={() => setRankingType('daily')}
            className={`flex-1 py-2 px-2 rounded-md flex items-center justify-center text-sm transition-all ${
              rankingType === 'daily'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm font-medium'
                : 'text-gray-600'
            }`}
          >
            <Calendar className="w-4 h-4 mr-1" />
            今日のTop10
          </button>
        </div>

        {/* Bottom row: Best scores & Practice */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setRankingType('bestPractice')}
            className={`flex-1 py-2 px-2 rounded-md flex items-center justify-center text-sm transition-all ${
              rankingType === 'bestPractice'
                ? 'bg-white text-primary-600 shadow-sm font-medium'
                : 'text-gray-600'
            }`}
          >
            <Target className="w-4 h-4 mr-1" />
            練習ベスト
          </button>
          <button
            onClick={() => setRankingType('bestCompetition')}
            className={`flex-1 py-2 px-2 rounded-md flex items-center justify-center text-sm transition-all ${
              rankingType === 'bestCompetition'
                ? 'bg-white text-purple-600 shadow-sm font-medium'
                : 'text-gray-600'
            }`}
          >
            <Star className="w-4 h-4 mr-1" />
            試合ベスト
          </button>
          <button
            onClick={() => setRankingType('practice')}
            className={`flex-1 py-2 px-2 rounded-md flex items-center justify-center text-sm transition-all ${
              rankingType === 'practice'
                ? 'bg-white text-orange-600 shadow-sm font-medium'
                : 'text-gray-600'
            }`}
          >
            <Flame className="w-4 h-4 mr-1" />
            練習量
          </button>
        </div>
      </div>

      {/* Practice Period Toggle (only for practice ranking) */}
      {rankingType === 'practice' && (
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setPracticePeriod('week')}
            className={`px-4 py-1.5 rounded-full text-sm ${
              practicePeriod === 'week'
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {t('ranking.period.week')}
          </button>
          <button
            onClick={() => setPracticePeriod('month')}
            className={`px-4 py-1.5 rounded-full text-sm ${
              practicePeriod === 'month'
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {t('ranking.period.month')}
          </button>
        </div>
      )}

      {/* User's Rank Card */}
      {rankingType === 'masters' && userMastersRank && (
        <div className="card p-4 mb-6 bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('ranking.yourRank')}</p>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold text-orange-600">
                  {t('ranking.rank', { rank: userMastersRank.rank })}
                </p>
                {getMastersRankBadge(userMastersRank.mastersRank)}
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900">
                {userMastersRank.adjustedRating.toLocaleString()} pt
              </p>
              <p className="text-xs text-gray-500">
                (実力値: {userMastersRank.mastersRating.toLocaleString()})
              </p>
            </div>
          </div>
        </div>
      )}

      {rankingType === 'daily' && userDailyRank && (
        <div className="card p-4 mb-6 bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">今日のあなたの順位</p>
              <p className="text-3xl font-bold text-blue-600">
                {t('ranking.rank', { rank: userDailyRank.rank })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900">
                {userDailyRank.score}点
              </p>
              <p className="text-xs text-gray-500">
                {userDailyRank.distanceLabel} (調整後: {userDailyRank.adjustedScore}点)
              </p>
            </div>
          </div>
        </div>
      )}

      {rankingType === 'bestPractice' && userBestPracticeRank && (
        <div className="card p-4 mb-6 bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('ranking.yourRank')}</p>
              <p className="text-3xl font-bold text-primary-600">
                {t('ranking.rank', { rank: userBestPracticeRank.rank })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900">
                {userBestPracticeRank.bestScore}点
              </p>
              <p className="text-xs text-gray-500">
                X: {userBestPracticeRank.totalX} / {userBestPracticeRank.distanceLabel}
              </p>
            </div>
          </div>
        </div>
      )}

      {rankingType === 'bestCompetition' && userBestCompetitionRank && (
        <div className="card p-4 mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('ranking.yourRank')}</p>
              <p className="text-3xl font-bold text-purple-600">
                {t('ranking.rank', { rank: userBestCompetitionRank.rank })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900">
                {userBestCompetitionRank.bestScore}点
              </p>
              <p className="text-xs text-gray-500">
                X: {userBestCompetitionRank.totalX} / {userBestCompetitionRank.distanceLabel}
              </p>
            </div>
          </div>
        </div>
      )}

      {rankingType === 'practice' && userPracticeRank && (
        <div className="card p-4 mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('ranking.yourRank')}</p>
              <p className="text-3xl font-bold text-orange-600">
                {t('ranking.rank', { rank: userPracticeRank.rank })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900">
                {userPracticeRank.totalArrows.toLocaleString()} {t('ranking.arrows')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Rankings List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      ) : (
        <>
          {/* Masters Rankings */}
          {rankingType === 'masters' && (
            mastersRankings.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                ランキングデータがありません
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-2">※直近90日の成績を元に算出（試合1.5倍、部内1.2倍）</p>
                {mastersRankings.map((entry) => {
                  const isCurrentUser = entry.userId === user?.id;
                  return (
                    <div
                      key={entry.userId}
                      className={`card p-4 flex items-center ${
                        isCurrentUser ? 'ring-2 ring-orange-500 bg-orange-50' : ''
                      }`}
                    >
                      <div className="w-8 mr-3">{getRankIcon(entry.rank)}</div>
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium mr-3 overflow-hidden">
                        {entry.avatarUrl ? (
                          <img
                            src={entry.avatarUrl}
                            alt={entry.userName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          entry.userName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate">
                            {entry.userName}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-orange-600">(You)</span>
                            )}
                          </p>
                          {getGenderIcon(entry.gender)}
                        </div>
                        {entry.nickname && (
                          <p className="text-xs text-primary-600 truncate">"{entry.nickname}"</p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          {getMastersRankBadge(entry.mastersRank)}
                          {entry.affiliation && (
                            <span className="text-xs text-gray-500 truncate">{entry.affiliation}</span>
                          )}
                          {(() => {
                            const topBest = getTopBestScore(entry.bestScores);
                            if (topBest) {
                              return (
                                <span className="text-xs text-yellow-600 bg-yellow-50 px-1 rounded">
                                  PB:{topBest.score}({topBest.distance})
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {entry.adjustedRating.toLocaleString()}
                          <span className="text-sm font-normal text-gray-500">pt</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Daily Rankings */}
          {rankingType === 'daily' && (
            dailyRankings.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                今日のスコアがまだありません
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-2">{dailyDate} のランキング（女性+30点ハンデ）</p>
                {dailyRankings.map((entry) => {
                  const isCurrentUser = entry.userId === user?.id;
                  return (
                    <div
                      key={`${entry.userId}-${entry.score}`}
                      className={`card p-4 flex items-center ${
                        isCurrentUser ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                      }`}
                    >
                      <div className="w-8 mr-3">{getRankIcon(entry.rank)}</div>
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium mr-3 overflow-hidden">
                        {entry.avatarUrl ? (
                          <img
                            src={entry.avatarUrl}
                            alt={entry.userName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          entry.userName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate">
                            {entry.userName}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-blue-600">(You)</span>
                            )}
                          </p>
                          {getGenderIcon(entry.gender)}
                        </div>
                        {entry.nickname && (
                          <p className="text-xs text-primary-600 truncate">"{entry.nickname}"</p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
                          {entry.affiliation && <span>{entry.affiliation} / </span>}
                          {entry.distanceLabel} / {entry.roundType === 'competition' ? '試合' : '練習'}
                          {(() => {
                            const topBest = getTopBestScore(entry.bestScores);
                            if (topBest) {
                              return (
                                <span className="text-yellow-600 bg-yellow-50 px-1 rounded">
                                  PB:{topBest.score}({topBest.distance})
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {entry.score}
                          <span className="text-sm font-normal text-gray-500">点</span>
                        </p>
                        {entry.adjustedScore !== entry.score && (
                          <p className="text-xs text-gray-400">
                            (調整後: {entry.adjustedScore})
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Best Practice Rankings */}
          {rankingType === 'bestPractice' && (
            bestPracticeRankings.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                ランキングデータがありません
              </div>
            ) : (
              <div className="space-y-2">
                {bestPracticeRankings.map((entry) => {
                  const isCurrentUser = entry.userId === user?.id;
                  return (
                    <div
                      key={entry.userId}
                      className={`card p-4 flex items-center ${
                        isCurrentUser ? 'ring-2 ring-primary-500 bg-primary-50' : ''
                      }`}
                    >
                      <div className="w-8 mr-3">{getRankIcon(entry.rank)}</div>
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium mr-3 overflow-hidden">
                        {entry.avatarUrl ? (
                          <img
                            src={entry.avatarUrl}
                            alt={entry.userName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          entry.userName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {entry.userName}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-primary-600">(You)</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {entry.distanceLabel} / X: {entry.totalX}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {entry.bestScore}
                          <span className="text-sm font-normal text-gray-500">点</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Best Competition Rankings */}
          {rankingType === 'bestCompetition' && (
            bestCompetitionRankings.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                ランキングデータがありません
              </div>
            ) : (
              <div className="space-y-2">
                {bestCompetitionRankings.map((entry) => {
                  const isCurrentUser = entry.userId === user?.id;
                  return (
                    <div
                      key={entry.userId}
                      className={`card p-4 flex items-center ${
                        isCurrentUser ? 'ring-2 ring-purple-500 bg-purple-50' : ''
                      }`}
                    >
                      <div className="w-8 mr-3">{getRankIcon(entry.rank)}</div>
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium mr-3 overflow-hidden">
                        {entry.avatarUrl ? (
                          <img
                            src={entry.avatarUrl}
                            alt={entry.userName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          entry.userName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {entry.userName}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-purple-600">(You)</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {entry.distanceLabel} / X: {entry.totalX}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {entry.bestScore}
                          <span className="text-sm font-normal text-gray-500">点</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Practice Volume Rankings */}
          {rankingType === 'practice' && (
            practiceRankings.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                ランキングデータがありません
              </div>
            ) : (
              <div className="space-y-2">
                {practiceRankings.map((entry) => {
                  const isCurrentUser = entry.userId === user?.id;
                  return (
                    <div
                      key={entry.userId}
                      className={`card p-4 flex items-center ${
                        isCurrentUser ? 'ring-2 ring-orange-500 bg-orange-50' : ''
                      }`}
                    >
                      <div className="w-8 mr-3">{getRankIcon(entry.rank)}</div>
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium mr-3 overflow-hidden">
                        {entry.avatarUrl ? (
                          <img
                            src={entry.avatarUrl}
                            alt={entry.userName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          entry.userName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {entry.userName}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-orange-600">(You)</span>
                          )}
                        </p>
                        {entry.sessionCount && (
                          <p className="text-xs text-gray-500">
                            {entry.sessionCount}回の練習
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {entry.totalArrows?.toLocaleString()}
                          <span className="text-sm font-normal text-gray-500 ml-1">
                            {t('ranking.arrows')}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
