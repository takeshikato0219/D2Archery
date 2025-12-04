import { Router } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { demoStore, isDemoMode } from '../db/demo-store.js';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Setup multer for team icon uploads
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/team-icons');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'team-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

// Get user's teams
router.get('/my', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    if (isDemoMode) {
      const teams = demoStore.getUserTeams(userId);
      const teamsWithInfo = teams.map(team => {
        const members = demoStore.getTeamMembers(team.id);
        return {
          ...team,
          memberCount: members.length,
          role: demoStore.getTeamMemberRole(team.id, userId),
        };
      });
      return res.json(teamsWithInfo);
    }

    // TODO: Production mode with database
    res.json([]);
  } catch (error) {
    console.error('Error fetching user teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get public teams
router.get('/public', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (isDemoMode) {
      const teams = demoStore.getPublicTeams();
      const teamsWithInfo = teams.map(team => {
        const members = demoStore.getTeamMembers(team.id);
        return {
          ...team,
          memberCount: members.length,
        };
      });
      return res.json(teamsWithInfo);
    }

    res.json([]);
  } catch (error) {
    console.error('Error fetching public teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get team by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const userId = req.user!.id;

    if (isDemoMode) {
      const team = demoStore.findTeamById(teamId);
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Check if user is a member or team is public
      const isMember = demoStore.isTeamMember(teamId, userId);
      if (!isMember && team.isPublic !== 1) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const members = demoStore.getTeamMembers(teamId);
      const role = demoStore.getTeamMemberRole(teamId, userId);

      return res.json({
        ...team,
        members,
        memberCount: members.length,
        role,
        isMember,
      });
    }

    res.status(404).json({ error: 'Team not found' });
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// Create team
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { name, description, color, isPublic } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    if (isDemoMode) {
      const team = demoStore.createTeam({
        name,
        description: description || null,
        color: color || '#3b82f6',
        ownerId: userId,
        isPublic: isPublic ? 1 : 0,
      });

      return res.json(team);
    }

    res.status(500).json({ error: 'Database not available' });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Update team
router.patch('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const userId = req.user!.id;
    const { name, description, color, isPublic, iconUrl } = req.body;

    if (isDemoMode) {
      const team = demoStore.findTeamById(teamId);
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Check if user is owner or admin
      const role = demoStore.getTeamMemberRole(teamId, userId);
      if (role !== 'owner' && role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const updated = demoStore.updateTeam(teamId, {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
        ...(isPublic !== undefined && { isPublic: isPublic ? 1 : 0 }),
        ...(iconUrl !== undefined && { iconUrl }),
      });

      return res.json(updated);
    }

    res.status(500).json({ error: 'Database not available' });
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// Upload team icon
router.post('/:id/icon', authMiddleware, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const userId = req.user!.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (isDemoMode) {
      const team = demoStore.findTeamById(teamId);
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Check if user is owner or admin
      const role = demoStore.getTeamMemberRole(teamId, userId);
      if (role !== 'owner' && role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const iconUrl = `/uploads/team-icons/${req.file.filename}`;
      // Note: iconUrl is not in the schema, so we store the result but don't update the team
      // This endpoint returns the iconUrl for client-side use

      return res.json({ iconUrl });
    }

    res.status(500).json({ error: 'Database not available' });
  } catch (error) {
    console.error('Error uploading team icon:', error);
    res.status(500).json({ error: 'Failed to upload icon' });
  }
});

// Delete team
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const userId = req.user!.id;

    if (isDemoMode) {
      const team = demoStore.findTeamById(teamId);
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Only owner can delete
      if (team.ownerId !== userId) {
        return res.status(403).json({ error: 'Only owner can delete team' });
      }

      demoStore.deleteTeam(teamId);
      return res.json({ success: true });
    }

    res.status(500).json({ error: 'Database not available' });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

// Join team by invite code
router.post('/join', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    if (isDemoMode) {
      const team = demoStore.findTeamByInviteCode(inviteCode.toUpperCase());
      if (!team) {
        return res.status(404).json({ error: 'Invalid invite code' });
      }

      // Check if already a member
      if (demoStore.isTeamMember(team.id, userId)) {
        return res.status(400).json({ error: 'Already a member of this team' });
      }

      const member = demoStore.joinTeam(team.id, userId);
      return res.json({ team, member });
    }

    res.status(500).json({ error: 'Database not available' });
  } catch (error) {
    console.error('Error joining team:', error);
    res.status(500).json({ error: 'Failed to join team' });
  }
});

// Join public team
router.post('/:id/join', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const userId = req.user!.id;

    if (isDemoMode) {
      const team = demoStore.findTeamById(teamId);
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Check if team is public
      if (team.isPublic !== 1) {
        return res.status(403).json({ error: 'Team is not public. Use invite code.' });
      }

      // Check if already a member
      if (demoStore.isTeamMember(teamId, userId)) {
        return res.status(400).json({ error: 'Already a member of this team' });
      }

      const member = demoStore.joinTeam(teamId, userId);
      return res.json({ team, member });
    }

    res.status(500).json({ error: 'Database not available' });
  } catch (error) {
    console.error('Error joining team:', error);
    res.status(500).json({ error: 'Failed to join team' });
  }
});

// Leave team
router.post('/:id/leave', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const userId = req.user!.id;

    if (isDemoMode) {
      const team = demoStore.findTeamById(teamId);
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Owner cannot leave (must delete team or transfer ownership)
      if (team.ownerId === userId) {
        return res.status(400).json({ error: 'Owner cannot leave team. Delete or transfer ownership.' });
      }

      demoStore.leaveTeam(teamId, userId);
      return res.json({ success: true });
    }

    res.status(500).json({ error: 'Database not available' });
  } catch (error) {
    console.error('Error leaving team:', error);
    res.status(500).json({ error: 'Failed to leave team' });
  }
});

// Update my status in team
router.patch('/:id/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const userId = req.user!.id;
    const { status, statusMessage } = req.body;

    const validStatuses = ['offline', 'practicing', 'resting', 'competing', 'watching'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (isDemoMode) {
      const team = demoStore.findTeamById(teamId);
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      if (!demoStore.isTeamMember(teamId, userId)) {
        return res.status(403).json({ error: 'Not a member of this team' });
      }

      const success = demoStore.updateMemberStatus(teamId, userId, status, statusMessage);
      if (!success) {
        return res.status(400).json({ error: 'Failed to update status' });
      }

      return res.json({ success: true, status, statusMessage });
    }

    res.status(500).json({ error: 'Database not available' });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Get team weekly ranking
router.get('/:id/ranking/weekly', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const userId = req.user!.id;

    if (isDemoMode) {
      const team = demoStore.findTeamById(teamId);
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Check access
      const isMember = demoStore.isTeamMember(teamId, userId);
      if (!isMember && team.isPublic !== 1) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const ranking = demoStore.getTeamWeeklyRanking(teamId);
      return res.json(ranking);
    }

    res.json([]);
  } catch (error) {
    console.error('Error fetching team ranking:', error);
    res.status(500).json({ error: 'Failed to fetch ranking' });
  }
});

// Get team members
router.get('/:id/members', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const userId = req.user!.id;

    if (isDemoMode) {
      const team = demoStore.findTeamById(teamId);
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Check access
      const isMember = demoStore.isTeamMember(teamId, userId);
      if (!isMember && team.isPublic !== 1) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const members = demoStore.getTeamMembers(teamId);
      return res.json(members);
    }

    res.json([]);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Update member role
router.patch('/:id/members/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const targetUserId = parseInt(req.params.userId);
    const currentUserId = req.user!.id;
    const { role } = req.body;

    if (!role || !['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (isDemoMode) {
      const team = demoStore.findTeamById(teamId);
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Only owner can change roles
      if (team.ownerId !== currentUserId) {
        return res.status(403).json({ error: 'Only owner can change roles' });
      }

      const success = demoStore.updateTeamMemberRole(teamId, targetUserId, role);
      if (!success) {
        return res.status(400).json({ error: 'Failed to update role' });
      }

      return res.json({ success: true });
    }

    res.status(500).json({ error: 'Database not available' });
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Remove member
router.delete('/:id/members/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const targetUserId = parseInt(req.params.userId);
    const currentUserId = req.user!.id;

    if (isDemoMode) {
      const team = demoStore.findTeamById(teamId);
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Check permissions
      const currentRole = demoStore.getTeamMemberRole(teamId, currentUserId);
      const targetRole = demoStore.getTeamMemberRole(teamId, targetUserId);

      if (currentRole !== 'owner' && currentRole !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Cannot remove owner
      if (targetRole === 'owner') {
        return res.status(400).json({ error: 'Cannot remove owner' });
      }

      // Admin cannot remove other admins
      if (currentRole === 'admin' && targetRole === 'admin') {
        return res.status(403).json({ error: 'Admins cannot remove other admins' });
      }

      demoStore.leaveTeam(teamId, targetUserId);
      return res.json({ success: true });
    }

    res.status(500).json({ error: 'Database not available' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// ===== Posts =====

// Get team posts
router.get('/:id/posts', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;

    if (isDemoMode) {
      const team = demoStore.findTeamById(teamId);
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Check access
      const isMember = demoStore.isTeamMember(teamId, userId);
      if (!isMember && team.isPublic !== 1) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const posts = demoStore.getTeamPosts(teamId, limit);
      const postsWithLikeStatus = posts.map(post => ({
        ...post,
        isLiked: demoStore.isPostLikedByUser(post.id, userId),
      }));

      return res.json(postsWithLikeStatus);
    }

    res.json([]);
  } catch (error) {
    console.error('Error fetching team posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Create post
router.post('/:id/posts', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const userId = req.user!.id;
    const { content, practiceDate, arrowCount, totalScore, maxScore, distance, condition, media } = req.body;

    if (isDemoMode) {
      const team = demoStore.findTeamById(teamId);
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Must be a member to post
      if (!demoStore.isTeamMember(teamId, userId)) {
        return res.status(403).json({ error: 'Must be a member to post' });
      }

      const post = demoStore.createTeamPost({
        teamId,
        userId,
        content: content || null,
        practiceDate: practiceDate ? new Date(practiceDate) : null,
        arrowCount: arrowCount || null,
        totalScore: totalScore || null,
        maxScore: maxScore || null,
        distance: distance || null,
        condition: condition || null,
        media: media ? JSON.stringify(media) : null,
      });

      const user = demoStore.findUserById(userId);
      return res.json({
        ...post,
        user,
        commentsCount: 0,
        likesCount: 0,
        isLiked: false,
      });
    }

    res.status(500).json({ error: 'Database not available' });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Delete post
router.delete('/:teamId/posts/:postId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const postId = parseInt(req.params.postId);
    const userId = req.user!.id;

    if (isDemoMode) {
      const post = demoStore.findTeamPostById(postId);
      if (!post || post.teamId !== teamId) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Can delete if owner of post, team owner, or admin
      const role = demoStore.getTeamMemberRole(teamId, userId);
      if (post.userId !== userId && role !== 'owner' && role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      demoStore.deleteTeamPost(postId);
      return res.json({ success: true });
    }

    res.status(500).json({ error: 'Database not available' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Like/unlike post
router.post('/:teamId/posts/:postId/like', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const postId = parseInt(req.params.postId);
    const userId = req.user!.id;

    if (isDemoMode) {
      const post = demoStore.findTeamPostById(postId);
      if (!post || post.teamId !== teamId) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Must be a member to like
      if (!demoStore.isTeamMember(teamId, userId)) {
        return res.status(403).json({ error: 'Must be a member to like' });
      }

      const isLiked = demoStore.toggleTeamPostLike(postId, userId);
      const likesCount = demoStore.getPostLikesCount(postId);

      return res.json({ isLiked, likesCount });
    }

    res.status(500).json({ error: 'Database not available' });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// ===== Comments =====

// Get post comments
router.get('/:teamId/posts/:postId/comments', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const postId = parseInt(req.params.postId);
    const userId = req.user!.id;

    if (isDemoMode) {
      const post = demoStore.findTeamPostById(postId);
      if (!post || post.teamId !== teamId) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const team = demoStore.findTeamById(teamId);
      const isMember = demoStore.isTeamMember(teamId, userId);
      if (!isMember && team?.isPublic !== 1) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const comments = demoStore.getTeamPostComments(postId);
      return res.json(comments);
    }

    res.json([]);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Add comment
router.post('/:teamId/posts/:postId/comments', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const postId = parseInt(req.params.postId);
    const userId = req.user!.id;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (isDemoMode) {
      const post = demoStore.findTeamPostById(postId);
      if (!post || post.teamId !== teamId) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Must be a member to comment
      if (!demoStore.isTeamMember(teamId, userId)) {
        return res.status(403).json({ error: 'Must be a member to comment' });
      }

      const comment = demoStore.createTeamPostComment({
        postId,
        userId,
        content,
      });

      const user = demoStore.findUserById(userId);
      return res.json({ ...comment, user });
    }

    res.status(500).json({ error: 'Database not available' });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Delete comment
router.delete('/:teamId/posts/:postId/comments/:commentId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const commentId = parseInt(req.params.commentId);
    const userId = req.user!.id;

    if (isDemoMode) {
      // Get comment to check ownership
      const comments = demoStore.getTeamPostComments(parseInt(req.params.postId));
      const comment = comments.find(c => c.id === commentId);

      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      // Can delete if owner of comment, team owner, or admin
      const role = demoStore.getTeamMemberRole(teamId, userId);
      if (comment.userId !== userId && role !== 'owner' && role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      demoStore.deleteTeamPostComment(commentId);
      return res.json({ success: true });
    }

    res.status(500).json({ error: 'Database not available' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

export default router;
