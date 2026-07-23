/**
 * Socket.IO Client
 * Real-time communication
 */
class SocketClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.handlers = new Map();
    this.eventQueue = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
  }

  /**
   * Connect to socket server
   */
  connect(token) {
    if (this.socket && this.connected) return;

    const socketUrl = process.env.SOCKET_URL || window.location.origin;

    // Dynamically import socket.io-client
    import('https://cdn.socket.io/4.6.2/socket.io.esm.min.js').then((module) => {
      const io = module.io || module.default;
      
      this.socket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 5000,
      });

      this.setupListeners();
    }).catch((error) => {
      console.error('Failed to load Socket.IO:', error);
    });
  }

  /**
   * Setup socket event listeners
   */
  setupListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.connected = true;
      this.reconnectAttempts = 0;
      console.log('Socket connected');
      
      // Process queued events
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift();
        this.socket.emit(event.name, event.data);
      }
      
      this.emit('presence:online');
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      console.log('Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      this.reconnectAttempts = attempt;
      console.log(`Reconnect attempt ${attempt}`);
    });

    // Handle all events through the event system
    this.socket.onAny((event, ...args) => {
      this.handleEvent(event, ...args);
    });
  }

  /**
   * Handle incoming events
   */
  handleEvent(event, ...args) {
    // Special events
    switch (event) {
      case 'new_notification':
        this.emitNotification('notification', args[0]);
        break;
      case 'user_online':
        this.emitPresence('online', args[0]);
        break;
      case 'user_offline':
        this.emitPresence('offline', args[0]);
        break;
      case 'new_message':
        this.emitMessage('new', args[0]);
        break;
      case 'message_updated':
        this.emitMessage('updated', args[0]);
        break;
      case 'message_deleted':
        this.emitMessage('deleted', args[0]);
        break;
      case 'typing_start':
        this.emitTyping('start', args[0]);
        break;
      case 'typing_stop':
        this.emitTyping('stop', args[0]);
        break;
      default:
        this.emitGeneric(event, args[0]);
    }
  }

  /**
   * Emit an event
   */
  emit(event, data = {}) {
    if (!this.connected || !this.socket) {
      this.eventQueue.push({ name: event, data });
      return;
    }
    this.socket.emit(event, data);
  }

  /**
   * Subscribe to an event
   */
  on(event, callback) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event).add(callback);
    
    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(event, callback) {
    if (this.handlers.has(event)) {
      this.handlers.get(event).delete(callback);
    }
  }

  /**
   * Emit a generic event to handlers
   */
  emitGeneric(event, data) {
    if (this.handlers.has(event)) {
      this.handlers.get(event).forEach(callback => callback(data));
    }
  }

  /**
   * Emit message events
   */
  emitMessage(type, data) {
    const event = `message:${type}`;
    this.emitGeneric(event, data);
  }

  /**
   * Emit presence events
   */
  emitPresence(status, data) {
    this.emitGeneric(`presence:${status}`, data);
  }

  /**
   * Emit typing events
   */
  emitTyping(action, data) {
    this.emitGeneric(`typing:${action}`, data);
  }

  /**
   * Emit notification events
   */
  emitNotification(type, data) {
    this.emitGeneric(`notification:${type}`, data);
  }

  /**
   * Chat events
   */
  sendMessage(chatId, message) {
    this.emit('send_message', { chatId, message });
  }

  editMessage(messageId, content) {
    this.emit('edit_message', { messageId, content });
  }

  deleteMessage(messageId, forEveryone = true) {
    this.emit('delete_message', { messageId, forEveryone });
  }

  startTyping(chatId) {
    this.emit('typing_start', { chatId });
  }

  stopTyping(chatId) {
    this.emit('typing_stop', { chatId });
  }

  markAsRead(chatId, messageId) {
    this.emit('message_read', { chatId, messageId });
  }

  markAsDelivered(chatId, messageId) {
    this.emit('message_delivered', { chatId, messageId });
  }

  addReaction(messageId, emoji) {
    this.emit('message_reaction', { messageId, emoji, action: 'add' });
  }

  removeReaction(messageId, emoji) {
    this.emit('message_reaction', { messageId, emoji, action: 'remove' });
  }

  /**
   * Call events
   */
  initiateCall(userId, type = 'voice') {
    this.emit('call_initiated', { userId, type });
  }

  answerCall(callId) {
    this.emit('call_answered', { callId });
  }

  rejectCall(callId) {
    this.emit('call_rejected', { callId });
  }

  endCall(callId) {
    this.emit('call_ended', { callId });
  }

  /**
   * Disconnect
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
      this.socket = null;
    }
    this.handlers.clear();
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected && this.socket && this.socket.connected;
  }
}

// Export singleton
export const Socket = new SocketClient();
export default Socket;
