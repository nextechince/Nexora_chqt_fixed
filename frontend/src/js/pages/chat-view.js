/**
 * Chat View Page
 * Messages, typing indicator, seen status, reactions
 */
import { Store } from '../store.js';
import { Auth } from '../utils/auth.js';
import { Router } from '../router.js';
import { Socket } from '../utils/socket.js';
import { Toast } from '../utils/toast.js';
import API from '../utils/api.js';

export function ChatView(params, query) {
  const chatId = params.id;
  const chat = Store.get('chats')?.find(c => c.id === chatId) || { name: 'Chat' };
  
  return `
    <div class="chat-view" data-chat-id="${chatId}">
      <!-- Chat Header -->
      <div class="chat-header glass">
        <button class="btn btn-icon" onclick="window.history.back()">
          ←
        </button>
        <div class="chat-header-info" onclick="window.dispatchEvent(new CustomEvent('navigate', {detail: {page: 'profile', params: {id: '${chatId}'}}}))">
          <div class="chat-header-avatar">
            ${chat.avatar_url ? `<img src="${chat.avatar_url}" alt="${chat.name}" />` :
              `<span>${(chat.name || 'C')[0].toUpperCase()}</span>`}
            <span class="online-indicator" id="chatOnlineStatus"></span>
          </div>
          <div class="chat-header-details">
            <span class="chat-header-name">${chat.name || 'Unknown'}</span>
            <span class="chat-header-status" id="chatStatus">Online</span>
          </div>
        </div>
        <div class="chat-header-actions">
          <button class="btn btn-icon" onclick="startCall('${chatId}', 'voice')" title="Voice Call">
            📞
          </button>
          <button class="btn btn-icon" onclick="startCall('${chatId}', 'video')" title="Video Call">
            📹
          </button>
          <button class="btn btn-icon" id="chatMenuBtn" title="More options">
            ⋮
          </button>
        </div>
      </div>

      <!-- Messages -->
      <div class="messages-container" id="messagesContainer">
        <div class="messages-list" id="messagesList">
          <!-- Messages will be rendered here -->
        </div>
        <div class="typing-indicator" id="typingIndicator" style="display: none;">
          <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span class="typing-text">typing...</span>
        </div>
      </div>

      <!-- Message Input -->
      <div class="message-input-container glass">
        <div class="message-input-tools">
          <button class="btn btn-icon btn-sm" id="emojiBtn" title="Emoji">
            😊
          </button>
          <button class="btn btn-icon btn-sm" id="attachBtn" title="Attach">
            📎
          </button>
          <button class="btn btn-icon btn-sm" id="voiceBtn" title="Voice">
            🎤
          </button>
        </div>
        <div class="message-input-wrapper">
          <textarea 
            id="messageInput" 
            rows="1" 
            placeholder="Type a message..."
            aria-label="Type a message"
          ></textarea>
          <button class="btn btn-primary btn-icon" id="sendBtn" title="Send">
            ➤
          </button>
        </div>
      </div>
    </div>
  `;
}

export function initChatView() {
  const chatId = document.querySelector('.chat-view')?.dataset.chatId;
  if (!chatId) return;

  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const messagesList = document.getElementById('messagesList');
  const typingIndicator = document.getElementById('typingIndicator');
  const statusElement = document.getElementById('chatStatus');
  const onlineStatus = document.getElementById('chatOnlineStatus');

  let currentMessages = [];
  let isTyping = false;
  let typingTimeout = null;

  // Load messages
  loadMessages(chatId);

  // Setup auto-resize textarea
  messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    
    // Send typing indicator
    if (!isTyping) {
      isTyping = true;
      Socket.startTyping(chatId);
    }
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      isTyping = false;
      Socket.stopTyping(chatId);
    }, 1000);
  });

  // Send message
  sendBtn.addEventListener('click', () => sendMessage(chatId));
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(chatId);
    }
  });

  // Scroll to bottom
  function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    container.scrollTop = container.scrollHeight;
  }

  // Send message function
  async function sendMessage(chatId) {
    const content = messageInput.value.trim();
    if (!content) return;

    messageInput.value = '';
    messageInput.style.height = 'auto';
    messageInput.focus();

    try {
      const message = await API.post(`/chats/${chatId}/messages`, { content });
      
      // Add to messages list
      appendMessage(message, 'sent');
      scrollToBottom();
      
      // Emit via socket
      Socket.sendMessage(chatId, message);
      
      // Mark as read
      Socket.markAsRead(chatId, message.id);
      
    } catch (error) {
      Toast.error('Failed to send message');
      console.error(error);
    }
  }

  // Load messages
  async function loadMessages(chatId) {
    try {
      const messages = await API.get(`/chats/${chatId}/messages`);
      currentMessages = messages;
      
      // Render messages
      messagesList.innerHTML = messages.map(msg => renderMessage(msg)).join('');
      
      // Mark all as read
      const unreadMessages = messages.filter(m => m.sender_id !== Auth.getCurrentUser()?.id && m.status !== 'read');
      if (unreadMessages.length > 0) {
        Socket.markAsRead(chatId, unreadMessages[unreadMessages.length - 1].id);
      }
      
      scrollToBottom();
      
      // Start listening for new messages
      setupMessageListeners(chatId);
      setupTypingListeners(chatId);
      
    } catch (error) {
      console.error('Failed to load messages:', error);
      messagesList.innerHTML = `
        <div class="error-container">
          <p>Failed to load messages</p>
          <button class="btn btn-primary" onclick="loadMessages('${chatId}')">Retry</button>
        </div>
      `;
    }
  }

  // Render message
  function renderMessage(message) {
    const isMine = message.sender_id === Auth.getCurrentUser()?.id;
    const status = message.status || 'sent';
    const statusIcon = {
      'sent': '✓',
      'delivered': '✓✓',
      'read': '✓✓✓'
    }[status] || '✓';
    
    const reactions = message.reactions || [];
    const replyTo = message.reply_to;
    
    return `
      <div class="message ${isMine ? 'sent' : 'received'}" data-message-id="${message.id}">
        ${replyTo ? `
          <div class="message-reply">
            <span class="reply-author">${replyTo.sender_name || 'User'}</span>
            <span class="reply-content">${replyTo.content}</span>
          </div>
        ` : ''}
        <div class="message-content">
          ${message.message_type === 'text' ? message.content : 
            message.message_type === 'image' ? `<img src="${message.media_url}" alt="Image" />` :
            message.message_type === 'video' ? `<video src="${message.media_url}" controls></video>` :
            message.message_type === 'audio' ? `<audio src="${message.media_url}" controls></audio>` :
            message.message_type === 'file' ? `<a href="${message.media_url}" download>${message.file_name}</a>` :
            message.content}
        </div>
        <div class="message-footer">
          <span class="message-time">${formatTime(message.created_at)}</span>
          ${isMine ? `<span class="message-status">${statusIcon}</span>` : ''}
          ${reactions.length > 0 ? `
            <div class="message-reactions">
              ${reactions.map(r => `<span class="reaction">${r.emoji}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // Append new message
  function appendMessage(message, type = 'received') {
    const isMine = message.sender_id === Auth.getCurrentUser()?.id;
    const html = renderMessage(message);
    const div = document.createElement('div');
    div.innerHTML = html;
    messagesList.appendChild(div.firstElementChild);
    
    // Update status for sent messages
    if (isMine && message.status === 'sent') {
      updateMessageStatus(message.id, 'delivered');
    }
  }

  // Update message status
  function updateMessageStatus(messageId, status) {
    const messageEl = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (messageEl) {
      const statusEl = messageEl.querySelector('.message-status');
      if (statusEl) {
        const icons = { 'sent': '✓', 'delivered': '✓✓', 'read': '✓✓✓' };
        statusEl.textContent = icons[status] || '✓';
      }
    }
  }

  // Setup message listeners
  function setupMessageListeners(chatId) {
    // New message
    Socket.on(`message:new`, (data) => {
      if (data.chatId === chatId) {
        appendMessage(data.message, 'received');
        scrollToBottom();
        
        // Mark as read
        Socket.markAsRead(chatId, data.message.id);
        
        // Update chat list
        updateChatList(data.chatId, data.message);
      }
    });
    
    // Message status updates
    Socket.on(`message:delivered`, (data) => {
      if (data.chatId === chatId) {
        updateMessageStatus(data.messageId, 'delivered');
      }
    });
    
    Socket.on(`message:read`, (data) => {
      if (data.chatId === chatId) {
        updateMessageStatus(data.messageId, 'read');
      }
    });
    
    // Message reactions
    Socket.on(`message:reaction`, (data) => {
      if (data.chatId === chatId) {
        updateMessageReactions(data.messageId, data.reactions);
      }
    });
    
    // Message deletion
    Socket.on(`message:deleted`, (data) => {
      if (data.chatId === chatId) {
        const messageEl = document.querySelector(`.message[data-message-id="${data.messageId}"]`);
        if (messageEl) {
          messageEl.style.opacity = '0.3';
          messageEl.innerHTML = '<em>This message was deleted</em>';
        }
      }
    });
    
    // Message edit
    Socket.on(`message:updated`, (data) => {
      if (data.chatId === chatId) {
        const messageEl = document.querySelector(`.message[data-message-id="${data.messageId}"]`);
        if (messageEl) {
          const contentEl = messageEl.querySelector('.message-content');
          if (contentEl) {
            contentEl.innerHTML = data.content;
            messageEl.classList.add('edited');
          }
        }
      }
    });
  }

  // Setup typing listeners
  function setupTypingListeners(chatId) {
    Socket.on(`typing:start`, (data) => {
      if (data.chatId === chatId && data.userId !== Auth.getCurrentUser()?.id) {
        typingIndicator.style.display = 'flex';
        document.querySelector('.typing-text').textContent = `${data.userName || 'Someone'} is typing...`;
      }
    });
    
    Socket.on(`typing:stop`, (data) => {
      if (data.chatId === chatId) {
        typingIndicator.style.display = 'none';
      }
    });
  }

  // Update message reactions
  function updateMessageReactions(messageId, reactions) {
    const messageEl = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (messageEl) {
      let reactionsContainer = messageEl.querySelector('.message-reactions');
      if (reactions.length > 0) {
        if (!reactionsContainer) {
          reactionsContainer = document.createElement('div');
          reactionsContainer.className = 'message-reactions';
          messageEl.querySelector('.message-footer').appendChild(reactionsContainer);
        }
        reactionsContainer.innerHTML = reactions.map(r => `<span class="reaction">${r.emoji}</span>`).join('');
      } else if (reactionsContainer) {
        reactionsContainer.remove();
      }
    }
  }

  // Update chat list
  function updateChatList(chatId, message) {
    const chats = Store.get('chats') || [];
    const chatIndex = chats.findIndex(c => c.id === chatId);
    if (chatIndex !== -1) {
      chats[chatIndex].lastMessage = message;
      chats[chatIndex].unreadCount = (chats[chatIndex].unreadCount || 0) + 1;
      Store.set('chats', chats);
      
      // Update badge
      const badge = document.getElementById('unreadBadge');
      const totalUnread = chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      if (badge) {
        badge.textContent = totalUnread > 0 ? totalUnread : '';
        badge.style.display = totalUnread > 0 ? 'flex' : 'none';
      }
    }
  }

  // Format time
  function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Start call (global)
  window.startCall = function(chatId, type) {
    Router.navigate('call-view', { id: chatId, type });
  };

  // Cleanup
  return () => {
    Socket.off(`message:new`);
    Socket.off(`message:delivered`);
    Socket.off(`message:read`);
    Socket.off(`message:reaction`);
    Socket.off(`message:deleted`);
    Socket.off(`message:updated`);
    Socket.off(`typing:start`);
    Socket.off(`typing:stop`);
  };
}

// Styles
const chatViewStyles = `
.chat-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
}

.chat-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-lg);
  border-bottom: 1px solid var(--border-glass);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 2;
}

.chat-header-info {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex: 1;
  cursor: pointer;
}

.chat-header-avatar {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, #5865F2, #00D4FF);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
  overflow: hidden;
  flex-shrink: 0;
}

.chat-header-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chat-header-details {
  display: flex;
  flex-direction: column;
}

.chat-header-name {
  font-weight: 600;
  font-size: 15px;
}

.chat-header-status {
  font-size: 12px;
  color: var(--text-secondary);
}

.chat-header-actions {
  display: flex;
  gap: var(--space-xs);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-md) var(--space-lg);
  display: flex;
  flex-direction: column;
}

.messages-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding-bottom: var(--space-md);
}

.message {
  max-width: 70%;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  position: relative;
  animation: slide-up 0.3s ease;
}

.message.sent {
  align-self: flex-end;
  background: var(--primary);
  border-bottom-right-radius: 4px;
}

.message.received {
  align-self: flex-start;
  background: var(--bg-glass);
  border-bottom-left-radius: 4px;
}

.message-reply {
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-glass);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-xs);
  border-left: 3px solid var(--primary);
}

.message-reply .reply-author {
  font-size: 12px;
  font-weight: 600;
  color: var(--primary);
  display: block;
}

.message-reply .reply-content {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.message-content {
  font-size: 15px;
  line-height: 1.5;
  word-wrap: break-word;
}

.message-content img {
  max-width: 300px;
  max-height: 400px;
  border-radius: var(--radius-sm);
}

.message-content video {
  max-width: 300px;
  max-height: 400px;
  border-radius: var(--radius-sm);
}

.message-content audio {
  width: 200px;
}

.message-content a {
  color: var(--accent);
  text-decoration: underline;
}

.message-footer {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
  font-size: 11px;
  color: var(--text-muted);
}

.message.sent .message-footer {
  justify-content: flex-end;
}

.message-status {
  font-weight: 600;
}

.message-reactions {
  display: flex;
  gap: var(--space-xs);
  margin-top: var(--space-xs);
}

.reaction {
  font-size: 16px;
  background: var(--bg-glass);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.message.edited::after {
  content: 'edited';
  font-size: 10px;
  color: var(--text-muted);
  margin-left: var(--space-xs);
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  margin-top: auto;
  animation: slide-up 0.3s ease;
}

.typing-text {
  font-size: 13px;
  color: var(--text-secondary);
}

.message-input-container {
  display: flex;
  align-items: flex-end;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-lg);
  border-top: 1px solid var(--border-glass);
  flex-shrink: 0;
}

.message-input-tools {
  display: flex;
  gap: var(--space-xs);
  align-items: center;
}

.message-input-wrapper {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: var(--space-sm);
  background: var(--bg-glass);
  border-radius: var(--radius-md);
  padding: var(--space-xs);
}

.message-input-wrapper textarea {
  flex: 1;
  padding: var(--space-sm);
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 14px;
  resize: none;
  max-height: 120px;
  font-family: inherit;
  line-height: 1.5;
}

.message-input-wrapper textarea::placeholder {
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .message {
    max-width: 85%;
  }
  
  .message-content img,
  .message-content video {
    max-width: 200px;
  }
  
  .chat-view {
    padding: 0;
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = chatViewStyles;
document.head.appendChild(styleTag);
