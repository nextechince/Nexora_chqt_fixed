/**
 * Chat Controller
 */
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../config/supabase');
const chatService = require('../services/chat.service');

const chatController = {
  /**
   * Get user's chats
   */
  async getChats(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 50, offset = 0 } = req.query;

      const chats = await chatService.getUserChats(userId, limit, offset);

      return res.status(200).json({ chats });
    } catch (error) {
      console.error('Get chats error:', error);
      return res.status(500).json({ error: 'Failed to get chats' });
    }
  },

  /**
   * Create a new chat
   */
  async createChat(req, res) {
    try {
      const userId = req.user.id;
      const { type, name, participants, avatar_url, description } = req.body;

      if (!type || !['private', 'group', 'channel'].includes(type)) {
        return res.status(400).json({ error: 'Invalid chat type' });
      }

      if (type === 'private') {
        if (!participants || participants.length !== 1) {
          return res.status(400).json({ error: 'Private chat requires exactly one participant' });
        }
        const chat = await chatService.createPrivateChat(userId, participants[0]);
        return res.status(201).json({ chat });
      }

      if (type === 'group') {
        if (!name) {
          return res.status(400).json({ error: 'Group name is required' });
        }
        const chat = await chatService.createGroup(userId, name, participants || [], avatar_url, description);
        return res.status(201).json({ chat });
      }

      if (type === 'channel') {
        if (!name) {
          return res.status(400).json({ error: 'Channel name is required' });
        }
        const chat = await chatService.createChannel(userId, name, participants || [], avatar_url, description);
        return res.status(201).json({ chat });
      }

      return res.status(400).json({ error: 'Invalid chat type' });
    } catch (error) {
      console.error('Create chat error:', error);
      return res.status(500).json({ error: 'Failed to create chat' });
    }
  },

  /**
   * Get chat details
   */
  async getChat(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const chat = await chatService.getChatDetails(id, userId);
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      return res.status(200).json({ chat });
    } catch (error) {
      console.error('Get chat error:', error);
      return res.status(500).json({ error: 'Failed to get chat' });
    }
  },

  /**
   * Update chat
   */
  async updateChat(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { name, avatar_url, description } = req.body;

      const chat = await chatService.updateChat(id, userId, { name, avatar_url, description });
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found or unauthorized' });
      }

      return res.status(200).json({ chat });
    } catch (error) {
      console.error('Update chat error:', error);
      return res.status(500).json({ error: 'Failed to update chat' });
    }
  },

  /**
   * Delete chat
   */
  async deleteChat(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const deleted = await chatService.deleteChat(id, userId);
      if (!deleted) {
        return res.status(404).json({ error: 'Chat not found or unauthorized' });
      }

      return res.status(200).json({ message: 'Chat deleted successfully' });
    } catch (error) {
      console.error('Delete chat error:', error);
      return res.status(500).json({ error: 'Failed to delete chat' });
    }
  },

  /**
   * Pin chat
   */
  async pinChat(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const chat = await chatService.pinChat(id, userId);
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found or unauthorized' });
      }

      return res.status(200).json({ message: 'Chat pinned successfully' });
    } catch (error) {
      console.error('Pin chat error:', error);
      return res.status(500).json({ error: 'Failed to pin chat' });
    }
  },

  /**
   * Unpin chat
   */
  async unpinChat(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const chat = await chatService.unpinChat(id, userId);
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found or unauthorized' });
      }

      return res.status(200).json({ message: 'Chat unpinned successfully' });
    } catch (error) {
      console.error('Unpin chat error:', error);
      return res.status(500).json({ error: 'Failed to unpin chat' });
    }
  },

  /**
   * Archive chat
   */
  async archiveChat(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const chat = await chatService.archiveChat(id, userId);
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found or unauthorized' });
      }

      return res.status(200).json({ message: 'Chat archived successfully' });
    } catch (error) {
      console.error('Archive chat error:', error);
      return res.status(500).json({ error: 'Failed to archive chat' });
    }
  },

  /**
   * Unarchive chat
   */
  async unarchiveChat(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const chat = await chatService.unarchiveChat(id, userId);
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found or unauthorized' });
      }

      return res.status(200).json({ message: 'Chat unarchived successfully' });
    } catch (error) {
      console.error('Unarchive chat error:', error);
      return res.status(500).json({ error: 'Failed to unarchive chat' });
    }
  },

  /**
   * Get chat members
   */
  async getMembers(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const members = await chatService.getChatMembers(id, userId);
      if (!members) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      return res.status(200).json({ members });
    } catch (error) {
      console.error('Get members error:', error);
      return res.status(500).json({ error: 'Failed to get members' });
    }
  },

  /**
   * Add member to chat
   */
  async addMember(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { memberId, role = 'member' } = req.body;

      const result = await chatService.addMember(id, userId, memberId, role);
      if (!result) {
        return res.status(404).json({ error: 'Chat not found or unauthorized' });
      }

      return res.status(200).json({ message: 'Member added successfully' });
    } catch (error) {
      console.error('Add member error:', error);
      return res.status(500).json({ error: 'Failed to add member' });
    }
  },

  /**
   * Remove member from chat
   */
  async removeMember(req, res) {
    try {
      const userId = req.user.id;
      const { id, memberId } = req.params;

      const result = await chatService.removeMember(id, userId, memberId);
      if (!result) {
        return res.status(404).json({ error: 'Chat not found or unauthorized' });
      }

      return res.status(200).json({ message: 'Member removed successfully' });
    } catch (error) {
      console.error('Remove member error:', error);
      return res.status(500).json({ error: 'Failed to remove member' });
    }
  },

  /**
   * Update member role
   */
  async updateMemberRole(req, res) {
    try {
      const userId = req.user.id;
      const { id, memberId } = req.params;
      const { role } = req.body;

      const result = await chatService.updateMemberRole(id, userId, memberId, role);
      if (!result) {
        return res.status(404).json({ error: 'Chat not found or unauthorized' });
      }

      return res.status(200).json({ message: 'Member role updated successfully' });
    } catch (error) {
      console.error('Update member role error:', error);
      return res.status(500).json({ error: 'Failed to update member role' });
    }
  }
};

module.exports = chatController;
