/**
 * Call Controller
 */
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../config/supabase');
const notificationService = require('../services/notification.service');

const callController = {
  /**
   * Initiate call
   */
  async initiateCall(req, res) {
    try {
      const userId = req.user.id;
      const { calleeId, type = 'voice' } = req.body;

      if (!calleeId) {
        return res.status(400).json({ error: 'Callee ID is required' });
      }

      if (userId === calleeId) {
        return res.status(400).json({ error: 'Cannot call yourself' });
      }

      // Check if user is online
      const { data: callee, error: calleeError } = await supabase
        .from('users')
        .select('id, online_status')
        .eq('id', calleeId)
        .single();

      if (calleeError || !callee) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (!callee.online_status) {
        return res.status(400).json({ error: 'User is offline' });
      }

      // Create call record
      const callId = uuidv4();
      const { data: call, error: callError } = await supabase
        .from('calls')
        .insert({
          id: callId,
          caller_id: userId,
          callee_id: calleeId,
          type,
          status: 'initiated',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (callError) throw callError;

      // Notify callee
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${calleeId}`).emit('call_initiated', {
          callId,
          callerId: userId,
          callerName: req.user.display_name,
          type
        });
      }

      // Create notification
      await notificationService.createCallNotification(
        calleeId,
        userId,
        'incoming',
        type,
        callId
      );

      return res.status(201).json({
        callId,
        status: 'initiated',
        calleeId
      });
    } catch (error) {
      console.error('Initiate call error:', error);
      return res.status(500).json({ error: 'Failed to initiate call' });
    }
  },

  /**
   * Answer call
   */
  async answerCall(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // Check if call exists and user is callee
      const { data: call, error: callError } = await supabase
        .from('calls')
        .select('*')
        .eq('id', id)
        .eq('callee_id', userId)
        .single();

      if (callError || !call) {
        return res.status(404).json({ error: 'Call not found' });
      }

      if (call.status !== 'initiated' && call.status !== 'ringing') {
        return res.status(400).json({ error: 'Call is no longer active' });
      }

      // Update call status
      await supabase
        .from('calls')
        .update({
          status: 'ongoing',
          answered_at: new Date().toISOString()
        })
        .eq('id', id);

      // Notify caller
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${call.caller_id}`).emit('call_answered', {
          callId: id,
          calleeId: userId,
          calleeName: req.user.display_name
        });
      }

      return res.status(200).json({
        callId: id,
        status: 'ongoing',
        callerId: call.caller_id
      });
    } catch (error) {
      console.error('Answer call error:', error);
      return res.status(500).json({ error: 'Failed to answer call' });
    }
  },

  /**
   * Reject call
   */
  async rejectCall(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // Check if call exists
      const { data: call, error: callError } = await supabase
        .from('calls')
        .select('*')
        .eq('id', id)
        .single();

      if (callError || !call) {
        return res.status(404).json({ error: 'Call not found' });
      }

      // Update call status
      await supabase
        .from('calls')
        .update({
          status: 'missed',
          ended_at: new Date().toISOString()
        })
        .eq('id', id);

      // Notify caller
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${call.caller_id}`).emit('call_rejected', {
          callId: id,
          calleeId: userId,
          reason: 'rejected'
        });
      }

      return res.status(200).json({ message: 'Call rejected' });
    } catch (error) {
      console.error('Reject call error:', error);
      return res.status(500).json({ error: 'Failed to reject call' });
    }
  },

  /**
   * End call
   */
  async endCall(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // Check if call exists
      const { data: call, error: callError } = await supabase
        .from('calls')
        .select('*')
        .eq('id', id)
        .single();

      if (callError || !call) {
        return res.status(404).json({ error: 'Call not found' });
      }

      // Calculate duration
      const endedAt = new Date();
      const startedAt = new Date(call.started_at);
      const duration = Math.floor((endedAt - startedAt) / 1000);

      // Update call
      await supabase
        .from('calls')
        .update({
          status: 'ended',
          ended_at: endedAt.toISOString(),
          duration_seconds: duration
        })
        .eq('id', id);

      // Notify other party
      const io = req.app.get('io');
      if (io) {
        const otherParty = userId === call.caller_id ? call.callee_id : call.caller_id;
        io.to(`user:${otherParty}`).emit('call_ended', {
          callId: id,
          endedBy: userId,
          duration
        });
      }

      return res.status(200).json({
        callId: id,
        status: 'ended',
        duration
      });
    } catch (error) {
      console.error('End call error:', error);
      return res.status(500).json({ error: 'Failed to end call' });
    }
  },

  /**
   * Mute call
   */
  async muteCall(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // Check if call exists
      const { data: call, error: callError } = await supabase
        .from('calls')
        .select('*')
        .eq('id', id)
        .single();

      if (callError || !call) {
        return res.status(404).json({ error: 'Call not found' });
      }

      // Store mute state in Redis or memory
      // For now, just acknowledge
      const io = req.app.get('io');
      if (io) {
        const otherParty = userId === call.caller_id ? call.callee_id : call.caller_id;
        io.to(`user:${otherParty}`).emit('call_mute', {
          callId: id,
          userId,
          muted: true
        });
      }

      return res.status(200).json({ message: 'Call muted' });
    } catch (error) {
      console.error('Mute call error:', error);
      return res.status(500).json({ error: 'Failed to mute call' });
    }
  },

  /**
   * Unmute call
   */
  async unmuteCall(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // Check if call exists
      const { data: call, error: callError } = await supabase
        .from('calls')
        .select('*')
        .eq('id', id)
        .single();

      if (callError || !call) {
        return res.status(404).json({ error: 'Call not found' });
      }

      const io = req.app.get('io');
      if (io) {
        const otherParty = userId === call.caller_id ? call.callee_id : call.caller_id;
        io.to(`user:${otherParty}`).emit('call_mute', {
          callId: id,
          userId,
          muted: false
        });
      }

      return res.status(200).json({ message: 'Call unmuted' });
    } catch (error) {
      console.error('Unmute call error:', error);
      return res.status(500).json({ error: 'Failed to unmute call' });
    }
  },

  /**
   * Video on/off
   */
  async toggleVideo(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { enabled } = req.body;

      // Check if call exists
      const { data: call, error: callError } = await supabase
        .from('calls')
        .select('*')
        .eq('id', id)
        .single();

      if (callError || !call) {
        return res.status(404).json({ error: 'Call not found' });
      }

      const io = req.app.get('io');
      if (io) {
        const otherParty = userId === call.caller_id ? call.callee_id : call.caller_id;
        io.to(`user:${otherParty}`).emit('call_video', {
          callId: id,
          userId,
          enabled
        });
      }

      return res.status(200).json({ 
        message: `Video ${enabled ? 'enabled' : 'disabled'}` 
      });
    } catch (error) {
      console.error('Toggle video error:', error);
      return res.status(500).json({ error: 'Failed to toggle video' });
    }
  },

  /**
   * Get call history
   */
  async getCallHistory(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 50, offset = 0 } = req.query;

      const { data: calls, error } = await supabase
        .from('calls')
        .select(`
          *,
          caller:caller_id(id, username, display_name, avatar_url),
          callee:callee_id(id, username, display_name, avatar_url)
        `)
        .or(`caller_id.eq.${userId},callee_id.eq.${userId}`)
        .order('started_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Format calls with direction
      const formattedCalls = calls.map(call => ({
        ...call,
        direction: call.caller_id === userId ? 'outgoing' : 'incoming',
        participant: call.caller_id === userId ? call.callee : call.caller
      }));

      return res.status(200).json({ calls: formattedCalls });
    } catch (error) {
      console.error('Get call history error:', error);
      return res.status(500).json({ error: 'Failed to get call history' });
    }
  },

  /**
   * Get call details
   */
  async getCallDetails(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const { data: call, error } = await supabase
        .from('calls')
        .select(`
          *,
          caller:caller_id(id, username, display_name, avatar_url),
          callee:callee_id(id, username, display_name, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (error || !call) {
        return res.status(404).json({ error: 'Call not found' });
      }

      // Check if user is part of the call
      if (call.caller_id !== userId && call.callee_id !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      return res.status(200).json({ call });
    } catch (error) {
      console.error('Get call details error:', error);
      return res.status(500).json({ error: 'Failed to get call details' });
    }
  }
};

module.exports = callController;
