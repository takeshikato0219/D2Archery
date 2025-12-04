const API_BASE = import.meta.env.VITE_API_URL || '';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken() {
    if (!this.token) {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async googleAuth(data: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string;
    language?: string;
  }) {
    return this.request<{ token: string; user: import('../types').User }>(
      '/api/auth/google',
      { method: 'POST', body: JSON.stringify(data) }
    );
  }

  async getMe() {
    return this.request<import('../types').User>('/api/auth/me');
  }

  async updateMe(data: {
    name?: string;
    language?: string;
    gender?: 'male' | 'female' | 'other';
    affiliation?: string;
    nickname?: string;
    bestScores?: import('../types').BestScores;
  }) {
    return this.request<import('../types').User>('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Scores
  async getScores(params?: { limit?: number; offset?: number }) {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    return this.request<import('../types').ScoreLog[]>(
      `/api/scores?${query.toString()}`
    );
  }

  async getScoreStats() {
    return this.request<import('../types').ScoreStats>('/api/scores/stats');
  }

  async getScoreGraph(params?: { startDate?: string; endDate?: string; period?: number }) {
    const query = new URLSearchParams();
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.period) query.set('period', params.period.toString());
    return this.request<import('../types').GraphData[]>(
      `/api/scores/graph?${query.toString()}`
    );
  }

  async createScore(data: {
    date: string;
    score: number;
    maxScore?: number;
    arrowsCount: number;
    distance?: number;
    memo?: string;
  }) {
    return this.request<import('../types').ScoreLog>('/api/scores', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateScore(
    id: number,
    data: Partial<{
      date: string;
      score: number;
      maxScore: number;
      arrowsCount: number;
      distance: number;
      memo: string;
    }>
  ) {
    return this.request<import('../types').ScoreLog>(`/api/scores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteScore(id: number) {
    return this.request<{ success: boolean }>(`/api/scores/${id}`, {
      method: 'DELETE',
    });
  }

  // Coaches
  async getCoaches() {
    return this.request<import('../types').Coach[]>('/api/coaches');
  }

  async getCoach(id: number) {
    return this.request<import('../types').Coach>(`/api/coaches/${id}`);
  }

  async updateCoachPhilosophy(coachId: number, teachingPhilosophy: string) {
    return this.request<import('../types').Coach>(
      `/api/coaches/${coachId}/philosophy`,
      {
        method: 'PATCH',
        body: JSON.stringify({ teachingPhilosophy }),
      }
    );
  }

  async updateCoachRules(coachId: number, baseRules: string) {
    return this.request<import('../types').Coach>(
      `/api/coaches/${coachId}/rules`,
      {
        method: 'PATCH',
        body: JSON.stringify({ baseRules }),
      }
    );
  }

  async updateCoachDetails(coachId: number, details: {
    speakingTone?: string;
    recommendations?: string;
    greetings?: string;
  }) {
    return this.request<import('../types').Coach>(
      `/api/coaches/${coachId}/details`,
      {
        method: 'PATCH',
        body: JSON.stringify(details),
      }
    );
  }

  async updateCoachBasic(coachId: number, data: {
    name?: string;
    nameEn?: string;
    specialty?: string;
    specialtyEn?: string;
    color?: string;
  }) {
    return this.request<import('../types').Coach>(
      `/api/coaches/${coachId}/basic`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }

  async updateCoachPrompt(coachId: number, data: {
    systemPrompt?: string;
    systemPromptEn?: string;
  }) {
    return this.request<import('../types').Coach>(
      `/api/coaches/${coachId}/prompt`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }

  async updateCoachPersonalitySettings(coachId: number, data: {
    personalitySettings?: string;
    personalitySettingsEn?: string;
  }) {
    return this.request<import('../types').Coach>(
      `/api/coaches/${coachId}/personality-settings`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }

  async updateCoachResponseStyle(coachId: number, data: {
    responseStyle?: string;
    responseStyleEn?: string;
  }) {
    return this.request<import('../types').Coach>(
      `/api/coaches/${coachId}/response-style`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }

  async updateCoachKnowledgeScope(coachId: number, data: {
    knowledgeScope?: string;
    knowledgeScopeEn?: string;
  }) {
    return this.request<import('../types').Coach>(
      `/api/coaches/${coachId}/knowledge-scope`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }

  async uploadCoachAvatar(coachId: number, file: File) {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${API_BASE}/api/coaches/${coachId}/avatar`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json() as Promise<import('../types').Coach>;
  }

  async deleteCoachAvatar(coachId: number) {
    return this.request<import('../types').Coach>(
      `/api/coaches/${coachId}/avatar`,
      { method: 'DELETE' }
    );
  }

  // Chat
  async getChatHistory(coachId: number, limit?: number) {
    const query = limit ? `?limit=${limit}` : '';
    return this.request<import('../types').ChatMessage[]>(
      `/api/chat/history/${coachId}${query}`
    );
  }

  async sendMessage(coachId: number, message: string) {
    return this.request<{
      message: import('../types').ChatMessage;
      response: string;
    }>('/api/chat/send', {
      method: 'POST',
      body: JSON.stringify({ coachId, message }),
    });
  }

  async getAdvice(coachId: number) {
    return this.request<{ advice: string }>('/api/chat/advice', {
      method: 'POST',
      body: JSON.stringify({ coachId }),
    });
  }

  async clearChatHistory(coachId: number) {
    return this.request<{ success: boolean }>(`/api/chat/history/${coachId}`, {
      method: 'DELETE',
    });
  }

  // Chat Sessions
  async getChatSessions(coachId: number) {
    return this.request<import('../types').ChatSession[]>(
      `/api/chat/sessions/${coachId}`
    );
  }

  async createChatSession(coachId: number, title?: string) {
    return this.request<import('../types').ChatSession>('/api/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({ coachId, title }),
    });
  }

  async updateChatSession(sessionId: number, title: string) {
    return this.request<import('../types').ChatSession>(
      `/api/chat/sessions/${sessionId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      }
    );
  }

  async deleteChatSession(sessionId: number) {
    return this.request<{ success: boolean }>(
      `/api/chat/sessions/${sessionId}`,
      {
        method: 'DELETE',
      }
    );
  }

  async getSessionMessages(sessionId: number, limit?: number) {
    const query = limit ? `?limit=${limit}` : '';
    return this.request<import('../types').ChatMessage[]>(
      `/api/chat/sessions/${sessionId}/messages${query}`
    );
  }

  async sendSessionMessage(sessionId: number, message: string) {
    return this.request<{
      message: import('../types').ChatMessage;
      response: string;
    }>(`/api/chat/sessions/${sessionId}/send`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  // Equipment
  async getEquipment(params?: { category?: string; level?: string }) {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.level) query.set('level', params.level);
    return this.request<import('../types').Equipment[]>(
      `/api/equipment?${query.toString()}`
    );
  }

  async getEquipmentCategories() {
    return this.request<import('../types').EquipmentCategory[]>(
      '/api/equipment/meta/categories'
    );
  }

  // Rankings
  async getScoreRanking(params?: { limit?: number; language?: string }) {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.language) query.set('language', params.language);
    return this.request<{
      rankings: import('../types').RankingEntry[];
      userRank: { rank: number; highScore: number } | null;
    }>(`/api/rankings/scores?${query.toString()}`);
  }

  async getPracticeRanking(params?: {
    period?: 'week' | 'month';
    limit?: number;
    language?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.period) query.set('period', params.period);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.language) query.set('language', params.language);
    return this.request<{
      rankings: import('../types').RankingEntry[];
      userRank: { rank: number; totalArrows: number } | null;
      period: string;
      startDate: string;
    }>(`/api/rankings/practice?${query.toString()}`);
  }

  async getBestScoreRanking(params?: {
    type?: 'practice' | 'competition' | 'all';
    distance?: string;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.distance) query.set('distance', params.distance);
    if (params?.limit) query.set('limit', params.limit.toString());
    return this.request<{
      rankings: import('../types').BestScoreRankingEntry[];
      userRank: { rank: number; bestScore: number; totalX: number; distanceLabel: string } | null;
      type: string;
      distance: string | null;
    }>(`/api/rankings/best-scores?${query.toString()}`);
  }

  // Masters Ranking (APEX風 1-18ランク、Top 30)
  async getMastersRanking(params?: { limit?: number }) {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    return this.request<{
      rankings: import('../types').MastersRankingEntry[];
      userRank: {
        rank: number;
        mastersRank: number;
        mastersRating: number;
        adjustedRating: number;
        rankInfo: { rank: number; name: string; nameJa: string; minPoints: number; color: string };
      } | null;
      ranks: { rank: number; name: string; nameJa: string; minPoints: number; color: string }[];
    }>(`/api/rankings/masters?${query.toString()}`);
  }

  // Daily Ranking (今日の全国Top 10)
  async getDailyRanking(params?: { date?: string; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.date) query.set('date', params.date);
    if (params?.limit) query.set('limit', params.limit.toString());
    return this.request<{
      rankings: import('../types').DailyRankingEntry[];
      userRank: { rank: number; score: number; adjustedScore: number; distanceLabel: string } | null;
      date: string;
    }>(`/api/rankings/daily?${query.toString()}`);
  }

  // Archer Rating (Rt 0~18.99, SA/AA/A/BB/B/C)
  async getMyArcherRating() {
    return this.request<{
      rating: import('../types').ArcherRating | null;
    }>('/api/rankings/archer-rating/me');
  }

  async getArcherRatingRanks() {
    return this.request<{
      ranks: { rank: string; minRating: number; maxRating: number; color: string }[];
    }>('/api/rankings/archer-rating/ranks');
  }

  // Teaching Content (Admin)
  async getTeachingCategories() {
    return this.request<import('../types').TeachingCategory[]>(
      '/api/teaching/categories'
    );
  }

  async getTeachingContents(coachId: number, includeInactive?: boolean) {
    const query = includeInactive ? '?includeInactive=true' : '';
    return this.request<import('../types').TeachingContent[]>(
      `/api/teaching/coach/${coachId}${query}`
    );
  }

  async createTeachingContent(data: {
    coachId: number;
    category: string;
    title: string;
    titleEn?: string;
    content: string;
    contentEn?: string;
    tags?: string;
    priority?: number;
  }) {
    return this.request<import('../types').TeachingContent>('/api/teaching', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTeachingContent(
    id: number,
    data: Partial<{
      category: string;
      title: string;
      titleEn: string;
      content: string;
      contentEn: string;
      tags: string;
      priority: number;
      isActive: number;
    }>
  ) {
    return this.request<import('../types').TeachingContent>(
      `/api/teaching/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  }

  async deleteTeachingContent(id: number) {
    return this.request<{ success: boolean }>(`/api/teaching/${id}`, {
      method: 'DELETE',
    });
  }

  async parseTeachingContent(data: {
    rawContent: string;
    sourceType?: string;
    sourceUrl?: string;
  }) {
    return this.request<{
      success: boolean;
      items: Array<{
        category: string;
        title: string;
        content: string;
        tags: string;
        priority: number;
      }>;
    }>('/api/teaching/parse', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Archery Scoring
  async getArcheryRounds(limit?: number) {
    const query = limit ? `?limit=${limit}` : '';
    return this.request<import('../types').ArcheryRound[]>(
      `/api/archery/rounds${query}`
    );
  }

  async getArcheryRound(id: number) {
    return this.request<import('../types').ArcheryRound>(
      `/api/archery/rounds/${id}`
    );
  }

  async createArcheryRound(data: {
    distance?: number;
    distanceLabel?: string;
    arrowsPerEnd?: number;
    totalEnds?: number;
    totalArrows?: number;
    roundType?: 'personal' | 'club' | 'competition';
    competitionName?: string;
    location?: string;
    startTime?: string;
    condition?: 'excellent' | 'good' | 'normal' | 'poor' | 'bad';
    weather?: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy' | 'indoor';
    concerns?: string;
    memo?: string;
  }) {
    return this.request<import('../types').ArcheryRound>('/api/archery/rounds', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateArcheryRound(id: number, data: { status?: string; memo?: string }) {
    return this.request<import('../types').ArcheryRound>(
      `/api/archery/rounds/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }

  async deleteArcheryRound(id: number) {
    return this.request<{ success: boolean }>(`/api/archery/rounds/${id}`, {
      method: 'DELETE',
    });
  }

  async addArcheryScore(endId: number, arrowNumber: number, score: string, positionX?: number, positionY?: number) {
    return this.request<{
      score: import('../types').ArcheryScore;
      end: import('../types').ArcheryEnd;
      round: import('../types').ArcheryRound;
    }>(`/api/archery/ends/${endId}/scores`, {
      method: 'POST',
      body: JSON.stringify({ arrowNumber, score, positionX, positionY }),
    });
  }

  async updateArcheryScore(id: number, score: string, positionX?: number, positionY?: number) {
    return this.request<{
      score: import('../types').ArcheryScore;
      end: import('../types').ArcheryEnd;
      round: import('../types').ArcheryRound;
    }>(`/api/archery/scores/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ score, positionX, positionY }),
    });
  }

  async deleteArcheryScore(id: number) {
    return this.request<{
      success: boolean;
      end: import('../types').ArcheryEnd;
      round: import('../types').ArcheryRound;
    }>(`/api/archery/scores/${id}`, {
      method: 'DELETE',
    });
  }

  async completeArcheryRound(id: number) {
    return this.request<import('../types').ArcheryRound>(
      `/api/archery/rounds/${id}/complete`,
      {
        method: 'POST',
      }
    );
  }

  // Practice Memos
  async getMemos(params?: { limit?: number; date?: string }) {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.date) query.set('date', params.date);
    return this.request<import('../types').PracticeMemo[]>(
      `/api/memos?${query.toString()}`
    );
  }

  async uploadMemoMedia(file: File): Promise<import('../types').MemoMedia> {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/api/memos/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  async createMemo(data: {
    date: string;
    content: string;
    condition?: 'excellent' | 'good' | 'normal' | 'poor' | 'bad';
    weather?: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy' | 'indoor';
    location?: string;
    media?: import('../types').MemoMedia[];
  }) {
    return this.request<import('../types').PracticeMemo>('/api/memos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMemo(
    id: number,
    data: Partial<{
      date: string;
      content: string;
      condition: string;
      weather: string;
      location: string;
      media: import('../types').MemoMedia[];
    }>
  ) {
    return this.request<import('../types').PracticeMemo>(`/api/memos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMemo(id: number) {
    return this.request<{ success: boolean }>(`/api/memos/${id}`, {
      method: 'DELETE',
    });
  }

  // Teams
  async getMyTeams() {
    return this.request<import('../types').Team[]>('/api/teams/my');
  }

  async getPublicTeams() {
    return this.request<import('../types').Team[]>('/api/teams/public');
  }

  async getTeam(id: number) {
    return this.request<import('../types').Team & { members: import('../types').TeamMember[] }>(
      `/api/teams/${id}`
    );
  }

  async createTeam(data: {
    name: string;
    description?: string;
    color?: string;
    isPublic?: boolean;
  }) {
    return this.request<import('../types').Team>('/api/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTeam(
    id: number,
    data: {
      name?: string;
      description?: string;
      color?: string;
      isPublic?: boolean;
      iconUrl?: string;
    }
  ) {
    return this.request<import('../types').Team>(`/api/teams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async uploadTeamIcon(teamId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/api/teams/${teamId}/icon`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json() as Promise<{ iconUrl: string }>;
  }

  async deleteTeam(id: number) {
    return this.request<{ success: boolean }>(`/api/teams/${id}`, {
      method: 'DELETE',
    });
  }

  async joinTeamByCode(inviteCode: string) {
    return this.request<{ team: import('../types').Team; member: import('../types').TeamMember }>(
      '/api/teams/join',
      {
        method: 'POST',
        body: JSON.stringify({ inviteCode }),
      }
    );
  }

  async joinPublicTeam(teamId: number) {
    return this.request<{ team: import('../types').Team; member: import('../types').TeamMember }>(
      `/api/teams/${teamId}/join`,
      {
        method: 'POST',
      }
    );
  }

  async leaveTeam(teamId: number) {
    return this.request<{ success: boolean }>(`/api/teams/${teamId}/leave`, {
      method: 'POST',
    });
  }

  async getTeamMembers(teamId: number) {
    return this.request<import('../types').TeamMember[]>(`/api/teams/${teamId}/members`);
  }

  async updateTeamMemberRole(teamId: number, userId: number, role: 'admin' | 'member') {
    return this.request<{ success: boolean }>(`/api/teams/${teamId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  async removeTeamMember(teamId: number, userId: number) {
    return this.request<{ success: boolean }>(`/api/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  // Team Posts
  async getTeamPosts(teamId: number, limit?: number) {
    const query = limit ? `?limit=${limit}` : '';
    return this.request<import('../types').TeamPost[]>(`/api/teams/${teamId}/posts${query}`);
  }

  async createTeamPost(
    teamId: number,
    data: {
      content?: string;
      practiceDate?: string;
      arrowCount?: number;
      totalScore?: number;
      maxScore?: number;
      distance?: string;
      condition?: 'excellent' | 'good' | 'normal' | 'poor' | 'bad';
      media?: import('../types').MemoMedia[];
    }
  ) {
    return this.request<import('../types').TeamPost>(`/api/teams/${teamId}/posts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTeamPost(teamId: number, postId: number) {
    return this.request<{ success: boolean }>(`/api/teams/${teamId}/posts/${postId}`, {
      method: 'DELETE',
    });
  }

  async toggleTeamPostLike(teamId: number, postId: number) {
    return this.request<{ isLiked: boolean; likesCount: number }>(
      `/api/teams/${teamId}/posts/${postId}/like`,
      {
        method: 'POST',
      }
    );
  }

  // Team Comments
  async getTeamPostComments(teamId: number, postId: number) {
    return this.request<import('../types').TeamPostComment[]>(
      `/api/teams/${teamId}/posts/${postId}/comments`
    );
  }

  async addTeamPostComment(teamId: number, postId: number, content: string) {
    return this.request<import('../types').TeamPostComment>(
      `/api/teams/${teamId}/posts/${postId}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({ content }),
      }
    );
  }

  async deleteTeamPostComment(teamId: number, postId: number, commentId: number) {
    return this.request<{ success: boolean }>(
      `/api/teams/${teamId}/posts/${postId}/comments/${commentId}`,
      {
        method: 'DELETE',
      }
    );
  }

  // Team Status
  async updateTeamStatus(
    teamId: number,
    status: 'offline' | 'practicing' | 'resting' | 'competing' | 'watching',
    statusMessage?: string
  ) {
    return this.request<{ success: boolean; status: string; statusMessage?: string }>(
      `/api/teams/${teamId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, statusMessage }),
      }
    );
  }

  // Team Weekly Ranking
  async getTeamWeeklyRanking(teamId: number) {
    return this.request<import('../types').TeamWeeklyRanking[]>(
      `/api/teams/${teamId}/ranking/weekly`
    );
  }
}

export const api = new ApiClient();
