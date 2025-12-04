import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Eye, X, Edit3 } from 'lucide-react';
import { api } from '../lib/api';
import type { ArcheryRound, ArcheryEnd, ArcheryScore } from '../types';
import { ArcheryTarget } from '../components/ArcheryTarget';

// Score button configuration with colors matching target zones
const SCORE_BUTTONS = [
  { score: 'X', value: 10, color: 'bg-yellow-400 hover:bg-yellow-500 text-black', row: 0 },
  { score: '10', value: 10, color: 'bg-yellow-400 hover:bg-yellow-500 text-black', row: 0 },
  { score: '9', value: 9, color: 'bg-yellow-400 hover:bg-yellow-500 text-black', row: 0 },
  { score: '8', value: 8, color: 'bg-red-500 hover:bg-red-600 text-white', row: 1 },
  { score: '7', value: 7, color: 'bg-red-500 hover:bg-red-600 text-white', row: 1 },
  { score: '6', value: 6, color: 'bg-blue-500 hover:bg-blue-600 text-white', row: 1 },
  { score: '5', value: 5, color: 'bg-blue-500 hover:bg-blue-600 text-white', row: 2 },
  { score: '4', value: 4, color: 'bg-gray-800 hover:bg-gray-900 text-white', row: 2 },
  { score: '3', value: 3, color: 'bg-gray-800 hover:bg-gray-900 text-white', row: 2 },
  { score: '2', value: 2, color: 'bg-gray-100 hover:bg-gray-200 text-black border border-gray-300', row: 3 },
  { score: '1', value: 1, color: 'bg-gray-100 hover:bg-gray-200 text-black border border-gray-300', row: 3 },
  { score: 'M', value: 0, color: 'bg-gray-800 hover:bg-gray-900 text-white', row: 3 },
];

// Group buttons by row
const buttonRows = [0, 1, 2, 3].map(row =>
  SCORE_BUTTONS.filter(btn => btn.row === row)
);

// Helper function to get sort priority for a score (lower = higher priority)
const getScoreSortPriority = (score: string): number => {
  if (score === 'X') return 0;
  if (score === '10') return 1;
  if (score === '9') return 2;
  if (score === '8') return 3;
  if (score === '7') return 4;
  if (score === '6') return 5;
  if (score === '5') return 6;
  if (score === '4') return 7;
  if (score === '3') return 8;
  if (score === '2') return 9;
  if (score === '1') return 10;
  if (score === 'M') return 11;
  return 12;
};

// Sort scores from highest to lowest (X, 10, 9, 8... M)
const sortScoresByValue = (scores: ArcheryScore[]): ArcheryScore[] => {
  return [...scores].sort((a, b) => getScoreSortPriority(a.score) - getScoreSortPriority(b.score));
};

// Distance presets
const DISTANCE_PRESETS = [
  { label: '70mW', distance: 70, totalArrows: 72, arrowsPerEnd: 6, totalEnds: 12 },
  { label: '50m30m', distance: 50, totalArrows: 72, arrowsPerEnd: 6, totalEnds: 12 },
  { label: '30mW', distance: 30, totalArrows: 72, arrowsPerEnd: 6, totalEnds: 12 },
  { label: '18mW', distance: 18, totalArrows: 60, arrowsPerEnd: 6, totalEnds: 10 },
];

// Round types
const ROUND_TYPES = [
  { value: 'personal', label: '個人点取り' },
  { value: 'club', label: '部内点取り' },
  { value: 'competition', label: '試合' },
] as const;

// Condition options
const CONDITION_OPTIONS = [
  { value: 'excellent', label: '絶好調' },
  { value: 'good', label: '好調' },
  { value: 'normal', label: '普通' },
  { value: 'poor', label: '不調' },
  { value: 'bad', label: '絶不調' },
] as const;

// Weather options
const WEATHER_OPTIONS = [
  { value: 'sunny', label: '晴れ', icon: '☀️' },
  { value: 'cloudy', label: '曇り', icon: '☁️' },
  { value: 'rainy', label: '雨', icon: '🌧️' },
  { value: 'snowy', label: '雪', icon: '❄️' },
  { value: 'windy', label: '風', icon: '💨' },
  { value: 'indoor', label: '屋内', icon: '🏠' },
] as const;

export function ScoringPage() {
  const { t } = useTranslation();
  const [round, setRound] = useState<ArcheryRound | null>(null);
  const [currentEndIndex, setCurrentEndIndex] = useState(0);
  const [currentArrowIndex, setCurrentArrowIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [roundHistory, setRoundHistory] = useState<ArcheryRound[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');

  // New round modal state
  const [showNewRoundModal, setShowNewRoundModal] = useState(false);
  const [selectedDistance, setSelectedDistance] = useState(DISTANCE_PRESETS[0]);
  const [selectedRoundType, setSelectedRoundType] = useState<'personal' | 'club' | 'competition'>('personal');
  const [competitionName, setCompetitionName] = useState('');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('');
  const [selectedCondition, setSelectedCondition] = useState<typeof CONDITION_OPTIONS[number]['value'] | ''>('');
  const [selectedWeather, setSelectedWeather] = useState<typeof WEATHER_OPTIONS[number]['value'] | ''>('');
  const [concerns, setConcerns] = useState('');

  // Hit history modal state
  const [showHitHistoryModal, setShowHitHistoryModal] = useState(false);
  const [hitHistoryEndIndex, setHitHistoryEndIndex] = useState<number | null>(null);
  const [hitHistoryArrowIndex, setHitHistoryArrowIndex] = useState(0);

  // History detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailRound, setDetailRound] = useState<ArcheryRound | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // Score editing state in detail modal
  const [editingScore, setEditingScore] = useState<{ scoreId: number; endIndex: number; arrowIndex: number } | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Load existing rounds or start fresh
  useEffect(() => {
    loadRounds();
  }, []);

  const loadRounds = async () => {
    try {
      const rounds = await api.getArcheryRounds(20);
      setRoundHistory(rounds);

      // Find an in-progress round or show history
      const inProgressRound = rounds.find(r => r.status === 'in_progress');
      if (inProgressRound) {
        setRound(inProgressRound);
        findNextEmptySlot(inProgressRound);
      }
    } catch (error) {
      console.error('Failed to load rounds:', error);
    }
  };

  const findNextEmptySlot = useCallback((r: ArcheryRound) => {
    for (let endIdx = 0; endIdx < r.ends.length; endIdx++) {
      const end = r.ends[endIdx];
      if (end.scores.length < r.arrowsPerEnd) {
        setCurrentEndIndex(endIdx);
        setCurrentArrowIndex(end.scores.length);
        return;
      }
    }
    // All filled - stay at last position
    setCurrentEndIndex(r.ends.length - 1);
    setCurrentArrowIndex(r.arrowsPerEnd - 1);
  }, []);

  const openNewRoundModal = () => {
    setSelectedDistance(DISTANCE_PRESETS[0]);
    setSelectedRoundType('personal');
    setCompetitionName('');
    setLocation('');
    // Set default time to current time
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    setStartTime(`${hours}:${minutes}`);
    setSelectedCondition('');
    setSelectedWeather('');
    setConcerns('');
    setShowNewRoundModal(true);
  };

  const startNewRound = async () => {
    if (selectedRoundType === 'competition' && !competitionName.trim()) {
      alert('試合名を入力してください');
      return;
    }

    setIsLoading(true);
    try {
      const newRound = await api.createArcheryRound({
        distance: selectedDistance.distance,
        distanceLabel: selectedDistance.label,
        arrowsPerEnd: selectedDistance.arrowsPerEnd,
        totalEnds: selectedDistance.totalEnds,
        totalArrows: selectedDistance.totalArrows,
        roundType: selectedRoundType,
        competitionName: selectedRoundType === 'competition' ? competitionName.trim() : undefined,
        location: location.trim() || undefined,
        startTime: startTime || undefined,
        condition: selectedCondition || undefined,
        weather: selectedWeather || undefined,
        concerns: concerns.trim() || undefined,
      });
      setRound(newRound);
      setCurrentEndIndex(0);
      setCurrentArrowIndex(0);
      setShowHistory(false);
      setShowNewRoundModal(false);
    } catch (error) {
      console.error('Failed to create round:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScoreInput = async (score: string) => {
    if (!round || isLoading) return;

    const currentEnd = round.ends[currentEndIndex];
    if (!currentEnd) return;

    setIsLoading(true);
    try {
      const result = await api.addArcheryScore(
        currentEnd.id,
        currentArrowIndex + 1, // Arrow numbers are 1-based
        score
      );

      // Update round with new data
      setRound(result.round);

      // Move to next slot
      if (currentArrowIndex < round.arrowsPerEnd - 1) {
        setCurrentArrowIndex(currentArrowIndex + 1);
      } else if (currentEndIndex < round.totalEnds - 1) {
        setCurrentEndIndex(currentEndIndex + 1);
        setCurrentArrowIndex(0);
      }
      // If all arrows in all ends are filled, stay at last position
    } catch (error) {
      console.error('Failed to add score:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Open hit history modal for a specific end
  const openHitHistoryModal = (endIndex: number) => {
    setHitHistoryEndIndex(endIndex);
    // Find the first arrow without position data
    const end = round?.ends[endIndex];
    if (end) {
      const firstWithoutPosition = end.scores.findIndex(s => s.positionX == null || s.positionY == null);
      setHitHistoryArrowIndex(firstWithoutPosition >= 0 ? firstWithoutPosition : 0);
    } else {
      setHitHistoryArrowIndex(0);
    }
    setShowHitHistoryModal(true);
  };

  // Handle target click for hit history recording
  const handleHitHistoryClick = async (x: number, y: number, _score: string) => {
    if (!round || isLoading || hitHistoryEndIndex === null) return;

    const end = round.ends[hitHistoryEndIndex];
    if (!end) return;

    const targetScore = end.scores[hitHistoryArrowIndex];
    if (!targetScore) return;

    setIsLoading(true);
    try {
      const result = await api.updateArcheryScore(targetScore.id, targetScore.score, x, y);
      setRound(result.round);

      // Move to next arrow
      if (hitHistoryArrowIndex < end.scores.length - 1) {
        setHitHistoryArrowIndex(hitHistoryArrowIndex + 1);
      } else {
        // All arrows recorded, close modal
        setShowHitHistoryModal(false);
        setHitHistoryEndIndex(null);
      }
    } catch (error) {
      console.error('Failed to update hit position:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if end has all scores entered
  const isEndComplete = (end: ArcheryEnd) => {
    return end.scores.length >= (round?.arrowsPerEnd || 6);
  };

  // Get scores with positions for hit history display
  const getHitHistoryScores = (): ArcheryScore[] => {
    if (hitHistoryEndIndex === null || !round) return [];
    const end = round.ends[hitHistoryEndIndex];
    if (!end) return [];
    // Return only scores up to current arrow being recorded
    return end.scores.slice(0, hitHistoryArrowIndex + 1).filter(s => s.positionX != null && s.positionY != null);
  };

  const handleUndo = async () => {
    if (!round || isLoading) return;

    // Find the last score to delete
    let targetEndIndex = currentEndIndex;
    let targetArrowIndex = currentArrowIndex - 1;

    if (targetArrowIndex < 0) {
      targetEndIndex--;
      if (targetEndIndex < 0) return; // Nothing to undo
      targetArrowIndex = round.arrowsPerEnd - 1;
    }

    const targetEnd = round.ends[targetEndIndex];
    if (!targetEnd) return;

    // Find the score at this position
    const scoreToDelete = targetEnd.scores.find(s => s.arrowNumber === targetArrowIndex + 1);
    if (!scoreToDelete) return;

    setIsLoading(true);
    try {
      const result = await api.deleteArcheryScore(scoreToDelete.id);
      setRound(result.round);
      setCurrentEndIndex(targetEndIndex);
      setCurrentArrowIndex(targetArrowIndex);
    } catch (error) {
      console.error('Failed to undo score:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRound = async () => {
    if (!round) return;

    setIsLoading(true);
    try {
      await api.completeArcheryRound(round.id);
      setRound(null);
      loadRounds();
    } catch (error) {
      console.error('Failed to complete round:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCell = (endIndex: number, arrowIndex: number) => {
    if (!round) return;
    setCurrentEndIndex(endIndex);
    setCurrentArrowIndex(arrowIndex);
  };

  const getScoreColor = (score: string) => {
    if (score === 'X' || score === '10' || score === '9') return 'bg-yellow-100 text-yellow-800';
    if (score === '8' || score === '7') return 'bg-red-100 text-red-800';
    if (score === '6' || score === '5') return 'bg-blue-100 text-blue-800';
    if (score === '4' || score === '3') return 'bg-gray-700 text-white';
    if (score === '2' || score === '1') return 'bg-gray-100 text-gray-800';
    if (score === 'M') return 'bg-gray-900 text-white';
    return 'bg-white';
  };

  const calculateRunningTotal = (ends: ArcheryEnd[], upToEndIndex: number) => {
    let total = 0;
    for (let i = 0; i <= upToEndIndex; i++) {
      total += ends[i]?.totalScore || 0;
    }
    return total;
  };

  const getRoundTypeLabel = (type: string) => {
    switch (type) {
      case 'personal': return '個人';
      case 'club': return '部内';
      case 'competition': return '試合';
      default: return type;
    }
  };

  // Filter rounds based on selected period
  const getFilteredRounds = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return roundHistory.filter(r => {
      const roundDate = new Date(r.date);
      const roundDay = new Date(roundDate.getFullYear(), roundDate.getMonth(), roundDate.getDate());

      switch (historyFilter) {
        case 'today':
          return roundDay.getTime() === today.getTime();
        case 'week': {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return roundDay >= weekAgo;
        }
        case 'month': {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return roundDay >= monthAgo;
        }
        case 'all':
        default:
          return true;
      }
    });
  };

  const filteredRounds = getFilteredRounds();

  const getConditionLabel = (condition: string | undefined) => {
    if (!condition) return null;
    return CONDITION_OPTIONS.find(c => c.value === condition)?.label || condition;
  };

  const getWeatherInfo = (weather: string | undefined) => {
    if (!weather) return null;
    return WEATHER_OPTIONS.find(w => w.value === weather);
  };

  // Open detail modal for a completed round
  const openDetailModal = (r: ArcheryRound) => {
    setDetailRound(r);
    setShowDetailModal(true);
  };

  // Handle delete round
  const handleDeleteRound = async () => {
    if (!deleteTargetId) return;

    setIsLoading(true);
    try {
      await api.deleteArcheryRound(deleteTargetId);
      setShowDeleteConfirm(false);
      setDeleteTargetId(null);
      // Refresh history
      loadRounds();
    } catch (error) {
      console.error('Failed to delete round:', error);
      alert('削除に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTargetId(id);
    setShowDeleteConfirm(true);
  };

  // Handle score cell click in detail modal for editing
  const handleDetailScoreClick = (scoreId: number, endIndex: number, arrowIndex: number) => {
    if (!isEditMode) return;
    setEditingScore({ scoreId, endIndex, arrowIndex });
  };

  // Handle score edit in detail modal
  const handleEditScore = async (newScore: string) => {
    if (!editingScore || !detailRound || isLoading) return;

    setIsLoading(true);
    try {
      const result = await api.updateArcheryScore(
        editingScore.scoreId,
        newScore,
        undefined, // Keep existing position
        undefined
      );

      // Update detailRound with the result
      setDetailRound(result.round);

      // Also update in roundHistory
      setRoundHistory(prev => prev.map(r => r.id === result.round.id ? result.round : r));

      // Clear editing state
      setEditingScore(null);
    } catch (error) {
      console.error('Failed to update score:', error);
      alert('点数の更新に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // New Round Modal
  const renderNewRoundModal = () => {
    if (!showNewRoundModal) return null;

    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white px-6 pt-6 pb-2 border-b">
            <h2 className="text-xl font-bold">新規ラウンド</h2>
          </div>
          <div className="p-6 pt-4">

          {/* Distance Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">距離</label>
            <div className="grid grid-cols-2 gap-2">
              {DISTANCE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setSelectedDistance(preset)}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    selectedDistance.label === preset.label
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-bold">{preset.label}</div>
                  <div className="text-xs text-gray-500">{preset.totalArrows}射</div>
                </button>
              ))}
            </div>
          </div>

          {/* Round Type Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">点取り種別</label>
            <div className="space-y-2">
              {ROUND_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedRoundType(type.value)}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    selectedRoundType === type.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Competition Name (if competition type) */}
          {selectedRoundType === 'competition' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                試合名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={competitionName}
                onChange={(e) => setCompetitionName(e.target.value)}
                placeholder="例: 関東学生リーグ"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          )}

          {/* Location and Time */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">場所</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例: 大学弓道場"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">開始時間</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
            </div>
          </div>

          {/* Condition */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">調子</label>
            <div className="flex flex-wrap gap-2">
              {CONDITION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedCondition(selectedCondition === opt.value ? '' : opt.value)}
                  className={`px-3 py-1.5 rounded-full border text-sm transition-all ${
                    selectedCondition === opt.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Weather */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">天気</label>
            <div className="flex flex-wrap gap-2">
              {WEATHER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedWeather(selectedWeather === opt.value ? '' : opt.value)}
                  className={`px-3 py-1.5 rounded-full border text-sm transition-all ${
                    selectedWeather === opt.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Concerns */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">気にしていること</label>
            <textarea
              value={concerns}
              onChange={(e) => setConcerns(e.target.value)}
              placeholder="例: 押手がぶれる、会が短い..."
              rows={2}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm resize-none"
            />
          </div>

          {/* Summary */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 space-y-1">
              <div><span className="font-medium">距離:</span> {selectedDistance.label}</div>
              <div><span className="font-medium">矢数:</span> {selectedDistance.totalArrows}射 ({selectedDistance.totalEnds}エンド × {selectedDistance.arrowsPerEnd}射)</div>
              <div><span className="font-medium">種別:</span> {ROUND_TYPES.find(t => t.value === selectedRoundType)?.label}</div>
              {selectedRoundType === 'competition' && competitionName && (
                <div><span className="font-medium">試合名:</span> {competitionName}</div>
              )}
              {location && <div><span className="font-medium">場所:</span> {location}</div>}
              {startTime && <div><span className="font-medium">開始時間:</span> {startTime}</div>}
              {selectedCondition && <div><span className="font-medium">調子:</span> {CONDITION_OPTIONS.find(c => c.value === selectedCondition)?.label}</div>}
              {selectedWeather && <div><span className="font-medium">天気:</span> {WEATHER_OPTIONS.find(w => w.value === selectedWeather)?.icon} {WEATHER_OPTIONS.find(w => w.value === selectedWeather)?.label}</div>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowNewRoundModal(false)}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={startNewRound}
              disabled={isLoading || (selectedRoundType === 'competition' && !competitionName.trim())}
              className="flex-1 py-3 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {isLoading ? '作成中...' : '開始'}
            </button>
          </div>
          </div>
        </div>
      </div>
    );
  };

  // Render history view
  if (showHistory || !round) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">{t('scoring.title', '点数入力')}</h1>
          <button
            onClick={openNewRoundModal}
            disabled={isLoading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {t('scoring.newRound', '新規ラウンド')}
          </button>
        </div>

        {/* Period Filter Tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
          {[
            { value: 'today', label: '今日' },
            { value: 'week', label: '1週間' },
            { value: 'month', label: '1ヶ月' },
            { value: 'all', label: '全履歴' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setHistoryFilter(tab.value as typeof historyFilter)}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                historyFilter === tab.value
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Stats Summary for filtered period */}
        {filteredRounds.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white rounded-lg p-3 shadow-sm text-center">
              <div className="text-2xl font-bold text-primary-600">{filteredRounds.length}</div>
              <div className="text-xs text-gray-500">ラウンド</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm text-center">
              <div className="text-2xl font-bold text-primary-600">
                {filteredRounds.reduce((sum, r) => sum + r.totalArrows, 0)}
              </div>
              <div className="text-xs text-gray-500">総射数</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm text-center">
              <div className="text-2xl font-bold text-primary-600">
                {filteredRounds.length > 0
                  ? Math.round(filteredRounds.reduce((sum, r) => sum + r.totalScore, 0) / filteredRounds.length)
                  : 0}
              </div>
              <div className="text-xs text-gray-500">平均点</div>
            </div>
          </div>
        )}

        {filteredRounds.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t('scoring.history', '履歴')}</h2>
            {filteredRounds.map((r) => (
              <div
                key={r.id}
                className="p-4 bg-white rounded-lg shadow border cursor-pointer hover:border-primary-500"
                onClick={() => {
                  if (r.status === 'in_progress') {
                    setRound(r);
                    findNextEmptySlot(r);
                    setShowHistory(false);
                  } else {
                    openDetailModal(r);
                  }
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      {new Date(r.date).toLocaleDateString('ja-JP')} - {r.distanceLabel || `${r.distance}m`}
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        r.roundType === 'competition' ? 'bg-purple-100 text-purple-800' :
                        r.roundType === 'club' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {getRoundTypeLabel(r.roundType)}
                      </span>
                    </div>
                    {r.roundType === 'competition' && r.competitionName && (
                      <div className="text-sm text-purple-600 font-medium">{r.competitionName}</div>
                    )}
                    <div className="text-sm text-gray-500">
                      {r.totalEnds} {t('scoring.ends', 'エンド')} x {r.arrowsPerEnd} {t('scoring.arrows', '射')} = {r.totalArrows}射
                    </div>
                  </div>
                  <div className="text-right flex items-start gap-2">
                    <div>
                      <div className="text-2xl font-bold">{r.totalScore}</div>
                      <div className="text-sm text-gray-500">
                        X:{r.totalX} 10:{r.total10}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        r.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {r.status === 'completed' ? t('scoring.completed', '完了') : t('scoring.inProgress', '進行中')}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetailModal(r);
                        }}
                        className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-all"
                        title="詳細を見る"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={(e) => confirmDelete(r.id, e)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                        title="削除"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <div className="text-lg mb-2">
              {historyFilter === 'today' && '今日の記録はありません'}
              {historyFilter === 'week' && '過去1週間の記録はありません'}
              {historyFilter === 'month' && '過去1ヶ月の記録はありません'}
              {historyFilter === 'all' && 'ラウンドがありません'}
            </div>
            <p className="text-sm">新規ラウンドを開始してください</p>
          </div>
        )}

        {renderNewRoundModal()}

        {/* Detail Modal */}
        {showDetailModal && detailRound && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white px-6 pt-6 pb-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold">ラウンド詳細</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsEditMode(!isEditMode);
                      setEditingScore(null);
                    }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isEditMode
                        ? 'bg-primary-100 text-primary-700 border border-primary-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Edit3 size={16} />
                    {isEditMode ? '編集中' : '編集'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setDetailRound(null);
                      setIsEditMode(false);
                      setEditingScore(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              <div className="p-6">
                {/* Round Info */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">日付:</span>{' '}
                      <span className="font-medium">{new Date(detailRound.date).toLocaleDateString('ja-JP')}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">距離:</span>{' '}
                      <span className="font-medium">{detailRound.distanceLabel || `${detailRound.distance}m`}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">種別:</span>{' '}
                      <span className={`font-medium ${
                        detailRound.roundType === 'competition' ? 'text-purple-600' :
                        detailRound.roundType === 'club' ? 'text-blue-600' : ''
                      }`}>
                        {getRoundTypeLabel(detailRound.roundType)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">矢数:</span>{' '}
                      <span className="font-medium">{detailRound.totalArrows}射</span>
                    </div>
                    {detailRound.competitionName && (
                      <div className="col-span-2">
                        <span className="text-gray-500">試合名:</span>{' '}
                        <span className="font-medium text-purple-600">{detailRound.competitionName}</span>
                      </div>
                    )}
                    {detailRound.location && (
                      <div>
                        <span className="text-gray-500">場所:</span>{' '}
                        <span className="font-medium">{detailRound.location}</span>
                      </div>
                    )}
                    {detailRound.startTime && (
                      <div>
                        <span className="text-gray-500">開始時間:</span>{' '}
                        <span className="font-medium">{detailRound.startTime}</span>
                      </div>
                    )}
                    {detailRound.condition && (
                      <div>
                        <span className="text-gray-500">調子:</span>{' '}
                        <span className="font-medium">{getConditionLabel(detailRound.condition)}</span>
                      </div>
                    )}
                    {detailRound.weather && (
                      <div>
                        <span className="text-gray-500">天気:</span>{' '}
                        <span className="font-medium">
                          {getWeatherInfo(detailRound.weather)?.icon} {getWeatherInfo(detailRound.weather)?.label}
                        </span>
                      </div>
                    )}
                    {detailRound.concerns && (
                      <div className="col-span-2">
                        <span className="text-gray-500">気にしていたこと:</span>{' '}
                        <span className="font-medium">{detailRound.concerns}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Score Summary */}
                <div className="mb-6 p-4 bg-white border rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-3xl font-bold">{detailRound.totalScore}</div>
                      <div className="text-sm text-gray-500">合計</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{detailRound.totalX}</div>
                      <div className="text-sm text-gray-500">X</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{detailRound.total10}</div>
                      <div className="text-sm text-gray-500">10+X</div>
                    </div>
                  </div>

                  {/* First/Second Half Stats (for 12-end rounds) */}
                  {detailRound.totalEnds === 12 && (
                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t text-center">
                      <div>
                        <div className="text-xl font-bold">
                          {detailRound.ends.slice(0, 6).reduce((sum, end) => sum + end.totalScore, 0)}
                        </div>
                        <div className="text-xs text-gray-500">前半 (1-6)</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold">
                          {detailRound.ends.slice(6, 12).reduce((sum, end) => sum + end.totalScore, 0)}
                        </div>
                        <div className="text-xs text-gray-500">後半 (7-12)</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Scoresheet */}
                <div className="bg-white rounded-lg border overflow-hidden mb-6">
                  {isEditMode && (
                    <div className="bg-primary-50 px-3 py-2 text-sm text-primary-700 border-b">
                      点数をタップして編集できます
                    </div>
                  )}
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2 text-left">End</th>
                        {Array.from({ length: detailRound.arrowsPerEnd }, (_, i) => (
                          <th key={i} className="px-2 py-2 text-center">{i + 1}</th>
                        ))}
                        <th className="px-2 py-2 text-center">計</th>
                        <th className="px-2 py-2 text-center">累計</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailRound.ends.map((end, endIdx) => {
                        const showSeparator = detailRound.totalEnds === 12 && endIdx === 6;
                        return (
                          <>
                            {showSeparator && (
                              <tr key={`separator-${endIdx}`} className="h-2 bg-gray-200">
                                <td colSpan={detailRound.arrowsPerEnd + 3}></td>
                              </tr>
                            )}
                            <tr key={end.id}>
                              <td className="px-2 py-2 font-medium">{end.endNumber}</td>
                              {(() => {
                                // Sort scores by value (X, 10, 9, 8... M)
                                const sortedScores = sortScoresByValue(end.scores);
                                return Array.from({ length: detailRound.arrowsPerEnd }, (_, arrowIdx) => {
                                  const score = sortedScores[arrowIdx];
                                  const isEditing = editingScore?.endIndex === endIdx && editingScore?.arrowIndex === arrowIdx;
                                  return (
                                    <td
                                      key={arrowIdx}
                                      onClick={() => score && handleDetailScoreClick(score.id, endIdx, arrowIdx)}
                                      className={`px-2 py-2 text-center transition-all ${
                                        score ? getScoreColor(score.score) : 'bg-gray-50'
                                      } ${
                                        isEditMode && score
                                          ? 'cursor-pointer hover:ring-2 hover:ring-primary-400'
                                          : ''
                                      } ${
                                        isEditing
                                          ? 'ring-2 ring-primary-500 bg-primary-100'
                                          : ''
                                      }`}
                                    >
                                      {score?.score || '-'}
                                    </td>
                                  );
                                });
                              })()}
                              <td className="px-2 py-2 text-center font-medium bg-gray-50">
                                {end.totalScore || '-'}
                              </td>
                              <td className="px-2 py-2 text-center font-bold bg-gray-100">
                                {calculateRunningTotal(detailRound.ends, endIdx) || '-'}
                              </td>
                            </tr>
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Score Edit Buttons */}
                {editingScore && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                    <div className="text-sm text-gray-600 mb-3 text-center">
                      エンド {editingScore.endIndex + 1} - {editingScore.arrowIndex + 1}本目の点数を選択
                    </div>
                    <div className="space-y-2">
                      {buttonRows.map((row, rowIdx) => (
                        <div key={rowIdx} className="grid grid-cols-3 gap-2">
                          {row.map((btn) => (
                            <button
                              key={btn.score}
                              onClick={() => handleEditScore(btn.score)}
                              disabled={isLoading}
                              className={`py-2 text-sm font-bold rounded-lg transition-all ${btn.color} disabled:opacity-50 active:scale-95`}
                            >
                              {btn.score}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setEditingScore(null)}
                      className="w-full mt-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium text-sm"
                    >
                      キャンセル
                    </button>
                  </div>
                )}

                {/* Target Display */}
                <div className="flex justify-center mb-6">
                  <ArcheryTarget
                    scores={detailRound.ends.flatMap(end => end.scores.filter(s => s.positionX != null && s.positionY != null))}
                    onTargetClick={() => {}}
                    disabled={true}
                    size={320}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setDetailRound(null);
                      setIsEditMode(false);
                      setEditingScore(null);
                    }}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    閉じる
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setDeleteTargetId(detailRound.id);
                      setShowDeleteConfirm(true);
                      setIsEditMode(false);
                      setEditingScore(null);
                    }}
                    className="py-3 px-4 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 flex items-center gap-2"
                  >
                    <Trash2 size={18} />
                    削除
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-sm p-6">
              <h3 className="text-lg font-bold mb-2">ラウンドを削除</h3>
              <p className="text-gray-600 mb-6">
                このラウンドを削除してもよろしいですか？この操作は取り消せません。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteTargetId(null);
                  }}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={isLoading}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleDeleteRound}
                  disabled={isLoading}
                  className="flex-1 py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isLoading ? '削除中...' : '削除する'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render scoring view
  return (
    <div className="max-w-2xl mx-auto p-4 pb-48">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setShowHistory(true)}
          className="text-primary-600 hover:text-primary-700"
        >
          ← {t('scoring.back', '戻る')}
        </button>
        <div className="text-center">
          <div className="font-medium">{round.distanceLabel || `${round.distance}m`}</div>
          <div className="text-xs text-gray-500">
            {getRoundTypeLabel(round.roundType)}
            {round.competitionName && ` - ${round.competitionName}`}
          </div>
          <div className="text-sm text-gray-500">
            {t('scoring.end', 'エンド')} {currentEndIndex + 1}/{round.totalEnds}
          </div>
        </div>
        <button
          onClick={handleCompleteRound}
          className="text-green-600 hover:text-green-700 font-medium"
        >
          {t('scoring.finish', '終了')}
        </button>
      </div>

      {/* Summary Stats */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold">{round.totalScore}</div>
            <div className="text-sm text-gray-500">{t('scoring.total', '合計')}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{round.totalX}</div>
            <div className="text-sm text-gray-500">X</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{round.total10}</div>
            <div className="text-sm text-gray-500">10+X</div>
          </div>
        </div>

        {/* First/Second Half Stats (for 12-end rounds) */}
        {round.totalEnds === 12 && (
          <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-200">
            <div className="text-center">
              <div className="text-xl font-bold">
                {round.ends.slice(0, 6).reduce((sum, end) => sum + end.totalScore, 0)}
              </div>
              <div className="text-xs text-gray-500">前半 (1-6)</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">
                {round.ends.slice(6, 12).reduce((sum, end) => sum + end.totalScore, 0)}
              </div>
              <div className="text-xs text-gray-500">後半 (7-12)</div>
            </div>
          </div>
        )}
      </div>

      {/* Scoresheet */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left">{t('scoring.endNumber', 'End')}</th>
              {Array.from({ length: round.arrowsPerEnd }, (_, i) => (
                <th key={i} className="px-2 py-2 text-center">{i + 1}</th>
              ))}
              <th className="px-2 py-2 text-center">{t('scoring.endTotal', '計')}</th>
              <th className="px-2 py-2 text-center">{t('scoring.runningTotal', '累計')}</th>
              <th className="px-2 py-2 text-center text-xs">的中履歴</th>
            </tr>
          </thead>
          <tbody>
            {round.ends.map((end, endIdx) => {
              // Add separator after end 6 (between ends 6 and 7) for 12-end rounds
              const showSeparator = round.totalEnds === 12 && endIdx === 6;
              return (
                <>
                  {showSeparator && (
                    <tr key={`separator-${endIdx}`} className="h-3 bg-gray-200">
                      <td colSpan={round.arrowsPerEnd + 4}></td>
                    </tr>
                  )}
                  <tr key={end.id} className={endIdx === currentEndIndex ? 'bg-primary-50' : ''}>
                    <td className="px-2 py-2 font-medium">{end.endNumber}</td>
                    {(() => {
                      // Sort scores by value (X, 10, 9, 8... M)
                      const sortedScores = sortScoresByValue(end.scores);
                      return Array.from({ length: round.arrowsPerEnd }, (_, arrowIdx) => {
                        const score = sortedScores[arrowIdx];
                        const isCurrentCell = endIdx === currentEndIndex && arrowIdx === currentArrowIndex;
                        return (
                          <td
                            key={arrowIdx}
                            onClick={() => handleSelectCell(endIdx, arrowIdx)}
                            className={`px-2 py-2 text-center cursor-pointer transition-all ${
                              isCurrentCell
                                ? 'ring-2 ring-primary-500 ring-inset'
                                : ''
                            } ${score ? getScoreColor(score.score) : 'bg-gray-50'}`}
                          >
                            {score?.score || '-'}
                          </td>
                        );
                      });
                    })()}
                    <td className="px-2 py-2 text-center font-medium bg-gray-50">
                      {end.totalScore || '-'}
                    </td>
                    <td className="px-2 py-2 text-center font-bold bg-gray-100">
                      {calculateRunningTotal(round.ends, endIdx) || '-'}
                    </td>
                    <td className="px-1 py-1 text-center">
                      {isEndComplete(end) ? (
                        <button
                          onClick={() => openHitHistoryModal(endIdx)}
                          className="px-2 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded transition-all"
                        >
                          入力
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Target Display - Shows all arrow positions from all ends */}
      <div className="flex justify-center mb-4">
        <ArcheryTarget
          scores={round.ends.flatMap(end => end.scores.filter(s => s.positionX != null && s.positionY != null))}
          onTargetClick={() => {}} // Read-only display
          disabled={true}
          size={400}
        />
      </div>

      {/* Score Input - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
        <div className="max-w-2xl mx-auto">
          {/* Position Indicator */}
          <div className="text-sm text-gray-600 mb-3 text-center">
            {t('scoring.end', 'エンド')} {currentEndIndex + 1} - {t('scoring.arrow', '矢')} {currentArrowIndex + 1}
          </div>

          {/* Score Buttons */}
          <div className="space-y-2">
            {buttonRows.map((row, rowIdx) => (
              <div key={rowIdx} className="grid grid-cols-3 gap-2">
                {row.map((btn) => (
                  <button
                    key={btn.score}
                    onClick={() => handleScoreInput(btn.score)}
                    disabled={isLoading}
                    className={`py-3 text-lg font-bold rounded-lg transition-all ${btn.color} disabled:opacity-50 active:scale-95`}
                  >
                    {btn.score}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Undo button */}
          <button
            onClick={handleUndo}
            disabled={isLoading || (currentEndIndex === 0 && currentArrowIndex === 0)}
            className="w-full mt-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium disabled:opacity-50"
          >
            {t('scoring.undo', '取り消し')}
          </button>
        </div>
      </div>

      {renderNewRoundModal()}

      {/* Hit History Modal */}
      {showHitHistoryModal && hitHistoryEndIndex !== null && round && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">
                的中履歴 - エンド {hitHistoryEndIndex + 1}
              </h2>
              <button
                onClick={() => {
                  setShowHitHistoryModal(false);
                  setHitHistoryEndIndex(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Arrow position indicator */}
            <div className="text-center mb-3">
              <span className="text-sm text-gray-600">
                {hitHistoryArrowIndex + 1}本目をタップしてください
              </span>
              <div className="flex justify-center gap-1 mt-2">
                {sortScoresByValue(round.ends[hitHistoryEndIndex]?.scores || []).map((score, idx) => (
                  <div
                    key={idx}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx < hitHistoryArrowIndex
                        ? 'bg-green-500 text-white'
                        : idx === hitHistoryArrowIndex
                        ? 'bg-primary-500 text-white ring-2 ring-primary-300'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {score.score}
                  </div>
                ))}
              </div>
            </div>

            {/* Target */}
            <div className="flex justify-center">
              <ArcheryTarget
                scores={getHitHistoryScores()}
                onTargetClick={handleHitHistoryClick}
                disabled={isLoading}
                size={280}
              />
            </div>

            <button
              onClick={() => {
                setShowHitHistoryModal(false);
                setHitHistoryEndIndex(null);
              }}
              className="w-full mt-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
