/**
 * Chat Socket Handler
 */
const messageService = require('../services/message.service');
const notificationService = require('../services/notification.service');

function chatSocket(io, socket) {
  const userId = socket.userId;

  // Join chat room
  socket.on('join_chat', (data) => {
    const { chatId } = data;
    socket.join(`chat:${chatId}`);
    console.log(`User ${userId} joined chat ${chatId}`);
  });

  // Leave chat room
  socket.on('leave_chat', (data) => {
    const { chatId } = data;
    socket.leave(`chat:${chatId}`);
    console.log(`User ${userId} left chat ${chatId}`);
  });

  // Send message
  socket.on('send_message', async (data) => {
    try {
      const { chatId, message } = data;
      
      // Save message
      const newMessage = await messageService.sendMessage({
        chatId,
        senderId: userId,
        content: message.content,
        messageType: message.messageType || 'text',
        replyToId: message.replyToId,
        media: message.media
      });

      // Emit to chat room
      io.to(`chat:${chatId}`).emit('new_message', {
        chatId,
        message: newMessage
      });

      // Notify other members
      const members = await messageService.getChatMembers(chatId);
      members.forEach(member => {
        if (member.user_id !== userId) {
          io.to(`user:${member.user_id}`).emit('new_message', {
            chatId,
            message: newMessage
          });
        }
      });

      // Create notifications
      await notificationService.createMessageNotification(chatId, newMessage, members);

    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Edit message
  socket.on('edit_message', async (data) => {
    try {
      const { messageId, content } = data;
      
      const message = await messageService.editMessage(messageId, userId, content);
      if (!message) {
        socket.emit('error', { message: 'Message not found or unauthorized' });
        return;
      }

      io.to(`chat:${message.chat_id}`).emit('message_updated', {
        messageId,
        chatId: message.chat_id,
        content: message.content,
        updatedAt: message.updated_at
      });

    } catch (error) {
      console.error('Edit message error:', error);
      socket.emit('error', { message: 'Failed to edit message' });
    }
  });

  // Delete message
  socket.on('delete_message', async (data) => {
    try {
      const { messageId, forEveryone = true } = data;
      
      const deleted = await messageService.deleteMessage(messageId, userId, forEveryone);
      if (!deleted) {
        socket.emit('error', { message: 'Message not found or unauthorized' });
        return;
      }

      io.to(`chat:${deleted.chatId}`).emit('message_deleted', {
        messageId,
        chatId: deleted.chatId,
        forEveryone
      });

    } catch (error) {
      console.error('Delete message error:', error);
      socket.emit('error', { message: 'Failed to delete message' });
    }
  });

  // Typing indicator
  socket.on('typing_start', (data) => {
    const { chatId } = data;
    socket.to(`chat:${chatId}`).emit('typing_start', {
      userId,
      chatId,
      userName: socket.user?.display_name || 'User'
    });
  });

  socket.on('typing_stop', (data) => {
    const { chatId } = data;
    socket.to(`chat:${chatId}`).emit('typing_stop', {
      userId,
      chatId
    });
  });

  // Mark as read
  socket.on('message_read', async (data) => {
    try {
      const { chatId, messageId } = data;
      
      await messageService.markAsRead(messageId, userId);

      // Notify sender
      const message = await messageService.getMessage(messageId);
      if (message && message.sender_id !== userId) {
        io.to(`user:${message.sender_id}`).emit('message_read', {
          chatId,
          messageId,
          userId
        });
      }

    } catch (error) {
      console.error('Mark as read error:', error);
    }
  });

  // Mark as delivered
  socket.on('message_delivered', async (data) => {
    try {
      const { chatId, messageId } = data;
      
      await messageService.markAsDelivered(messageId, userId);

      // Notify sender
      const message = await messageService.getMessage(messageId);
      if (message && message.sender_id !== userId) {
        io.to(`user:${message.sender_id}`).emit('message_delivered', {
          chatId,
          messageId,
          userId
        });
      }

    } catch (error) {
      console.error('Mark as delivered error:', error);
    }
  });

  // Message reaction
  socket.on('message_reaction', async (data) => {
    try {
      const { messageId, emoji, action } = data;
      
      let result;
      if (action === 'add') {
        result = await messageService.addReaction(messageId, userId, emoji);
      } else {
        result = await messageService.removeReaction(messageId, userId, emoji);
      }

      if (!result) {
        socket.emit('error', { message: 'Failed to update reaction' });
        return;
      }

      io.to(`chat:${result.chat_id}`).emit('message_reaction', {
        messageId,
        chatId: result.chat_id,
        userId,
        emoji,
        action
      });

    } catch (error) {
      console.error('Reaction error:', error);
      socket.emit('error', { message: 'Failed to update reaction' });
    }
  });

  // Pin message
  socket.on('message_pin', async (data) => {
    try {
      const { messageId } = data;
      
      const message = await messageService.pinMessage(messageId, userId);
      if (!message) {
        socket.emit('error', { message: 'Message not found or unauthorized' });
        return;
      }

      io.to(`chat:${message.chat_id}`).emit('message_pinned', {
        messageId,
        chatId: message.chat_id,
        message
      });

    } catch (error) {
      console.error('Pin message error:', error);
      socket.emit('error', { message: 'Failed to pin message' });
    }
  });
}

module.exports = chatSocket;
