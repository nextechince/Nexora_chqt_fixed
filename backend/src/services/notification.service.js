/**
 * Notification Service
 */
const { supabase } = require('../config/supabase');

const notificationService = {
  /**
   * Create notification
   */
  async createNotification(userId, type, title, body, data = {}) {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        body,
        data,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Emit real-time notification
    const io = global.io;
    if (io) {
      io.to(`user:${userId}`).emit('new_notification', notification);
    }

    return notification;
  },

  /**
   * Create message notification
   */
  async createMessageNotification(chatId, message, members) {
    const senderName = message.sender?.display_name || 'User';
    const chatName = message.chat?.name || 'Chat';

    const notifications = [];
    for (const member of members) {
      if (member.user_id === message.sender_id) continue;

      // Check if member has muted notifications
      if (member.mute_until && new Date(member.mute_until) > new Date()) {
        continue;
      }

      const title = senderName;
      const body = message.message_type === 'text' 
        ? message.content 
        : `📎 ${message.message_type}`;

      const notification = await this.createNotification(
        member.user_id,
        'message',
        title,
        body,
        { chatId, messageId: message.id }
      );

      notifications.push(notification);
    }

    return notifications;
  },

  /**
   * Create call notification
   */
  async createCallNotification(userId, callerId, type, callType, callId) {
    const { data: caller } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', callerId)
      .single();

    const callerName = caller?.display_name || 'User';
    const emoji = callType === 'voice' ? '📞' : '📹';

    const notification = await this.createNotification(
      userId,
      'call',
      `${emoji} ${callType} call from ${callerName}`,
      `Incoming ${callType} call`,
      { callerId, callId, callType, type }
    );

    return notification;
  },

  /**
   * Create group notification
   */
  async createGroupNotification(userId, groupId, action, actorId, data = {}) {
    const { data: actor } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', actorId)
      .single();

    const actorName = actor?.display_name || 'User';
    
    let title, body;
    switch (action) {
      case 'member_joined':
        title = `${actorName} joined the group`;
        body = `${actorName} has joined the group`;
        break;
      case 'member_left':
        title = `${actorName} left the group`;
        body = `${actorName} has left the group`;
        break;
      case 'member_added':
        title = `${actorName} added ${data.memberName} to the group`;
        body = `${data.memberName} was added to the group by ${actorName}`;
        break;
      case 'member_removed':
        title = `${actorName} removed ${data.memberName} from the group`;
        body = `${data.memberName} was removed from the group by ${actorName}`;
        break;
      case 'role_changed':
        title = `${actorName} changed ${data.memberName}'s role to ${data.newRole}`;
        body = `Role updated for ${data.memberName}`;
        break;
      case 'group_updated':
        title = `Group updated by ${actorName}`;
        body = `Group settings were updated`;
        break;
      default:
        title = `Group update`;
        body = `A group has been updated`;
    }

    const notification = await this.createNotification(
      userId,
      'group',
      title,
      body,
      { groupId, action, actorId, ...data }
    );

    return notification;
  },

  /**
   * Create channel notification
   */
  async createChannelNotification(userId, channelId, action, actorId, data = {}) {
    const { data: actor } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', actorId)
      .single();

    const actorName = actor?.display_name || 'User';
    
    let title, body;
    switch (action) {
      case 'new_post':
        title = `New post in ${data.channelName}`;
        body = `${actorName}: ${data.postTitle || 'New post'}`;
        break;
      case 'post_updated':
        title = `Post updated in ${data.channelName}`;
        body = `${actorName} updated a post`;
        break;
      case 'new_comment':
        title = `New comment from ${actorName}`;
        body = `${actorName} commented on a post`;
        break;
      default:
        title = `Channel update`;
        body = `A channel has been updated`;
    }

    const notification = await this.createNotification(
      userId,
      'channel',
      title,
      body,
      { channelId, action, actorId, ...data }
    );

    return notification;
  },

  /**
   * Create system notification
   */
  async createSystemNotification(userId, title, body, data = {}) {
    return this.createNotification(
      userId,
      'system',
      title,
      body,
      data
    );
  },

  /**
   * Get user notifications
   */
  async getUserNotifications(userId, limit = 50, offset = 0) {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_read', false);

    return {
      notifications: notifications || [],
      unreadCount: unreadCount || 0
    };
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return true;
  },

  /**
   * Delete notification
   */
  async deleteNotification(notificationId, userId) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  },

  /**
   * Delete all notifications
   */
  async deleteAllNotifications(userId) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  }
};

module.exports = notificationService;
