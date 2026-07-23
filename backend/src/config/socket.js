/**
 * Socket.IO Configuration
 */
const jwt = require('jsonwebtoken');
const config = require('./index');
const { supabase } = require('./supabase');
const chatSocket = require('../sockets/chat.socket');
const callSocket = require('../sockets/call.socket');
const presenceSocket = require('../sockets/presence.socket');

function setupSocket(io) {
  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      socket.userId = decoded.id;
      socket.user = decoded;
      next();
    } catch (error) {
      return next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', async (socket) => {
    const userId = socket.userId;
    
    console.log(`🔌 User ${userId} connected`);

    // Store socket reference
    await supabase
      .from('sessions')
      .update({ socket_id: socket.id })
      .eq('user_id', userId)
      .eq('is_active', true);

    // Join user's room
    socket.join(`user:${userId}`);

    // Set up socket handlers
    chatSocket(io, socket);
    callSocket(io, socket);
    presenceSocket(io, socket);

    // Disconnect handler
    socket.on('disconnect', async () => {
      console.log(`🔌 User ${userId} disconnected`);
      
      // Update online status
      await supabase
        .from('users')
        .update({ 
          online_status: false,
          last_seen: new Date().toISOString()
        })
        .eq('id', userId);

      // Broadcast offline status
      socket.broadcast.emit('user_offline', { userId });

      // Clear socket reference
      await supabase
        .from('sessions')
        .update({ socket_id: null })
        .eq('user_id', userId)
        .eq('is_active', true);
    });

    // Heartbeat
    socket.on('ping', () => {
      socket.emit('pong');
    });
  });

  return io;
}

module.exports = { setupSocket };
