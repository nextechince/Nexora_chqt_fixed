/**
 * Message Controller
 */
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../config/supabase');
const messageService = require('../services/message.service');
const notificationService = require('../services/notification.service');

const messageController = {
  /**
   * Get messages
   */
  async getMessages(req, res) {
    try {
      const userId = req.user.id;
      const { chatId } = req.params;
      const { limit = 50, offset = 0, before } = req.query;

      const messages = await messageService.getMessages(chatId, userId, {
        limit,
        offset,
        before
      });

      return res.status(200).json({ messages });
    } catch (error) {
      console.error('Get messages error:', error);
      return res.status(500).json({ error: 'Failed to get messages' });
    }
  },

  /**
   * Send message
   */
  async sendMessage(req, res) {
    try {
      const userId = req.user.id;
      const { chatId } = req.params;
      const { content, messageType = 'text', replyToId, media } = req.body;

      const message = await messageService.sendMessage({
        chatId,
        senderId: userId,
        content,
        messageType,
        replyToId,
        media
      });

      // Send real-time notification
      const io = req.app.get('io');
      if (io) {
        // Emit to chat room
        io.to(`chat:${chatId}`).emit('new_message', {
          chatId,
          message
        });

        // Notify other members
        const members = await messageService.getChatMembers(chatId);
        members.forEach(member => {
          if (member.user_id !== userId) {
            io.to(`user:${member.user_id}`).emit('new_message', {
              chatId,
              message
            });
          }
        });

        // Create notification
        await notificationService.createMessageNotification(chatId, message, members);
      }

      return res.status(201).json({ message });
    } catch (error) {
      console.error('Send message error:', error);
      return res.status(500).json({ error: 'Failed to send message' });
    }
  },

  /**
   * Edit message
   */
  async editMessage(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { content } = req.body;

      const message = await messageService.editMessage(id, userId, content);
      if (!message) {
        return res.status(404).json({ error: 'Message not found or unauthorized' });
      }

      // Send real-time update
      const io = req.app.get('io');
      if (io) {
        io.to(`chat:${message.chat_id}`).emit('message_updated', {
          messageId: id,
          chatId: message.chat_id,
          content: message.content,
          updatedAt: message.updated_at
        });
      }

      return res.status(200).json({ message });
    } catch (error) {
      console.error('Edit message error:', error);
      return res.status(500).json({ error: 'Failed to edit message' });
    }
  },

  /**
   * Delete message
   */
  async deleteMessage(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { forEveryone = true } = req.body;

      const deleted = await messageService.deleteMessage(id, userId, forEveryone);
      if (!deleted) {
        return res.status(404).json({ error: 'Message not found or unauthorized' });
      }

      // Send real-time deletion
      const io = req.app.get('io');
      if (io) {
        io.to(`chat:${deleted.chatId}`).emit('message_deleted', {
          messageId: id,
          chatId: deleted.chatId,
          forEveryone
        });
      }

      return res.status(200).json({ message: 'Message deleted successfully' });
    } catch (error) {
      console.error('Delete message error:', error);
      return res.status(500).json({ error: 'Failed to delete message' });
    }
  },

  /**
   * Pin message
   */
  async pinMessage(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const message = await messageService.pinMessage(id, userId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found or unauthorized' });
      }

      // Send real-time update
      const io = req.app.get('io');
      if (io) {
        io.to(`chat:${message.chat_id}`).emit('message_pinned', {
          messageId: id,
          chatId: message.chat_id,
          message
        });
      }

      return res.status(200).json({ message: 'Message pinned successfully' });
    } catch (error) {
      console.error('Pin message error:', error);
      return res.status(500).json({ error: 'Failed to pin message' });
    }
  },

  /**
   * Unpin message
   */
  async unpinMessage(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const message = await messageService.unpinMessage(id, userId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found or unauthorized' });
      }

      return res.status(200).json({ message: 'Message unpinned successfully' });
    } catch (error) {
      console.error('Unpin message error:', error);
      return res.status(500).json({ error: 'Failed to unpin message' });
    }
  },

  /**
   * Add reaction to message
   */
  async addReaction(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { emoji } = req.body;

      const reaction = await messageService.addReaction(id, userId, emoji);
      if (!reaction) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Send real-time update
      const io = req.app.get('io');
      if (io) {
        io.to(`chat:${reaction.chat_id}`).emit('message_reaction', {
          messageId: id,
          chatId: reaction.chat_id,
          userId,
          emoji,
          action: 'add'
        });
      }

      return res.status(200).json({ reaction });
    } catch (error) {
      console.error('Add reaction error:', error);
      return res.status(500).json({ error: 'Failed to add reaction' });
    }
  },

  /**
   * Remove reaction from message
   */
  async removeReaction(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { emoji } = req.body;

      const removed = await messageService.removeReaction(id, userId, emoji);
      if (!removed) {
        return res.status(404).json({ error: 'Message or reaction not found' });
      }

      // Send real-time update
      const io = req.app.get('io');
      if (io) {
        io.to(`chat:${removed.chat_id}`).emit('message_reaction', {
          messageId: id,
          chatId: removed.chat_id,
          userId,
          emoji,
          action: 'remove'
        });
      }

      return res.status(200).json({ message: 'Reaction removed successfully' });
    } catch (error) {
      console.error('Remove reaction error:', error);
      return res.status(500).json({ error: 'Failed to remove reaction' });
    }
  },

  /**
   * Mark message as read
   */
  async markAsRead(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const result = await messageService.markAsRead(id, userId);
      if (!result) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Send real-time update
      const io = req.app.get('io');
      if (io) {
        io.to(`chat:${result.chatId}`).emit('message_read', {
          messageId: id,
          chatId: result.chatId,
          userId
        });
      }

      return res.status(200).json({ message: 'Marked as read' });
    } catch (error) {
      console.error('Mark as read error:', error);
      return res.status(500).json({ error: 'Failed to mark as read' });
    }
  },

  /**
   * Search messages
   */
  async searchMessages(req, res) {
    try {
      const userId = req.user.id;
      const { q, chatId, limit = 20, offset = 0 } = req.query;

      if (!q || q.length < 2) {
        return res.status(400).json({ error: 'Search query must be at least 2 characters' });
      }

      const results = await messageService.searchMessages(userId, q, { chatId, limit, offset });

      return res.status(200).json({ results });
    } catch (error) {
      console.error('Search messages error:', error);
      return res.status(500).json({ error: 'Failed to search messages' });
    }
  },

  /**
   * Forward message
   */
  async forwardMessage(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { chatId } = req.body;

      const message = await messageService.forwardMessage(id, userId, chatId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found or cannot forward' });
      }

      // Send real-time notification
      const io = req.app.get('io');
      if (io) {
        io.to(`chat:${chatId}`).emit('new_message', {
          chatId,
          message
        });
      }

      return res.status(200).json({ message });
    } catch (error) {
      console.error('Forward message error:', error);
      return res.status(500).json({ error: 'Failed to forward message' });
    }
  },

  /**
   * Reply to message
   */
  async replyToMessage(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { content } = req.body;

      const message = await messageService.replyToMessage(id, userId, content);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Send real-time notification
      const io = req.app.get('io');
      if (io) {
        io.to(`chat:${message.chat_id}`).emit('new_message', {
          chatId: message.chat_id,
          message
        });
      }

      return res.status(200).json({ message });
    } catch (error) {
      console.error('Reply to message error:', error);
      return res.status(500).json({ error: 'Failed to reply to message' });
    }
  }
};

module.exports = messageController;
