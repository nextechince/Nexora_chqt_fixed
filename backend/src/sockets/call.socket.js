/**
 * Call Socket Handler
 */
const { supabase } = require('../config/supabase');
const notificationService = require('../services/notification.service');

function callSocket(io, socket) {
  const userId = socket.userId;

  // Initiate call
  socket.on('call_initiated', async (data) => {
    try {
      const { userId: calleeId, type = 'voice' } = data;

      // Check if callee is online
      const { data: callee } = await supabase
        .from('users')
        .select('online_status')
        .eq('id', calleeId)
        .single();

      if (!callee || !callee.online_status) {
        socket.emit('call_error', { message: 'User is offline' });
        return;
      }

      // Create call record
      const { data: call, error } = await supabase
        .from('calls')
        .insert({
          caller_id: userId,
          callee_id: calleeId,
          type,
          status: 'initiated',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Notify callee
      io.to(`user:${calleeId}`).emit('call_initiated', {
        callId: call.id,
        callerId: userId,
        type,
        callerName: socket.user?.display_name || 'User'
      });

      // Create notification
      await notificationService.createCallNotification(
        calleeId,
        userId,
        'incoming',
        type,
        call.id
      );

      // Join call room
      socket.join(`call:${call.id}`);

      // Emit to caller
      socket.emit('call_initiated_ack', {
        callId: call.id,
        calleeId
      });

    } catch (error) {
      console.error('Call initiate error:', error);
      socket.emit('call_error', { message: 'Failed to initiate call' });
    }
  });

  // Answer call
  socket.on('call_answered', async (data) => {
    try {
      const { callId } = data;

      const { data: call, error } = await supabase
        .from('calls')
        .update({
          status: 'ongoing',
          answered_at: new Date().toISOString()
        })
        .eq('id', callId)
        .select()
        .single();

      if (error || !call) {
        socket.emit('call_error', { message: 'Call not found' });
        return;
      }

      // Join call room
      socket.join(`call:${callId}`);

      // Notify caller
      io.to(`user:${call.caller_id}`).emit('call_answered', {
        callId,
        calleeId: userId,
        calleeName: socket.user?.display_name || 'User'
      });

      // Notify callee
      socket.emit('call_answered_ack', {
        callId,
        callerId: call.caller_id
      });

    } catch (error) {
      console.error('Call answer error:', error);
      socket.emit('call_error', { message: 'Failed to answer call' });
    }
  });

  // Reject call
  socket.on('call_rejected', async (data) => {
    try {
      const { callId } = data;

      const { data: call, error } = await supabase
        .from('calls')
        .update({
          status: 'missed',
          ended_at: new Date().toISOString()
        })
        .eq('id', callId)
        .select()
        .single();

      if (error || !call) {
        socket.emit('call_error', { message: 'Call not found' });
        return;
      }

      // Notify caller
      io.to(`user:${call.caller_id}`).emit('call_rejected', {
        callId,
        calleeId: userId
      });

    } catch (error) {
      console.error('Call reject error:', error);
      socket.emit('call_error', { message: 'Failed to reject call' });
    }
  });

  // End call
  socket.on('call_ended', async (data) => {
    try {
      const { callId } = data;

      const { data: call, error } = await supabase
        .from('calls')
        .select('caller_id, callee_id, started_at')
        .eq('id', callId)
        .single();

      if (error || !call) {
        socket.emit('call_error', { message: 'Call not found' });
        return;
      }

      // Calculate duration
      const endedAt = new Date();
      const startedAt = new Date(call.started_at);
      const duration = Math.floor((endedAt - startedAt) / 1000);

      await supabase
        .from('calls')
        .update({
          status: 'ended',
          ended_at: endedAt.toISOString(),
          duration_seconds: duration
        })
        .eq('id', callId);

      // Notify participants
      io.to(`call:${callId}`).emit('call_ended', {
        callId,
        endedBy: userId,
        duration
      });

      // Leave call room
      io.socketsLeave(`call:${callId}`);

    } catch (error) {
      console.error('Call end error:', error);
      socket.emit('call_error', { message: 'Failed to end call' });
    }
  });

  // Mute call
  socket.on('call_mute', async (data) => {
    try {
      const { callId, muted } = data;

      // Get call participants
      const { data: call } = await supabase
        .from('calls')
        .select('caller_id, callee_id')
        .eq('id', callId)
        .single();

      if (!call) {
        socket.emit('call_error', { message: 'Call not found' });
        return;
      }

      const otherParty = userId === call.caller_id ? call.callee_id : call.caller_id;

      // Notify other party
      io.to(`user:${otherParty}`).emit('call_mute', {
        callId,
        userId,
        muted
      });

    } catch (error) {
      console.error('Call mute error:', error);
      socket.emit('call_error', { message: 'Failed to mute call' });
    }
  });

  // Video toggle
  socket.on('call_video', async (data) => {
    try {
      const { callId, enabled } = data;

      const { data: call } = await supabase
        .from('calls')
        .select('caller_id, callee_id')
        .eq('id', callId)
        .single();

      if (!call) {
        socket.emit('call_error', { message: 'Call not found' });
        return;
      }

      const otherParty = userId === call.caller_id ? call.callee_id : call.caller_id;

      io.to(`user:${otherParty}`).emit('call_video', {
        callId,
        userId,
        enabled
      });

    } catch (error) {
      console.error('Call video error:', error);
      socket.emit('call_error', { message: 'Failed to toggle video' });
    }
  });

  // Screen sharing
  socket.on('call_screen_share', async (data) => {
    try {
      const { callId, enabled } = data;

      const { data: call } = await supabase
        .from('calls')
        .select('caller_id, callee_id')
        .eq('id', callId)
        .single();

      if (!call) {
        socket.emit('call_error', { message: 'Call not found' });
        return;
      }

      const otherParty = userId === call.caller_id ? call.callee_id : call.caller_id;

      io.to(`user:${otherParty}`).emit('call_screen_share', {
        callId,
        userId,
        enabled
      });

    } catch (error) {
      console.error('Screen share error:', error);
      socket.emit('call_error', { message: 'Failed to share screen' });
    }
  });

  // WebRTC signaling
  socket.on('call_signal', async (data) => {
    try {
      const { callId, type, data: signalData } = data;

      // Get call participants
      const { data: call } = await supabase
        .from('calls')
        .select('caller_id, callee_id')
        .eq('id', callId)
        .single();

      if (!call) {
        socket.emit('call_error', { message: 'Call not found' });
        return;
      }

      const otherParty = userId === call.caller_id ? call.callee_id : call.caller_id;

      // Forward signal to other party
      io.to(`user:${otherParty}`).emit('call_signal', {
        callId,
        type,
        data: signalData,
        userId
      });

    } catch (error) {
      console.error('Signal error:', error);
      socket.emit('call_error', { message: 'Failed to send signal' });
    }
  });

  // Call error
  socket.on('call_error', (data) => {
    const { callId, message } = data;
    io.to(`call:${callId}`).emit('call_error', {
      callId,
      userId,
      message
    });
  });
}

module.exports = callSocket;
