/**
 * Channel Controller
 */
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../config/supabase');
const chatService = require('../services/chat.service');
const notificationService = require('../services/notification.service');

const channelController = {
  /**
   * Get user's channels
   */
  async getChannels(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 50, offset = 0 } = req.query;

      const { data: channels, error } = await supabase
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
          ),
          channel:channels!inner(
            subscriber_count,
            is_verified,
            category,
            cover_url
          )
        `)
        .eq('user_id', userId)
        .eq('chat.type', 'channel')
        .range(offset, offset + limit - 1)
        .order('chat.updated_at', { ascending: false });

      if (error) throw error;

      // Get last posts
      const channelsWithPosts = await Promise.all(channels.map(async (item) => {
        const { data: lastPost } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            message_type,
            created_at,
            sender:sender_id(id, username, display_name, avatar_url)
          `)
          .eq('chat_id', item.chat_id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...item.chat,
          ...item.channel,
          role: item.role,
          lastPost: lastPost || null,
          joinedAt: item.joined_at
        };
      }));

      return res.status(200).json({ channels: channelsWithPosts });
    } catch (error) {
      console.error('Get channels error:', error);
      return res.status(500).json({ error: 'Failed to get channels' });
    }
  },

  /**
   * Create channel
   */
  async createChannel(req, res) {
    try {
      const userId = req.user.id;
      const { 
        name, 
        description, 
        avatar_url, 
        cover_url,
        category = 'general',
        isPrivate = false,
        participants = []
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Channel name is required' });
      }

      const chat = await chatService.createChannel(
        userId, 
        name, 
        participants, 
        avatar_url, 
        description
      );

      // Update channel settings
      await supabase
        .from('channels')
        .update({
          category,
          is_verified: false,
          cover_url: cover_url || null,
          subscriber_count: participants.length
        })
        .eq('id', chat.id);

      // Notify participants
      const io = req.app.get('io');
      if (io && participants.length > 0) {
        participants.forEach(participantId => {
          io.to(`user:${participantId}`).emit('channel_created', {
            channel: chat,
            createdBy: userId
          });
        });
      }

      return res.status(201).json({ channel: chat });
    } catch (error) {
      console.error('Create channel error:', error);
      return res.status(500).json({ error: 'Failed to create channel' });
    }
  },

  /**
   * Get channel details
   */
  async getChannel(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const chat = await chatService.getChatDetails(id, userId);
      if (!chat || chat.type !== 'channel') {
        return res.status(404).json({ error: 'Channel not found' });
      }

      // Get channel data
      const { data: channel, error: channelError } = await supabase
        .from('channels')
        .select('*')
        .eq('id', id)
        .single();

      if (channelError) throw channelError;

      // Get subscriber count
      const { count: subscriberCount } = await supabase
        .from('chat_members')
        .select('id', { count: 'exact' })
        .eq('chat_id', id);

      // Get recent posts
      const { data: recentPosts } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          message_type,
          media_url,
          created_at,
          sender:sender_id(id, username, display_name, avatar_url),
          reactions:message_reactions(
            reaction,
            user_id
          )
        `)
        .eq('chat_id', id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(20);

      // Check if user is subscribed
      const { data: subscription } = await supabase
        .from('chat_members')
        .select('role')
        .eq('chat_id', id)
        .eq('user_id', userId)
        .single();

      return res.status(200).json({
        channel: {
          ...chat,
          ...channel,
          subscriberCount: subscriberCount || 0,
          isSubscribed: !!subscription,
          userRole: subscription?.role || null,
          recentPosts: recentPosts || []
        }
      });
    } catch (error) {
      console.error('Get channel error:', error);
      return res.status(500).json({ error: 'Failed to get channel' });
    }
  },

  /**
   * Update channel
   */
  async updateChannel(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { name, description, avatar_url, cover_url, category } = req.body;

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
        return res.status(404).json({ error: 'Channel not found' });
      }

      // Update channel
      const updates = {};
      if (cover_url) updates.cover_url = cover_url;
      if (category) updates.category = category;

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('channels')
          .update(updates)
          .eq('id', id);
      }

      // Notify subscribers
      const io = req.app.get('io');
      if (io) {
        const members = await chatService.getChatMembers(id, userId);
        if (members) {
          members.forEach(member => {
            if (member.user_id !== userId) {
              io.to(`user:${member.user_id}`).emit('channel_updated', {
                channelId: id,
                updates: { name, description, avatar_url, cover_url, category },
                updatedBy: userId
              });
            }
          });
        }
      }

      return res.status(200).json({ channel: chat });
    } catch (error) {
      console.error('Update channel error:', error);
      return res.status(500).json({ error: 'Failed to update channel' });
    }
  },

  /**
   * Delete channel
   */
  async deleteChannel(req, res) {
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
        return res.status(403).json({ error: 'Only channel owner can delete the channel' });
      }

      // Get subscribers for notification
      const members = await chatService.getChatMembers(id, userId);

      // Delete channel
      await chatService.deleteChat(id, userId);

      // Notify subscribers
      const io = req.app.get('io');
      if (io && members) {
        members.forEach(member => {
          io.to(`user:${member.user_id}`).emit('channel_deleted', {
            channelId: id,
            deletedBy: userId
          });
        });
      }

      return res.status(200).json({ message: 'Channel deleted successfully' });
    } catch (error) {
      console.error('Delete channel error:', error);
      return res.status(500).json({ error: 'Failed to delete channel' });
    }
  },

  /**
   * Subscribe to channel
   */
  async subscribe(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // Check if channel exists
      const { data: channel, error: channelError } = await supabase
        .from('channels')
        .select('id')
        .eq('id', id)
        .single();

      if (channelError || !channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      // Check if already subscribed
      const { data: existing } = await supabase
        .from('chat_members')
        .select('id')
        .eq('chat_id', id)
        .eq('user_id', userId)
        .single();

      if (existing) {
        return res.status(400).json({ error: 'Already subscribed to this channel' });
      }

      // Add subscriber
      await supabase
        .from('chat_members')
        .insert({
          chat_id: id,
          user_id: userId,
          role: 'member'
        });

      // Update subscriber count
      const { count } = await supabase
        .from('chat_members')
        .select('id', { count: 'exact' })
        .eq('chat_id', id);

      await supabase
        .from('channels')
        .update({ subscriber_count: count })
        .eq('id', id);

      // Notify channel
      const io = req.app.get('io');
      if (io) {
        io.to(`chat:${id}`).emit('subscribed', {
          channelId: id,
          userId,
          subscriberCount: count
        });
      }

      return res.status(200).json({ 
        message: 'Subscribed successfully',
        subscriberCount: count
      });
    } catch (error) {
      console.error('Subscribe error:', error);
      return res.status(500).json({ error: 'Failed to subscribe' });
    }
  },

  /**
   * Unsubscribe from channel
   */
  async unsubscribe(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // Check if subscribed
      const { data: membership, error: memberError } = await supabase
        .from('chat_members')
        .select('role')
        .eq('chat_id', id)
        .eq('user_id', userId)
        .single();

      if (memberError || !membership) {
        return res.status(404).json({ error: 'Not subscribed to this channel' });
      }

      // Owner cannot unsubscribe
      if (membership.role === 'owner') {
        return res.status(400).json({ error: 'Channel owner cannot unsubscribe' });
      }

      // Remove subscriber
      await supabase
        .from('chat_members')
        .delete()
        .eq('chat_id', id)
        .eq('user_id', userId);

      // Update subscriber count
      const { count } = await supabase
        .from('chat_members')
        .select('id', { count: 'exact' })
        .eq('chat_id', id);

      await supabase
        .from('channels')
        .update({ subscriber_count: count })
        .eq('id', id);

      // Notify channel
      const io = req.app.get('io');
      if (io) {
        io.to(`chat:${id}`).emit('unsubscribed', {
          channelId: id,
          userId,
          subscriberCount: count
        });
      }

      return res.status(200).json({ 
        message: 'Unsubscribed successfully',
        subscriberCount: count
      });
    } catch (error) {
      console.error('Unsubscribe error:', error);
      return res.status(500).json({ error: 'Failed to unsubscribe' });
    }
  },

  /**
   * Create channel post
   */
  async createPost(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { content, media } = req.body;

      // Check if user is subscribed
      const { data: membership, error: memberError } = await supabase
        .from('chat_members')
        .select('role')
        .eq('chat_id', id)
        .eq('user_id', userId)
        .single();

      if (memberError || !membership) {
        return res.status(403).json({ error: 'Must be subscribed to post' });
      }

      // Create post as message
      const message = await messageService.sendMessage({
        chatId: id,
        senderId: userId,
        content,
        messageType: 'text',
        media
      });

      // Notify subscribers
      const io = req.app.get('io');
      if (io) {
        const members = await chatService.getChatMembers(id, userId);
        if (members) {
          members.forEach(member => {
            if (member.user_id !== userId) {
              io.to(`user:${member.user_id}`).emit('new_post', {
                channelId: id,
                post: message,
                postedBy: userId
              });
            }
          });
        }
      }

      return res.status(201).json({ post: message });
    } catch (error) {
      console.error('Create post error:', error);
      return res.status(500).json({ error: 'Failed to create post' });
    }
  },

  /**
   * Get channel posts
   */
  async getPosts(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      // Check if user is subscribed
      const { data: membership } = await supabase
        .from('chat_members')
        .select('id')
        .eq('chat_id', id)
        .eq('user_id', userId)
        .single();

      if (!membership) {
        return res.status(403).json({ error: 'Must be subscribed to view posts' });
      }

      const { data: posts, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          message_type,
          media_url,
          media_thumbnail,
          file_name,
          file_size,
          created_at,
          updated_at,
          is_pinned,
          sender:sender_id(
            id,
            username,
            display_name,
            avatar_url,
            is_verified,
            is_premium
          ),
          reactions:message_reactions(
            reaction,
            user_id
          ),
          comments:comments(
            id,
            content,
            created_at,
            user:user_id(
              id,
              username,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('chat_id', id)
        .eq('is_deleted', false)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return res.status(200).json({ posts });
    } catch (error) {
      console.error('Get posts error:', error);
      return res.status(500).json({ error: 'Failed to get posts' });
    }
  },

  /**
   * Update channel post
   */
  async updatePost(req, res) {
    try {
      const userId = req.user.id;
      const { id, postId } = req.params;
      const { content } = req.body;

      // Check if user owns the post or is channel admin
      const { data: post, error: postError } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('id', postId)
        .eq('chat_id', id)
        .single();

      if (postError || !post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const { data: membership } = await supabase
        .from('chat_members')
        .select('role')
        .eq('chat_id', id)
        .eq('user_id', userId)
        .single();

      if (post.sender_id !== userId && !['owner', 'admin'].includes(membership?.role)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const updatedPost = await messageService.editMessage(postId, userId, content);
      if (!updatedPost) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Notify subscribers
      const io = req.app.get('io');
      if (io) {
        io.to(`chat:${id}`).emit('post_updated', {
          channelId: id,
          postId,
          content,
          updatedBy: userId
        });
      }

      return res.status(200).json({ post: updatedPost });
    } catch (error) {
      console.error('Update post error:', error);
      return res.status(500).json({ error: 'Failed to update post' });
    }
  },

  /**
   * Delete channel post
   */
  async deletePost(req, res) {
    try {
      const userId = req.user.id;
      const { id, postId } = req.params;

      // Check if user owns the post or is channel admin
      const { data: post, error: postError } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('id', postId)
        .eq('chat_id', id)
        .single();

      if (postError || !post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const { data: membership } = await supabase
        .from('chat_members')
        .select('role')
        .eq('chat_id', id)
        .eq('user_id', userId)
        .single();

      if (post.sender_id !== userId && !['owner', 'admin'].includes(membership?.role)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await messageService.deleteMessage(postId, userId, true);

      // Notify subscribers
      const io = req.app.get('io');
      if (io) {
        io.to(`chat:${id}`).emit('post_deleted', {
          channelId: id,
          postId,
          deletedBy: userId
        });
      }

      return res.status(200).json({ message: 'Post deleted successfully' });
    } catch (error) {
      console.error('Delete post error:', error);
      return res.status(500).json({ error: 'Failed to delete post' });
    }
  },

  /**
   * Pin channel post
   */
  async pinPost(req, res) {
    try {
      const userId = req.user.id;
      const { id, postId } = req.params;

      // Check if user is channel admin
      const { data: membership, error: memberError } = await supabase
        .from('chat_members')
        .select('role')
        .eq('chat_id', id)
        .eq('user_id', userId)
        .single();

      if (memberError || !membership || !['owner', 'admin'].includes(membership.role)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const post = await messageService.pinMessage(postId, userId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Notify subscribers
      const io = req.app.get('io');
      if (io) {
        io.to(`chat:${id}`).emit('post_pinned', {
          channelId: id,
          postId,
          pinnedBy: userId
        });
      }

      return res.status(200).json({ message: 'Post pinned successfully' });
    } catch (error) {
      console.error('Pin post error:', error);
      return res.status(500).json({ error: 'Failed to pin post' });
    }
  },

  /**
   * Verify channel (admin only)
   */
  async verifyChannel(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { data: channel, error } = await supabase
        .from('channels')
        .update({ is_verified: true })
        .eq('id', id)
        .select()
        .single();

      if (error || !channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      // Notify channel
      const io = req.app.get('io');
      if (io) {
        io.to(`chat:${id}`).emit('channel_verified', {
          channelId: id,
          verifiedBy: userId
        });
      }

      return res.status(200).json({ 
        message: 'Channel verified successfully',
        channel
      });
    } catch (error) {
      console.error('Verify channel error:', error);
      return res.status(500).json({ error: 'Failed to verify channel' });
    }
  },

  /**
   * Get channel analytics (admin only)
   */
  async getChannelAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // Check if user is channel admin
      const { data: membership, error: memberError } = await supabase
        .from('chat_members')
        .select('role')
        .eq('chat_id', id)
        .eq('user_id', userId)
        .single();

      if (memberError || !membership || !['owner', 'admin'].includes(membership.role)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Get subscriber count
      const { count: subscriberCount } = await supabase
        .from('chat_members')
        .select('id', { count: 'exact' })
        .eq('chat_id', id);

      // Get total posts
      const { count: totalPosts } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('chat_id', id)
        .eq('is_deleted', false);

      // Get engagement (total reactions)
      const { data: reactions } = await supabase
        .from('message_reactions')
        .select('id')
        .in('message_id', 
          supabase.from('messages').select('id').eq('chat_id', id)
        );

      // Get daily engagement for last 7 days
      const { data: dailyStats } = await supabase
        .from('messages')
        .select('created_at')
        .eq('chat_id', id)
        .eq('is_deleted', false)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const dailyEngagement = {};
      dailyStats?.forEach(msg => {
        const date = new Date(msg.created_at).toISOString().split('T')[0];
        dailyEngagement[date] = (dailyEngagement[date] || 0) + 1;
      });

      const sortedDates = Object.keys(dailyEngagement).sort();
      const chartData = sortedDates.map(date => ({
        date,
        posts: dailyEngagement[date]
      }));

      return res.status(200).json({
        analytics: {
          subscriberCount: subscriberCount || 0,
          totalPosts: totalPosts || 0,
          totalReactions: reactions?.length || 0,
          dailyEngagement: chartData
        }
      });
    } catch (error) {
      console.error('Get channel analytics error:', error);
      return res.status(500).json({ error: 'Failed to get analytics' });
    }
  }
};

module.exports = channelController;
