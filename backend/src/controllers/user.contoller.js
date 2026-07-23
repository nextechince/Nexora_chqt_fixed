/**
 * User Controller
 */
const { supabase } = require('../config/supabase');
const { hashPassword } = require('../utils/auth');

const userController = {
  /**
   * Get current user profile
   */
  async getProfile(req, res) {
    try {
      const userId = req.user.id;

      const { data: user, error } = await supabase
        .from('users')
        .select(`
          id,
          phone,
          email,
          username,
          display_name,
          avatar_url,
          bio,
          status,
          is_verified,
          is_premium,
          premium_until,
          last_seen,
          online_status,
          created_at,
          profile:profiles(*)
        `)
        .eq('id', userId)
        .single();

      if (error || !user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({ user });

    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({ error: 'Failed to get profile' });
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { displayName, bio, status } = req.body;

      const updates = {};
      if (displayName) updates.display_name = displayName;
      if (bio !== undefined) updates.bio = bio;
      if (status !== undefined) updates.status = status;

      const { data: user, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: 'Failed to update profile' });
      }

      return res.status(200).json({
        message: 'Profile updated successfully',
        user
      });

    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  },

  /**
   * Update username
   */
  async updateUsername(req, res) {
    try {
      const userId = req.user.id;
      const { username } = req.body;

      // Check if username is taken
      const { data: existing, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .neq('id', userId)
        .single();

      if (existing) {
        return res.status(400).json({ error: 'Username is already taken' });
      }

      const { data: user, error } = await supabase
        .from('users')
        .update({ username })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: 'Failed to update username' });
      }

      return res.status(200).json({
        message: 'Username updated successfully',
        user
      });

    } catch (error) {
      console.error('Update username error:', error);
      return res.status(500).json({ error: 'Failed to update username' });
    }
  },

  /**
   * Update avatar
   */
  async updateAvatar(req, res) {
    try {
      const userId = req.user.id;
      const { avatarUrl } = req.body;

      const { data: user, error } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: 'Failed to update avatar' });
      }

      return res.status(200).json({
        message: 'Avatar updated successfully',
        avatar_url: user.avatar_url
      });

    } catch (error) {
      console.error('Update avatar error:', error);
      return res.status(500).json({ error: 'Failed to update avatar' });
    }
  },

  /**
   * Search users
   */
  async searchUsers(req, res) {
    try {
      const { q, limit = 20, offset = 0 } = req.query;

      if (!q || q.length < 2) {
        return res.status(400).json({ error: 'Search query must be at least 2 characters' });
      }

      const { data: users, error } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, online_status, is_verified, is_premium')
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%,phone.ilike.%${q}%`)
        .neq('id', req.user.id)
        .limit(limit)
        .offset(offset);

      if (error) {
        return res.status(500).json({ error: 'Search failed' });
      }

      return res.status(200).json({ users });

    } catch (error) {
      console.error('Search users error:', error);
      return res.status(500).json({ error: 'Search failed' });
    }
  },

  /**
   * Get user by ID
   */
  async getUserById(req, res) {
    try {
      const { id } = req.params;

      const { data: user, error } = await supabase
        .from('users')
        .select(`
          id,
          username,
          display_name,
          avatar_url,
          bio,
          status,
          is_verified,
          is_premium,
          last_seen,
          online_status,
          created_at
        `)
        .eq('id', id)
        .single();

      if (error || !user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({ user });

    } catch (error) {
      console.error('Get user error:', error);
      return res.status(500).json({ error: 'Failed to get user' });
    }
  },

  /**
   * Block user
   */
  async blockUser(req, res) {
    try {
      const userId = req.user.id;
      const { blockedId } = req.params;

      if (userId === blockedId) {
        return res.status(400).json({ error: 'Cannot block yourself' });
      }

      // Check if already blocked
      const { data: existing, error: checkError } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', userId)
        .eq('blocked_id', blockedId)
        .single();

      if (existing) {
        return res.status(400).json({ error: 'User is already blocked' });
      }

      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: userId,
          blocked_id: blockedId
        });

      if (error) {
        return res.status(500).json({ error: 'Failed to block user' });
      }

      return res.status(200).json({
        message: 'User blocked successfully'
      });

    } catch (error) {
      console.error('Block user error:', error);
      return res.status(500).json({ error: 'Failed to block user' });
    }
  },

  /**
   * Unblock user
   */
  async unblockUser(req, res) {
    try {
      const userId = req.user.id;
      const { blockedId } = req.params;

      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', userId)
        .eq('blocked_id', blockedId);

      if (error) {
        return res.status(500).json({ error: 'Failed to unblock user' });
      }

      return res.status(200).json({
        message: 'User unblocked successfully'
      });

    } catch (error) {
      console.error('Unblock user error:', error);
      return res.status(500).json({ error: 'Failed to unblock user' });
    }
  },

  /**
   * Get blocked users
   */
  async getBlockedUsers(req, res) {
    try {
      const userId = req.user.id;

      const { data: blocked, error } = await supabase
        .from('blocked_users')
        .select(`
          blocked_id,
          users:blocked_id (
            id,
            username,
            display_name,
            avatar_url
          ),
          created_at
        `)
        .eq('blocker_id', userId);

      if (error) {
        return res.status(500).json({ error: 'Failed to get blocked users' });
      }

      return res.status(200).json({ blocked });

    } catch (error) {
      console.error('Get blocked users error:', error);
      return res.status(500).json({ error: 'Failed to get blocked users' });
    }
  },

  /**
   * Update privacy settings
   */
  async updatePrivacy(req, res) {
    try {
      const userId = req.user.id;
      const { profilePhoto, status, lastSeen, readReceipts } = req.body;

      const updates = {};
      if (profilePhoto) updates.privacy_profile_photo = profilePhoto;
      if (status) updates.privacy_status = status;
      if (lastSeen) updates.privacy_last_seen = lastSeen;
      if (readReceipts !== undefined) updates.read_receipts = readReceipts;

      const { data: settings, error } = await supabase
        .from('settings')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: 'Failed to update privacy settings' });
      }

      return res.status(200).json({
        message: 'Privacy settings updated',
        settings
      });

    } catch (error) {
      console.error('Update privacy error:', error);
      return res.status(500).json({ error: 'Failed to update privacy settings' });
    }
  }
};

module.exports = userController;
