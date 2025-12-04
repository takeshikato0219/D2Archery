import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Plus,
  UserPlus,
  LogOut,
  Heart,
  MessageCircle,
  Target,
  Send,
  Lock,
  Globe,
  Copy,
  Check,
  Crown,
  Shield,
  X,
  Trash2,
  Trophy,
  Coffee,
  Eye,
  Swords,
  Camera,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type { Team, TeamPost, TeamPostComment, TeamMember, TeamWeeklyRanking } from '../types';

// ステータス定義
const STATUS_OPTIONS = [
  { value: 'offline', label: 'オフライン', icon: null, color: 'bg-gray-400', ringColor: 'ring-gray-400' },
  { value: 'practicing', label: '練習中', icon: Target, color: 'bg-green-500', ringColor: 'ring-green-500' },
  { value: 'resting', label: '休憩中', icon: Coffee, color: 'bg-yellow-500', ringColor: 'ring-yellow-500' },
  { value: 'competing', label: '試合中', icon: Swords, color: 'bg-red-500', ringColor: 'ring-red-500' },
  { value: 'watching', label: '観戦中', icon: Eye, color: 'bg-blue-500', ringColor: 'ring-blue-500' },
] as const;

export function TeamPage() {
  const { i18n } = useTranslation();
  const { user } = useAuth();

  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [publicTeams, setPublicTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<(Team & { members: TeamMember[] }) | null>(null);
  const [posts, setPosts] = useState<TeamPost[]>([]);
  const [weeklyRanking, setWeeklyRanking] = useState<TeamWeeklyRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'feed' | 'ranking' | 'members'>('feed');

  // Status
  const [myStatus, setMyStatus] = useState<'offline' | 'practicing' | 'resting' | 'competing' | 'watching'>('offline');
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);

  // Create team form
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [newTeamIsPublic, setNewTeamIsPublic] = useState(false);
  const [newTeamColor, setNewTeamColor] = useState('#3b82f6');

  // Join team
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState('');

  // Post form
  const [postContent, setPostContent] = useState('');
  const [postArrowCount, setPostArrowCount] = useState<number | undefined>();
  const [postTotalScore, setPostTotalScore] = useState<number | undefined>();
  const [postMaxScore, setPostMaxScore] = useState<number | undefined>();
  const [postDistance, setPostDistance] = useState('');

  // Comments
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const [postComments, setPostComments] = useState<Record<number, TeamPostComment[]>>({});

  // Copied invite code
  const [copiedCode, setCopiedCode] = useState(false);

  // Stories modal
  const [selectedStoryMember, setSelectedStoryMember] = useState<TeamMember | null>(null);

  // Team icon upload
  const iconInputRef = useRef<HTMLInputElement>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const [myTeamsData, publicTeamsData] = await Promise.all([
        api.getMyTeams(),
        api.getPublicTeams(),
      ]);
      setMyTeams(myTeamsData);
      setPublicTeams(publicTeamsData.filter(t => !myTeamsData.some(mt => mt.id === t.id)));

      // Select first team if available
      if (myTeamsData.length > 0 && !selectedTeam) {
        await selectTeam(myTeamsData[0].id);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectTeam = async (teamId: number) => {
    try {
      const [teamData, postsData, rankingData] = await Promise.all([
        api.getTeam(teamId),
        api.getTeamPosts(teamId),
        api.getTeamWeeklyRanking(teamId),
      ]);
      setSelectedTeam(teamData);
      setPosts(postsData);
      setWeeklyRanking(rankingData);

      // 自分のステータスを取得
      if (user) {
        const myMember = teamData.members?.find(m => m.userId === user.id);
        if (myMember?.status) {
          setMyStatus(myMember.status);
        }
      }
    } catch (error) {
      console.error('Error loading team:', error);
    }
  };

  const handleUpdateStatus = async (status: 'offline' | 'practicing' | 'resting' | 'competing' | 'watching') => {
    if (!selectedTeam) return;
    try {
      await api.updateTeamStatus(selectedTeam.id, status);
      setMyStatus(status);
      setShowStatusModal(false);
      // チーム情報を再読み込み
      await selectTeam(selectedTeam.id);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusInfo = (status?: string) => {
    return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedTeam || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setUploadingIcon(true);

    try {
      const { iconUrl } = await api.uploadTeamIcon(selectedTeam.id, file);
      // チーム情報を更新
      setSelectedTeam({ ...selectedTeam, iconUrl });
      setMyTeams(myTeams.map(t => t.id === selectedTeam.id ? { ...t, iconUrl } : t));
    } catch (error) {
      console.error('Error uploading icon:', error);
      alert('アイコンのアップロードに失敗しました');
    } finally {
      setUploadingIcon(false);
      if (iconInputRef.current) {
        iconInputRef.current.value = '';
      }
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;

    try {
      const team = await api.createTeam({
        name: newTeamName,
        description: newTeamDescription || undefined,
        color: newTeamColor,
        isPublic: newTeamIsPublic,
      });
      setMyTeams([team, ...myTeams]);
      await selectTeam(team.id);
      setShowCreateModal(false);
      setNewTeamName('');
      setNewTeamDescription('');
      setNewTeamIsPublic(false);
    } catch (error) {
      console.error('Error creating team:', error);
    }
  };

  const handleJoinTeam = async () => {
    if (!inviteCode.trim()) return;
    setJoinError('');

    try {
      const { team } = await api.joinTeamByCode(inviteCode.toUpperCase());
      setMyTeams([team, ...myTeams]);
      await selectTeam(team.id);
      setShowJoinModal(false);
      setInviteCode('');
    } catch (error: any) {
      setJoinError(error.message || 'Invalid invite code');
    }
  };

  const handleJoinPublicTeam = async (teamId: number) => {
    try {
      const { team } = await api.joinPublicTeam(teamId);
      setMyTeams([team, ...myTeams]);
      setPublicTeams(publicTeams.filter(t => t.id !== teamId));
      await selectTeam(team.id);
    } catch (error) {
      console.error('Error joining team:', error);
    }
  };

  const handleLeaveTeam = async () => {
    if (!selectedTeam) return;
    if (!confirm('本当にこのチームを退会しますか？')) return;

    try {
      await api.leaveTeam(selectedTeam.id);
      setMyTeams(myTeams.filter(t => t.id !== selectedTeam.id));
      setSelectedTeam(null);
      setPosts([]);
      loadTeams();
    } catch (error) {
      console.error('Error leaving team:', error);
    }
  };

  const handleCreatePost = async () => {
    if (!selectedTeam || (!postContent.trim() && !postArrowCount)) return;

    try {
      const post = await api.createTeamPost(selectedTeam.id, {
        content: postContent || undefined,
        arrowCount: postArrowCount,
        totalScore: postTotalScore,
        maxScore: postMaxScore,
        distance: postDistance || undefined,
      });
      setPosts([post, ...posts]);
      setShowPostModal(false);
      setPostContent('');
      setPostArrowCount(undefined);
      setPostTotalScore(undefined);
      setPostMaxScore(undefined);
      setPostDistance('');
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!selectedTeam) return;
    if (!confirm('この投稿を削除しますか？')) return;

    try {
      await api.deleteTeamPost(selectedTeam.id, postId);
      setPosts(posts.filter(p => p.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handleLikePost = async (postId: number) => {
    if (!selectedTeam) return;

    try {
      const { isLiked, likesCount } = await api.toggleTeamPostLike(selectedTeam.id, postId);
      setPosts(posts.map(p =>
        p.id === postId ? { ...p, isLiked, likesCount } : p
      ));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const toggleComments = async (postId: number) => {
    if (expandedComments.has(postId)) {
      setExpandedComments(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    } else {
      if (!postComments[postId] && selectedTeam) {
        const comments = await api.getTeamPostComments(selectedTeam.id, postId);
        setPostComments(prev => ({ ...prev, [postId]: comments }));
      }
      setExpandedComments(prev => new Set([...prev, postId]));
    }
  };

  const handleAddComment = async (postId: number) => {
    if (!selectedTeam || !commentInputs[postId]?.trim()) return;

    try {
      const comment = await api.addTeamPostComment(selectedTeam.id, postId, commentInputs[postId]);
      setPostComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), comment],
      }));
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      setPosts(posts.map(p =>
        p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
      ));
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const copyInviteCode = () => {
    if (selectedTeam) {
      navigator.clipboard.writeText(selectedTeam.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          <Users className="inline-block w-6 h-6 mr-2" />
          チーム
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowJoinModal(true)}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
          >
            <UserPlus className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-2 rounded-full bg-primary-100 hover:bg-primary-200"
          >
            <Plus className="w-5 h-5 text-primary-600" />
          </button>
        </div>
      </div>

      {/* My Teams */}
      {myTeams.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 mb-3">参加中のチーム</h2>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {myTeams.map(team => (
              <button
                key={team.id}
                onClick={() => selectTeam(team.id)}
                className={`flex-shrink-0 w-16 flex flex-col items-center ${
                  selectedTeam?.id === team.id ? 'opacity-100' : 'opacity-60'
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold ${
                    selectedTeam?.id === team.id ? 'ring-2 ring-offset-2 ring-primary-500' : ''
                  }`}
                  style={{ backgroundColor: team.color }}
                >
                  {team.name.charAt(0)}
                </div>
                <p className="text-xs text-center text-gray-700 mt-1 w-16 truncate">
                  {team.name}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Team */}
      {selectedTeam ? (
        <div>
          {/* Team Header */}
          <div className="card p-4 mb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {/* Team Icon with upload */}
                <div className="relative">
                  {selectedTeam.iconUrl ? (
                    <img
                      src={selectedTeam.iconUrl}
                      alt={selectedTeam.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold"
                      style={{ backgroundColor: selectedTeam.color }}
                    >
                      {selectedTeam.name.charAt(0)}
                    </div>
                  )}
                  {/* Icon upload button for owner/admin */}
                  {(selectedTeam.role === 'owner' || selectedTeam.role === 'admin') && (
                    <>
                      <input
                        ref={iconInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleIconUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => iconInputRef.current?.click()}
                        disabled={uploadingIcon}
                        className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm hover:bg-primary-600 transition-colors disabled:opacity-50"
                      >
                        {uploadingIcon ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Camera className="w-3 h-3 text-white" />
                        )}
                      </button>
                    </>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{selectedTeam.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    {selectedTeam.isPublic ? (
                      <Globe className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                    <span>{selectedTeam.members?.length || 0}人のメンバー</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowMembersModal(true)}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <Users className="w-5 h-5 text-gray-500" />
                </button>
                {selectedTeam.role !== 'owner' && (
                  <button
                    onClick={handleLeaveTeam}
                    className="p-2 rounded-full hover:bg-red-50"
                  >
                    <LogOut className="w-5 h-5 text-red-500" />
                  </button>
                )}
              </div>
            </div>

            {selectedTeam.description && (
              <p className="text-sm text-gray-600 mt-3">{selectedTeam.description}</p>
            )}
            {/* Invite Code */}
            {(selectedTeam.role === 'owner' || selectedTeam.role === 'admin') && !selectedTeam.isPublic && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">招待コード</p>
                <div className="flex items-center justify-between">
                  <code className="text-lg font-mono font-bold tracking-wider">
                    {selectedTeam.inviteCode}
                  </code>
                  <button
                    onClick={copyInviteCode}
                    className="p-2 rounded hover:bg-gray-200"
                  >
                    {copiedCode ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Stories-style Active Members */}
          {(() => {
            const allMembers = selectedTeam.members || [];
            // アクティブなメンバーを先に、オフラインを後に
            const sortedMembers = [...allMembers].sort((a, b) => {
              const aActive = a.status && a.status !== 'offline';
              const bActive = b.status && b.status !== 'offline';
              if (aActive && !bActive) return -1;
              if (!aActive && bActive) return 1;
              return 0;
            });

            return (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-3 px-1">メンバーステータス</h4>
                <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
                  {/* 自分のステータスを設定するボタン（最初に表示） */}
                  <button
                    onClick={() => setShowStatusModal(true)}
                    className="flex-shrink-0 flex flex-col items-center"
                  >
                    <div className={`relative w-16 h-16 rounded-full ring-2 ring-offset-2 ${getStatusInfo(myStatus).ringColor} flex items-center justify-center bg-gray-100`}>
                      <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-lg font-bold">
                        {user?.name?.charAt(0) || '?'}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary-500 border-2 border-white flex items-center justify-center">
                        <Plus className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <p className="text-xs text-center text-gray-600 mt-1.5 w-16 truncate font-medium">
                      自分
                    </p>
                    <p className="text-[10px] text-center text-gray-400 truncate w-16">
                      {getStatusInfo(myStatus).label}
                    </p>
                  </button>

                  {/* 他のメンバー */}
                  {sortedMembers.filter(m => m.userId !== user?.id).map(member => {
                    const statusInfo = getStatusInfo(member.status);
                    const StatusIcon = statusInfo.icon;
                    const isActive = member.status && member.status !== 'offline';

                    return (
                      <button
                        key={member.id}
                        onClick={() => setSelectedStoryMember(member)}
                        className={`flex-shrink-0 flex flex-col items-center ${!isActive ? 'opacity-50' : ''}`}
                      >
                        <div className={`relative w-16 h-16 rounded-full ring-2 ring-offset-2 ${statusInfo.ringColor} flex items-center justify-center`}>
                          <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-lg font-bold">
                            {member.user?.name?.charAt(0) || '?'}
                          </div>
                          {isActive && StatusIcon && (
                            <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full ${statusInfo.color} border-2 border-white flex items-center justify-center`}>
                              <StatusIcon className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-center text-gray-700 mt-1.5 w-16 truncate font-medium">
                          {member.user?.name}
                        </p>
                        <p className="text-[10px] text-center text-gray-400 truncate w-16">
                          {statusInfo.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Tabs */}
          <div className="flex bg-white rounded-lg mb-4 p-1 shadow-sm">
            <button
              onClick={() => setActiveTab('feed')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition ${
                activeTab === 'feed'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              フィード
            </button>
            <button
              onClick={() => setActiveTab('ranking')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition ${
                activeTab === 'ranking'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              今週ランキング
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition ${
                activeTab === 'members'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              メンバー
            </button>
          </div>

          {/* Weekly Ranking Tab */}
          {activeTab === 'ranking' && (
            <div className="card">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-bold text-gray-900">今週の練習ランキング</h3>
                </div>
              </div>
              {weeklyRanking.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {weeklyRanking.map((entry, index) => (
                    <div key={entry.userId} className="p-4 flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{entry.user?.name || 'Unknown'}</p>
                        <p className="text-sm text-gray-500">
                          {entry.sessionCount}回の練習
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary-600">{entry.totalArrows}本</p>
                        <p className="text-sm text-gray-500">{entry.totalScore}点</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>今週はまだ練習記録がありません</p>
                  <p className="text-sm mt-1">点数を入力して練習を記録しましょう！</p>
                </div>
              )}
            </div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="card">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">メンバー ({selectedTeam.members?.length || 0})</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {selectedTeam.members?.map(member => {
                  const statusInfo = getStatusInfo(member.status);
                  const StatusIcon = statusInfo.icon;
                  return (
                    <div key={member.id} className="p-4 flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                          {member.user?.name?.charAt(0) || '?'}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${statusInfo.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{member.user?.name}</p>
                          {getRoleIcon(member.role)}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                          {StatusIcon && <StatusIcon className="w-3 h-3" />}
                          <span>{statusInfo.label}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Feed Tab */}
          {activeTab === 'feed' && (
            <>
              {/* New Post Button */}
              <button
                onClick={() => setShowPostModal(true)}
                className="w-full card p-4 mb-4 flex items-center gap-3 hover:bg-gray-50 transition"
              >
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary-600" />
                </div>
                <span className="text-gray-500">練習を報告する...</span>
              </button>

              {/* Posts Feed */}
          {posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map(post => (
                <div key={post.id} className="card">
                  {/* Post Header */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                        {post.user?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{post.user?.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(post.createdAt).toLocaleString(i18n.language)}
                        </p>
                      </div>
                    </div>
                    {(post.userId === user?.id || selectedTeam.role === 'owner' || selectedTeam.role === 'admin') && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="p-2 rounded-full hover:bg-gray-100"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>

                  {/* Post Content */}
                  {post.content && (
                    <div className="px-4 pb-3">
                      <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
                    </div>
                  )}

                  {/* Practice Stats */}
                  {(post.arrowCount || post.totalScore) && (
                    <div className="px-4 pb-3">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <Target className="w-5 h-5 text-blue-600" />
                          <div className="flex gap-4 text-sm">
                            {post.arrowCount && (
                              <span>
                                <span className="font-bold text-blue-700">{post.arrowCount}</span>
                                <span className="text-gray-600">本</span>
                              </span>
                            )}
                            {post.totalScore && (
                              <span>
                                <span className="font-bold text-blue-700">{post.totalScore}</span>
                                {post.maxScore && (
                                  <span className="text-gray-600">/{post.maxScore}</span>
                                )}
                                <span className="text-gray-600">点</span>
                              </span>
                            )}
                            {post.distance && (
                              <span className="text-gray-600">{post.distance}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-4">
                    <button
                      onClick={() => handleLikePost(post.id)}
                      className={`flex items-center gap-1 ${
                        post.isLiked ? 'text-red-500' : 'text-gray-500'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`} />
                      <span className="text-sm">{post.likesCount}</span>
                    </button>
                    <button
                      onClick={() => toggleComments(post.id)}
                      className="flex items-center gap-1 text-gray-500"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm">{post.commentsCount}</span>
                    </button>
                  </div>

                  {/* Comments Section */}
                  {expandedComments.has(post.id) && (
                    <div className="border-t border-gray-100">
                      {/* Existing Comments */}
                      {postComments[post.id]?.map(comment => (
                        <div key={comment.id} className="px-4 py-3 flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-bold flex-shrink-0">
                            {comment.user?.name?.charAt(0) || '?'}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">
                              <span className="font-medium">{comment.user?.name}</span>{' '}
                              <span className="text-gray-700">{comment.content}</span>
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(comment.createdAt).toLocaleString(i18n.language)}
                            </p>
                          </div>
                        </div>
                      ))}

                      {/* Add Comment */}
                      <div className="px-4 py-3 flex gap-2">
                        <input
                          type="text"
                          value={commentInputs[post.id] || ''}
                          onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                          placeholder="コメントを追加..."
                          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
                          onKeyPress={e => e.key === 'Enter' && handleAddComment(post.id)}
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          disabled={!commentInputs[post.id]?.trim()}
                          className="p-2 rounded-full bg-primary-600 text-white disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center text-gray-500">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>まだ投稿がありません</p>
              <p className="text-sm mt-1">練習を報告してチームに共有しましょう</p>
            </div>
          )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* No Team Selected */}
          <div className="card p-8 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">チームに参加しよう</h3>
            <p className="text-gray-500 mb-4">部活やサークルのメンバーと練習を共有できます</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowJoinModal(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                招待コードで参加
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                チーム作成
              </button>
            </div>
          </div>

          {/* Public Teams */}
          {publicTeams.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 mb-3">公開チーム</h2>
              <div className="space-y-3">
                {publicTeams.map(team => (
                  <div key={team.id} className="card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: team.color }}
                      >
                        {team.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{team.name}</p>
                        <p className="text-xs text-gray-500">{team.memberCount}人のメンバー</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinPublicTeam(team.id)}
                      className="px-4 py-2 text-sm bg-primary-600 text-white rounded-full hover:bg-primary-700"
                    >
                      参加
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">チームを作成</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">チーム名 *</label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  placeholder="例: 東大アーチェリー部"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                <textarea
                  value={newTeamDescription}
                  onChange={e => setNewTeamDescription(e.target.value)}
                  placeholder="チームの説明を入力..."
                  rows={3}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">チームカラー</label>
                <div className="flex gap-2">
                  {['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'].map(color => (
                    <button
                      key={color}
                      onClick={() => setNewTeamColor(color)}
                      className={`w-10 h-10 rounded-full ${
                        newTeamColor === color ? 'ring-2 ring-offset-2 ring-gray-900' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {newTeamIsPublic ? (
                    <Globe className="w-5 h-5 text-green-600" />
                  ) : (
                    <Lock className="w-5 h-5 text-gray-600" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {newTeamIsPublic ? '公開チーム' : '招待制チーム'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {newTeamIsPublic
                        ? '誰でも参加できます'
                        : '招待コードで参加できます'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setNewTeamIsPublic(!newTeamIsPublic)}
                  className={`w-12 h-7 rounded-full transition ${
                    newTeamIsPublic ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow transition transform ${
                      newTeamIsPublic ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <button
                onClick={handleCreateTeam}
                disabled={!newTeamName.trim()}
                className="w-full btn-primary"
              >
                チームを作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Team Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">チームに参加</h2>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinError('');
                }}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">招待コード</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="例: ABC12345"
                  className="input-field text-center text-2xl font-mono tracking-wider"
                  maxLength={8}
                />
                {joinError && (
                  <p className="text-red-500 text-sm mt-1">{joinError}</p>
                )}
              </div>

              <button
                onClick={handleJoinTeam}
                disabled={inviteCode.length !== 8}
                className="w-full btn-primary"
              >
                参加する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">練習を報告</h2>
              <button
                onClick={() => setShowPostModal(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">コメント</label>
                <textarea
                  value={postContent}
                  onChange={e => setPostContent(e.target.value)}
                  placeholder="今日の練習について..."
                  rows={3}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">射数</label>
                  <input
                    type="number"
                    value={postArrowCount || ''}
                    onChange={e => setPostArrowCount(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="72"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">距離</label>
                  <select
                    value={postDistance}
                    onChange={e => setPostDistance(e.target.value)}
                    className="input-field"
                  >
                    <option value="">選択...</option>
                    <option value="70m">70m</option>
                    <option value="50m">50m</option>
                    <option value="30m">30m</option>
                    <option value="18m">18m</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">合計点</label>
                  <input
                    type="number"
                    value={postTotalScore || ''}
                    onChange={e => setPostTotalScore(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="650"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">満点</label>
                  <input
                    type="number"
                    value={postMaxScore || ''}
                    onChange={e => setPostMaxScore(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="720"
                    className="input-field"
                  />
                </div>
              </div>

              <button
                onClick={handleCreatePost}
                disabled={!postContent.trim() && !postArrowCount}
                className="w-full btn-primary"
              >
                投稿する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMembersModal && selectedTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">メンバー ({selectedTeam.members?.length || 0})</h2>
              <button
                onClick={() => setShowMembersModal(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {selectedTeam.members?.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                      {member.user?.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{member.user?.name}</p>
                        {getRoleIcon(member.role)}
                      </div>
                      <p className="text-xs text-gray-500">
                        {member.role === 'owner' ? 'オーナー' : member.role === 'admin' ? '管理者' : 'メンバー'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Story Member Detail Modal */}
      {selectedStoryMember && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedStoryMember(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Story Header */}
            {(() => {
              const statusInfo = getStatusInfo(selectedStoryMember.status);
              const StatusIcon = statusInfo.icon;
              return (
                <>
                  <div className={`${statusInfo.color} p-6 text-center`}>
                    <div className="relative inline-block">
                      <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-white text-3xl font-bold border-4 border-white/30">
                        {selectedStoryMember.user?.name?.charAt(0) || '?'}
                      </div>
                      {StatusIcon && (
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg">
                          <StatusIcon className={`w-5 h-5 ${statusInfo.color.replace('bg-', 'text-')}`} />
                        </div>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-white mt-4">
                      {selectedStoryMember.user?.name}
                    </h3>
                    <p className="text-white/80 mt-1">{statusInfo.label}</p>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <span className="text-gray-500">ステータス</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${statusInfo.color}`} />
                        <span className="font-medium">{statusInfo.label}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <span className="text-gray-500">役職</span>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(selectedStoryMember.role)}
                        <span className="font-medium">
                          {selectedStoryMember.role === 'owner' ? 'オーナー' :
                           selectedStoryMember.role === 'admin' ? '管理者' : 'メンバー'}
                        </span>
                      </div>
                    </div>
                    {selectedStoryMember.statusUpdatedAt && (
                      <div className="flex items-center justify-between py-3">
                        <span className="text-gray-500">更新時刻</span>
                        <span className="font-medium text-gray-700">
                          {new Date(selectedStoryMember.statusUpdatedAt).toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => setSelectedStoryMember(null)}
                      className="w-full mt-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
                    >
                      閉じる
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">ステータスを変更</h2>
              <button
                onClick={() => setShowStatusModal(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {STATUS_OPTIONS.map(status => {
                const StatusIcon = status.icon;
                return (
                  <button
                    key={status.value}
                    onClick={() => handleUpdateStatus(status.value as typeof myStatus)}
                    className={`w-full p-4 rounded-lg flex items-center gap-3 transition ${
                      myStatus === status.value
                        ? 'bg-primary-50 border-2 border-primary-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${status.color}`} />
                    {StatusIcon && <StatusIcon className="w-5 h-5 text-gray-600" />}
                    <span className={`font-medium ${
                      myStatus === status.value ? 'text-primary-700' : 'text-gray-700'
                    }`}>
                      {status.label}
                    </span>
                    {myStatus === status.value && (
                      <Check className="w-5 h-5 text-primary-600 ml-auto" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
