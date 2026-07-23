/**
 * Presence Socket Handler
 */
const { supabase } = require('../config/supabase');

function presenceSocket(io, socket) {
  const userId = socket.userId;

  // User online
  socket.on('presence:online', async () => {
    try {
      await supabase
        .from('users')
        .update({
          online_status: true,
          last_seen: new Date().toISOString()
        })
        .eq('id', userId);

      // Broadcast to all connected users
      socket.broadcast.emit('user_online', {
        userId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Presence online error:', error);
    }
  });

  // User offline (handled in disconnect)
  // But also allow manual offline
  socket.on('presence:offline', async () => {
    try {
      await supabase
        .from('users')
        .update({
          online_status: false,
          last_seen: new Date().toISOString()
        })
        .eq('id', userId);

      socket.broadcast.emit('user_offline', {
        userId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Presence offline error:', error);
    }
  });

  // Update status
  socket.on('presence:status', async (data) => {
    try {
      const { status } = data;

      await supabase
        .from('users')
        .update({
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      // Broadcast status change
      socket.broadcast.emit('user_status', {
        userId,
        status,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Presence status error:', error);
    }
  });

  // Get online users
  socket.on('presence:get_online', async () => {
    try {
      const { data: users } = await supabase
        .from('users')
        .select('id, username, display_name, online_status, last_seen')
        .eq('online_status', true)
        .neq('id', userId);

      socket.emit('presence:online_users', {
        users: users || []
      });

    } catch (error) {
      console.error('Get online users error:', error);
    }
  });

  // Get user presence
  socket.on('presence:get_user', async (data) => {
    try {
      const { userId: targetUserId } = data;

      const { data: user } = await supabase
        .from('users')
        .select('id, online_status, last_seen, status')
        .eq('id', targetUserId)
        .single();

      if (user) {
        socket.emit('presence:user_data', {
          userId: targetUserId,
          online_status: user.online_status,
          last_seen: user.last_seen,
          status: user.status
        });
      }

    } catch (error) {
      console.error('Get user presence error:', error);
    }
  });

  // Heartbeat to maintain presence
  socket.on('presence:heartbeat', async () => {
    try {
      await supabase
        .from('users')
        .update({
          last_seen: new Date().toISOString()
        })
        .eq('id', userId);

    } catch (error) {
      console.error('Heartbeat error:', error);
    }
  });
}

module.exports = presenceSocket;
