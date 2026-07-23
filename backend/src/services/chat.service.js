/**
 * Chat Service
 */
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../config/supabase');

const chatService = {
  /**
   * Get user's chats
   */
  async getUserChats(userId, limit = 50, offset = 0) {
    // Get chat memberships
    const { data: memberships, error } = await supabase
      .from('chat_members')
      .select('chat_id, role, last_read_message_id, joined_at')
      .eq('user_id', userId)
      .order('joined_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    if (!memberships || memberships.length === 0) {
      return [];
    }

    const chatIds = memberships.map(m => m.chat_id);

    // Get chat details
    const { data: chats, error: chatError } = await supabase
      .from('chats')
      .select(`
        id,
        type,
        name,
        avatar_url,
        description,
        created_at,
        updated_at,
        is_private,
        pinned:chat_members!inner(is_pinned, pinned_at),
        archived:chat_members!inner(is_archived, archived_at)
      `)
      .in('id', chatIds)
      .eq('chat_members.user_id', userId);

    if (chatError) throw chatError;

    // Get last message for each chat
    const chatsWithMessages = await Promise.all(chats.map(async (chat) => {
      const { data: lastMessage } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          message_type,
          created_at,
          sender:sender_id(id, username, display_name)
        `)
        .eq('chat_id', chat.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Get unread count
      const membership = memberships.find(m => m.chat_id === chat.id);
      const { count: unreadCount } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('chat_id', chat.id)
        .eq('is_deleted', false)
        .neq('sender_id', userId)
        .gt('created_at', membership?.last_read_at || new Date(0).toISOString());

      return {
        ...chat,
        lastMessage: lastMessage || null,
        unreadCount: unreadCount || 0,
        role: membership?.role || 'member'
      };
    }));

    // Sort by pinned first, then by last message time
    return chatsWithMessages.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      const aTime = a.lastMessage?.created_at || a.created_at;
      const bTime = b.lastMessage?.created_at || b.created_at;
      return new Date(bTime) - new Date(aTime);
    });
  },

  /**
   * Create private chat
   */
  async createPrivateChat(userId, otherUserId) {
    // Check if chat already exists
    const { data: existing } = await supabase
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', userId)
      .in('chat_id', (await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', otherUserId)
      ).data?.map(m => m.chat_id) || []);

    if (existing && existing.length > 0) {
      // Return existing chat
      const { data: chat } = await supabase
        .from('chats')
        .select('*')
        .eq('id', existing[0].chat_id)
        .single();
      return chat;
    }

    // Create new chat
    const chatId = uuidv4();
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({
        id: chatId,
        type: 'private',
        created_by: userId
      })
      .select()
      .single();

    if (chatError) throw chatError;

    // Add members
    await supabase
      .from('chat_members')
      .insert([
        { chat_id: chatId, user_id: userId, role: 'member' },
        { chat_id: chatId, user_id: otherUserId, role: 'member' }
      ]);

    return chat;
  },

  /**
   * Create group
   */
  async createGroup(userId, name, participants = [], avatar_url = null, description = null) {
    const chatId = uuidv4();

    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({
        id: chatId,
        type: 'group',
        name,
        avatar_url,
        description,
        created_by: userId
      })
      .select()
      .single();

    if (chatError) throw chatError;

    // Add owner
    await supabase
      .from('chat_members')
      .insert({
        chat_id: chatId,
        user_id: userId,
        role: 'owner'
      });

    // Add participants
    if (participants.length > 0) {
      const members = participants.map(p => ({
        chat_id: chatId,
        user_id: p,
        role: 'member'
      }));
      await supabase.from('chat_members').insert(members);
    }

    // Create group settings
    await supabase
      .from('groups')
      .insert({
        id: chatId,
        join_type: 'invite_only'
      });

    return chat;
  },

  /**
   * Create channel
   */
  async createChannel(userId, name, participants = [], avatar_url = null, description = null) {
    const chatId = uuidv4();

    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({
        id: chatId,
        type: 'channel',
        name,
        avatar_url,
        description,
        created_by: userId
      })
      .select()
      .single();

    if (chatError) throw chatError;

    // Add owner
    await supabase
      .from('chat_members')
      .insert({
        chat_id: chatId,
        user_id: userId,
        role: 'owner'
      });

    // Add participants
    if (participants.length > 0) {
      const members = participants.map(p => ({
        chat_id: chatId,
        user_id: p,
        role: 'member'
      }));
      await supabase.from('chat_members').insert(members);
    }

    // Create channel settings
    await supabase
      .from('channels')
      .insert({
        id: chatId,
        category: 'general',
        subscriber_count: 0
      });

    return chat;
  },

  /**
   * Get chat details
   */
  async getChatDetails(chatId, userId) {
    // Check membership
    const { data: membership, error: memberError } = await supabase
      .from('chat_members')
      .select('role')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership) {
      return null;
    }

    const { data: chat, error } = await supabase
      .from('chats')
      .select(`
        *,
        members:chat_members(
          user_id,
          role,
          joined_at,
          user:users(id, username, display_name, avatar_url, online_status)
        )
      `)
      .eq('id', chatId)
      .single();

    if (error) throw error;

    // Get additional group/channel data
    if (chat.type === 'group') {
      const { data: group } = await supabase
        .from('groups')
        .select('*')
        .eq('id', chatId)
        .single();
      chat.groupData = group;
    }

    if (chat.type === 'channel') {
      const { data: channel } = await supabase
        .from('channels')
        .select('*')
        .eq('id', chatId)
        .single();
      chat.channelData = channel;
    }

    chat.userRole = membership.role;
    return chat;
  },

  /**
   * Update chat
   */
  async updateChat(chatId, userId, updates) {
    // Check if user is owner or admin
    const { data: membership, error: memberError } = await supabase
      .from('chat_members')
      .select('role')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership || !['owner', 'admin'].includes(membership.role)) {
      return null;
    }

    const { data: chat, error } = await supabase
      .from('chats')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', chatId)
      .select()
      .single();

    if (error) throw error;
    return chat;
  },

  /**
   * Delete chat
   */
  async deleteChat(chatId, userId) {
    // Check if user is owner
    const { data: membership, error: memberError } = await supabase
      .from('chat_members')
      .select('role')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership || membership.role !== 'owner') {
      return null;
    }

    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId);

    if (error) throw error;
    return true;
  },

  /**
   * Pin chat
   */
  async pinChat(chatId, userId) {
    const { data, error } = await supabase
      .from('chat_members')
      .update({
        is_pinned: true,
        pinned_at: new Date().toISOString()
      })
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Unpin chat
   */
  async unpinChat(chatId, userId) {
    const { data, error } = await supabase
      .from('chat_members')
      .update({
        is_pinned: false,
        pinned_at: null
      })
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Archive chat
   */
  async archiveChat(chatId, userId) {
    const { data, error } = await supabase
      .from('chat_members')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString()
      })
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Unarchive chat
   */
  async unarchiveChat(chatId, userId) {
    const { data, error } = await supabase
      .from('chat_members')
      .update({
        is_archived: false,
        archived_at: null
      })
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get chat members
   */
  async getChatMembers(chatId, userId) {
    // Check membership
    const { data: membership, error: memberError } = await supabase
      .from('chat_members')
      .select('role')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership) {
      return null;
    }

    const { data: members, error } = await supabase
      .from('chat_members')
      .select(`
        user_id,
        role,
        joined_at,
        user:users(id, username, display_name, avatar_url, online_status, last_seen)
      `)
      .eq('chat_id', chatId)
      .order('role', { ascending: true });

    if (error) throw error;
    return members;
  },

  /**
   * Add member to chat
   */
  async addMember(chatId, userId, memberId, role = 'member') {
    // Check if user has permission
    const { data: membership, error: memberError } = await supabase
      .from('chat_members')
      .select('role')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership || !['owner', 'admin'].includes(membership.role)) {
      return null;
    }

    // Check if member already exists
    const { data: existing } = await supabase
      .from('chat_members')
      .select('id')
      .eq('chat_id', chatId)
      .eq('user_id', memberId)
      .single();

    if (existing) {
      return true; // Already a member
    }

    // Add member
    const { error } = await supabase
      .from('chat_members')
      .insert({
        chat_id: chatId,
        user_id: memberId,
        role
      });

    if (error) throw error;
    return true;
  },

  /**
   * Remove member from chat
   */
  async removeMember(chatId, userId, memberId) {
    // Check if user has permission
    const { data: membership, error: memberError } = await supabase
      .from('chat_members')
      .select('role')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership || !['owner', 'admin'].includes(membership.role)) {
      return null;
    }

    // Cannot remove owner
    const { data: targetMember } = await supabase
      .from('chat_members')
      .select('role')
      .eq('chat_id', chatId)
      .eq('user_id', memberId)
      .single();

    if (targetMember?.role === 'owner') {
      return null;
    }

    const { error } = await supabase
      .from('chat_members')
      .delete()
      .eq('chat_id', chatId)
      .eq('user_id', memberId);

    if (error) throw error;
    return true;
  },

  /**
   * Update member role
   */
  async updateMemberRole(chatId, userId, memberId, role) {
    // Check if user is owner
    const { data: membership, error: memberError } = await supabase
      .from('chat_members')
      .select('role')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership || membership.role !== 'owner') {
      return null;
    }

    // Cannot change owner role
    const { data: targetMember } = await supabase
      .from('chat_members')
      .select('role')
      .eq('chat_id', chatId)
      .eq('user_id', memberId)
      .single();

    if (targetMember?.role === 'owner') {
      return null;
    }

    const { data, error } = await supabase
      .from('chat_members')
      .update({ role })
      .eq('chat_id', chatId)
      .eq('user_id', memberId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

module.exports = chatService;
