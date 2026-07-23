/**
 * Group Controller
 */
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../config/supabase');
const chatService = require('../services/chat.service');
const notificationService = require('../services/notification.service');

const groupController = {
  /**
   * Get user's groups
   */
  async getGroups(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 50, offset = 0 } = req.query;

      const { data: groups, error } = await supabase
        .from('chat_members')
        .select(`
          chat_id,
          role,
          joined_at,
          chat:chats!inner(
            id,
            name,
            avatar_url,
            description,
            created_at,
            updated_at,
            created_by,
            is_private
          )
        `)
        .eq('user_id', userId)
        .eq('chat.type', 'group')
        .range(offset, offset + limit - 1)
        .order('chat.updated_at', { ascending: false });

      if (error) throw error;

      // Get member counts and last messages
      const groupsWithData = await Promise.all(groups.map(async (item) => {
        const { count: memberCount } = await supabase
          .from('chat_members')
          .select('id', { count: 'exact' })
          .eq('chat_id', item.chat_id);

        const { data: lastMessage } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            message_type,
            created_at,
            sender:sender_id(id, username, display_name)
          `)
          .eq('chat_id', item.chat_id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...item.chat,
          role: item.role,
          memberCount: memberCount || 0,
          lastMessage: lastMessage || null,
          joinedAt: item.joined_at
        };
      }));

      return res.status(200).json({ groups: groupsWithData });
    } catch (error) {
      console.error('Get groups error:', error);
      return res.status(500).json({ error: 'Failed to get groups' });
    }
  },

  /**
   * Create group
   */
  async createGroup(req, res) {
    try {
      const userId = req.user.id;
      const { 
        name, 
        description, 
        avatar_url, 
        participants = [],
        joinType = 'invite_only',
        isPrivate = false
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Group name is required' });
      }

      const chat = await chatService.createGroup(
        userId, 
        name, 
        participants, 
        avatar_url, 
        description
      );

      // Update group settings
      await supabase
        .from('groups')
        .update({
          join_type: joinType,
          is_private: isPrivate
        })
        .eq('id', chat.id);

      // Notify participants
      const io = req.app.get('io');
      if (io && participants.length > 0) {
        participants.forEach(participantId => {
          io.to(`user:${participantId}`).emit('group_created', {
            group: chat,
            invitedBy: userId
          });
        });
      }

      return res.status(201).json({ group: chat });
    } catch (error) {
      console.error('Create group error:', error);
      return res.status(500).json({ error: 'Failed to create group' });
    }
  },

  /**
   * Get group details
   */
  async getGroup(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const chat = await chatService.getChatDetails(id, userId);
      if (!chat || chat.type !== 'group') {
        return res.status(404).json({ error: 'Group not found' });
      }

      // Get group stats
      const { data: group } = await supabase
        .from('groups')
        .select('*')
        .eq('id', id)
        .single();

      // Get member count
      const { count: memberCount } = await supabase
        .from('chat_members')
        .select('id', { count: 'exact' })
        .eq('chat_id', id);

      // Get recent activity
      const { data: recentMessages } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          message_type,
          created_at,
          sender:sender_id(id, username, display_name, avatar_url)
        `)
        .eq('chat_id', id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(10);

      return res.status(200).json({
        group: {
          ...chat,
          ...group,
          memberCount: memberCount || 0,
          recentMessages: recentMessages || []
        }
      });
    } catch (error) {
      console.error('Get group error:', error);
      return res.status(500).json({ error: 'Failed to get group' });
    }
  },

  /**
   * Update group
   */
  async updateGroup(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { name, description, avatar_url, isPrivate, joinType } = req.body;

      // Check if user is owner or admin
      const { data: membership, error: memberError } = await supabase
        .from('chat_members')
        .select('role')
        .eq('chat_id', id)
        .eq('user_id', userId)
        .single();

      if (memberError || !membership || !['owner', 'admin'].includes(membership.role)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Update chat
      const chat = await chatService.updateChat(id, userId, {
        name,
        description,
        avatar_url
      });

      if (!chat) {
        return res.status(404).json({ error: 'Group not found' });
      }

      // Update group settings
      if (isPrivate !== undefined || joinType) {
        const updates = {};
        if (isPrivate !== undefined) updates.is_private = isPrivate;
        if (joinType) updates.join_type = joinType;

        await supabase
          .from('groups')
          .update(updates)
          .eq('id', id);
      }

      // Notify members
      const io = req.app.get('io');
      if (io) {
        const members = await chatService.getChatMembers(id, userId);
        if (members) {
          members.forEach(member => {
            if (member.user_id !== userId) {
              io.to(`user:${member.user_id}`).emit('group_updated', {
                groupId: id,
                updates: { name, description, avatar_url, isPrivate, joinType },
                updatedBy: userId
              });
            }
          });
        }
      }

      return res.status(200).json({ group: chat });
    } catch (error) {
      console.error('Update group error:', error);
      return res.status(500).json({ error: 'Failed to update group' });
    }
  },

  /**
   * Delete group
   */
  async deleteGroup(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // Check if user is owner
      const { data: membership, error: memberError } = await supabase
        .from('chat_members')
        .select('role')
        .eq('chat_id', id)
        .eq('user_id', userId)
        .single();

      if (memberError || !membership || membership.role !== 'owner') {
        return res.status(403).json({ error: 'Only group owner can delete the group' });
      }

      // Get members for notification
      const members = await chatService.getChatMembers(id, userId);

      // Delete group
      await chatService.deleteChat(id, userId);

      // Notify members
      const io = req.app.get('io');
      if (io && members) {
        members.forEach(member => {
          io.to(`user:${member.user_id}`).emit('group_deleted', {
            groupId: id,
            deletedBy: userId
          });
        });
      }

      return res.status(200).json({ message: 'Group deleted successfully' });
    } catch (error) {
      console.error('Delete group error:', error);
      return res.status(500).json({ error: 'Failed to delete group' });
    }
  },

  /**
   * Join group
   */
  async joinGroup(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { inviteLink } = req.body;

      // Check if group exists
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', id)
        .single();

      if (groupError || !group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      // Check join type
      if (group.join_type === 'invite_only') {
        // Check invite link
        if (!inviteLink || group.invite_link !== inviteLink) {
          return res.status(403).json({ error: 'Invalid or missing invite link' });
        }
      }

      if (group.join_type === 'private') {
        return res.status(403).json({ error: 'This group is private' });
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from('chat_members')
        .select('id')
        .eq('chat_id', id)
        .eq('user_id', userId)
        .single();

      if (existing) {
        return res.status(400).json({ error: 'Already a member of this group' });
      }

      // Add member
      await supabase
        .from('chat_members')
        .insert({
          chat_id: id,
          user_id: userId,
          role: 'member'
        });

      // Notify group
      const io = req.app.get('io');
      if (io) {
        const members = await chatService.getChatMembers(id, userId);
        if (members) {
          members.forEach(member => {
            if (member.user_id !== userId) {
              io.to(`user:${member.user_id}`).emit('member_joined', {
                groupId: id,
                userId,
                member: {
                  id: userId,
                  display_name: req.user.display_name,
                  username: req.user.username
                }
              });
            }
          });
        }
      }

      return res.status(200).json({ message: 'Joined group successfully' });
    } catch (error) {
      console.error('Join group error:', error);
      return res.status(500).json({ error: 'Failed to join group' });
    }
  },

  /**
   * Leave group
   */
  async leaveGroup(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // Check if member
      const { data: membership, error: memberError } = await supabase
        .from('chat_members')
        .select('role')
        .eq('chat_id', id)
        .eq('user_id', userId)
        .single();

      if (memberError || !membership) {
        return res.status(404).json({ error: 'Not a member of this group' });
      }

      // Owner cannot leave without transferring ownership
      if (membership.role === 'owner') {
        // Check if there are other members
        const { count } = await supabase
          .from('chat_members')
          .select('id', { count: 'exact' })
          .eq('chat_id', id)
          .neq('user_id', userId);

        if (count > 0) {
          return res.status(400).json({ 
            error: 'Transfer ownership to another member before leaving' 
          });
        }
      }

      // Remove member
      await supabase
        .from('chat_members')
        .delete()
        .eq('chat_id', id)
        .eq('user_id', userId);

      // Notify group
      const io = req.app.get('io');
      if (io) {
        const members = await chatService.getChatMembers(id, userId);
        if (members) {
          members.forEach(member => {
            if (member.user_id !== userId) {
              io.to(`user:${member.user_id}`).emit('member_left', {
                groupId: id,
                userId
              });
            }
          });
        }
      }

      return res.status(200).json({ message: 'Left group successfully' });
    } catch (error) {
      console.error('Leave group error:', error);
      return res.status(500).json({ error: 'Failed to leave group' });
    }
  },

  /**
   * Transfer ownership
   */
  async transferOwnership(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { newOwnerId } = req.body;

      // Check if user is owner
      const { data: membership, error: memberError } = await supabase
        .from('chat_members')
        .select('role')
        .eq('chat_id', id)
        .eq('user_id', userId)
        .single();

      if (memberError || !membership || membership.role !== 'owner') {
        return res.status(403).json({ error: 'Only group owner can transfer ownership' });
      }

      // Check if new owner is a member
      const { data: newOwner, error: newOwnerError } = await supabase
        .from('chat_members')
        .select('id')
        .eq('chat_id', id)
        .eq('user_id', newOwnerId)
        .single();

      if (newOwnerError || !newOwner) {
        return res.status(404).json({ error: 'New owner must be a member of the group' });
      }

      // Update roles
      await supabase
        .from('chat_members')
        .update({ role: 'member' })
        .eq('chat_id', id)
        .eq('user_id', userId);

      await supabase
        .from('chat_members')
        .update({ role: 'owner' })
        .eq('chat_id', id)
        .eq('user_id', newOwnerId);

      // Notify group
      const io = req.app.get('io');
      if (io) {
        const members = await chatService.getChatMembers(id, userId);
        if (members) {
          members.forEach(member => {
            io.to(`user:${member.user_id}`).emit('ownership_transferred', {
              groupId: id,
              newOwnerId,
              previousOwnerId: userId
            });
          });
        }
      }

      return res.status(200).json({ 
        message: 'Ownership transferred successfully',
        newOwnerId 
      });
    } catch (error) {
      console.error('Transfer ownership error:', error);
      return res.status(500).json({ error: 'Failed to transfer ownership' });
    }
  },

  /**
   * Generate invite link
   */
  async generateInviteLink(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { expiresIn = 7 } = req.body; // Days

      // Check if user is owner or admin
      const { data: membership, error: memberError } = await supabase
        .from('chat_members')
        .select('role')
        .eq('chat_id', id)
        .eq('user_id', userId)
        .single();

      if (memberError || !membership || !['owner', 'admin'].includes(membership.role)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Generate invite link
      const inviteLink = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresIn);

      await supabase
        .from('groups')
        .update({
          invite_link: inviteLink,
          invite_link_expires: expiresAt.toISOString()
        })
        .eq('id', id);

      const link = `${process.env.APP_URL}/join/${inviteLink}`;

      return res.status(200).json({ 
        inviteLink: link,
        expiresAt: expiresAt.toISOString()
      });
    } catch (error) {
      console.error('Generate invite link error:', error);
      return res.status(500).json({ error: 'Failed to generate invite link' });
    }
  },

  /**
   * Revoke invite link
   */
  async revokeInviteLink(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // Check if user is owner or admin
      const { data: membership, error: memberError } = await supabase
        .from('chat_members')
        .select('role')
        .eq('chat_id', id)
        .eq('user_id', userId)
        .single();

      if (memberError || !membership || !['owner', 'admin'].includes(membership.role)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await supabase
        .from('groups')
        .update({
          invite_link: null,
          invite_link_expires: null
        })
        .eq('id', id);

      return res.status(200).json({ message: 'Invite link revoked' });
    } catch (error) {
      console.error('Revoke invite link error:', error);
      return res.status(500).json({ error: 'Failed to revoke invite link' });
    }
  },

  /**
   * Mute group notifications
   */
  async muteGroup(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { duration = 3600 } = req.body; // Seconds

      const muteUntil = new Date();
      muteUntil.setSeconds(muteUntil.getSeconds() + duration);

      await supabase
        .from('chat_members')
        .update({ mute_until: muteUntil.toISOString() })
        .eq('chat_id', id)
        .eq('user_id', userId);

      return res.status(200).json({ 
        message: 'Group muted',
        muteUntil: muteUntil.toISOString()
      });
    } catch (error) {
      console.error('Mute group error:', error);
      return res.status(500).json({ error: 'Failed to mute group' });
    }
  },

  /**
   * Unmute group
   */
  async unmuteGroup(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      await supabase
        .from('chat_members')
        .update({ mute_until: null })
        .eq('chat_id', id)
        .eq('user_id', userId);

      return res.status(200).json({ message: 'Group unmuted' });
    } catch (error) {
      console.error('Unmute group error:', error);
      return res.status(500).json({ error: 'Failed to unmute group' });
    }
  }
};

module.exports = groupController;
