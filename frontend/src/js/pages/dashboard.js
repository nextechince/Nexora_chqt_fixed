/**
 * Dashboard Page
 * Main layout with bottom navigation
 */
import { Store } from '../store.js';
import { Auth } from '../utils/auth.js';
import { Router } from '../router.js';
import { Socket } from '../utils/socket.js';
import { Toast } from '../utils/toast.js';

export function DashboardPage() {
  const user = Auth.getCurrentUser() || {};
  
  return `
    <div class="dashboard">
      <!-- Sidebar -->
      <aside class="sidebar glass">
        <div class="sidebar-header">
          <div class="sidebar-logo">
            <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="45" stroke="#5865F2" stroke-width="4"/>
              <path d="M35 50 L45 60 L65 40" stroke="#5865F2" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>NEXORA</span>
          </div>
          <button class="btn btn-icon btn-sm" id="sidebarToggle" aria-label="Toggle sidebar">
            ☰
          </button>
        </div>
        
        <nav class="sidebar-nav">
          <button class="nav-item active" data-page="chats" onclick="window.dispatchEvent(new CustomEvent('navigate', {detail: {page: 'chats'}}))">
            <span class="nav-icon">💬</span>
            <span class="nav-label">Chats</span>
            <span class="nav-badge" id="unreadBadge">0</span>
          </button>
          <button class="nav-item" data-page="groups" onclick="window.dispatchEvent(new CustomEvent('navigate', {detail: {page: 'groups'}}))">
            <span class="nav-icon">👥</span>
            <span class="nav-label">Groups</span>
          </button>
          <button class="nav-item" data-page="channels" onclick="window.dispatchEvent(new CustomEvent('navigate', {detail: {page: 'channels'}}))">
            <span class="nav-icon">📢</span>
            <span class="nav-label">Channels</span>
          </button>
          <button class="nav-item" data-page="calls" onclick="window.dispatchEvent(new CustomEvent('navigate', {detail: {page: 'calls'}}))">
            <span class="nav-icon">📞</span>
            <span class="nav-label">Calls</span>
          </button>
          <button class="nav-item" data-page="saved" onclick="window.dispatchEvent(new CustomEvent('navigate', {detail: {page: 'saved-messages'}}))">
            <span class="nav-icon">⭐</span>
            <span class="nav-label">Saved</span>
          </button>
        </nav>
        
        <div class="sidebar-footer">
          <button class="nav-item" data-page="search" onclick="window.dispatchEvent(new CustomEvent('navigate', {detail: {page: 'search'}}))">
            <span class="nav-icon">🔍</span>
            <span class="nav-label">Search</span>
          </button>
          <button class="nav-item" data-page="profile" onclick="window.dispatchEvent(new CustomEvent('navigate', {detail: {page: 'profile'}}))">
            <div class="sidebar-avatar">
              ${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.display_name}" />` : 
                `<span>${(user.display_name || 'U')[0].toUpperCase()}</span>`}
            </div>
            <span class="nav-label">${user.display_name || 'User'}</span>
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="dashboard-main">
        <div id="dashboardContent" class="dashboard-content">
          <!-- Dynamic content goes here -->
        </div>
      </main>
    </div>
  `;
}

export function initDashboard() {
  // Load initial content (chats)
  loadChats();
  
  // Setup navigation
  setupNavigation();
  
  // Setup socket listeners
  setupSocketListeners();
  
  // Update unread badge
  updateUnreadBadge();
  
  // Handle sidebar toggle
  const toggleBtn = document.getElementById('sidebarToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      document.querySelector('.sidebar').classList.toggle('sidebar-collapsed');
    });
  }
}

async function loadChats() {
  const container = document.getElementById('dashboardContent');
  
  try {
    const chats = await API.get('/chats');
    Store.set('chats', chats);
    
    // Render chats list
    container.innerHTML = `
      <div class="chats-container">
        <div class="chats-header">
          <h2>Chats</h2>
          <button class="btn btn-primary btn-sm" id="newChatBtn">
            New Chat
          </button>
        </div>
        <div class="chats-list" id="chatsList">
          ${chats.map(chat => renderChatItem(chat)).join('')}
        </div>
      </div>
    `;
    
    // Setup new chat button
    document.getElementById('newChatBtn')?.addEventListener('click', () => {
      showNewChatModal();
    });
    
  } catch (error) {
    console.error('Failed to load chats:', error);
    container.innerHTML = `
      <div class="error-container">
        <p>Failed to load chats</p>
        <button class="btn btn-primary" onclick="loadChats()">Retry</button>
      </div>
    `;
  }
}

function renderChatItem(chat) {
  const lastMessage = chat.lastMessage || {};
  const unreadCount = chat.unreadCount || 0;
  const isPinned = chat.isPinned || false;
  
  return `
    <div class="chat-item ${isPinned ? 'pinned' : ''}" data-chat-id="${chat.id}" onclick="openChat('${chat.id}')">
      <div class="chat-avatar">
        ${chat.avatar_url ? `<img src="${chat.avatar_url}" alt="${chat.name}" />` :
          `<span>${(chat.name || 'C')[0].toUpperCase()}</span>`}
        ${chat.isOnline ? '<span class="online-indicator"></span>' : ''}
      </div>
      <div class="chat-info">
        <div class="chat-name">
          ${chat.name || 'Unknown'}
          ${isPinned ? '<span class="pinned-icon">📌</span>' : ''}
        </div>
        <div class="chat-last-message">
          ${lastMessage.sender ? `${lastMessage.sender}: ` : ''}
          ${lastMessage.content || 'No messages yet'}
        </div>
      </div>
      <div class="chat-meta">
        <span class="chat-time">${formatTime(lastMessage.createdAt)}</span>
        ${unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : ''}
      </div>
    </div>
  `;
}

function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', function() {
      navItems.forEach(n => n.classList.remove('active'));
      this.classList.add('active');
    });
  });
}

function setupSocketListeners() {
  // New message event
  Socket.on('message:new', (data) => {
    const chats = Store.get('chats');
    const chatIndex = chats.findIndex(c => c.id === data.chatId);
    if (chatIndex !== -1) {
      // Update last message
      chats[chatIndex].lastMessage = data.message;
      chats[chatIndex].unreadCount = (chats[chatIndex].unreadCount || 0) + 1;
      Store.set('chats', chats);
      updateUnreadBadge();
      
      // If current chat is open, mark as read
      const currentChat = Store.get('currentChat');
      if (currentChat && currentChat.id === data.chatId) {
        Socket.markAsRead(data.chatId, data.message.id);
      }
    }
  });
  
  // Message read event
  Socket.on('message:read', (data) => {
    // Update message status in UI
    const messages = Store.get('messages') || {};
    if (messages[data.chatId]) {
      const msgIndex = messages[data.chatId].findIndex(m => m.id === data.messageId);
      if (msgIndex !== -1) {
        messages[data.chatId][msgIndex].status = 'read';
        Store.set('messages', messages);
      }
    }
  });
  
  // Online status updates
  Socket.on('presence:online', (data) => {
    const onlineUsers = Store.get('onlineUsers');
    onlineUsers.add(data.userId);
    Store.set('onlineUsers', onlineUsers);
    updateOnlineStatus(data.userId, true);
  });
  
  Socket.on('presence:offline', (data) => {
    const onlineUsers = Store.get('onlineUsers');
    onlineUsers.delete(data.userId);
    Store.set('onlineUsers', onlineUsers);
    updateOnlineStatus(data.userId, false);
  });
}

function updateUnreadBadge() {
  const chats = Store.get('chats') || [];
  const totalUnread = chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
  const badge = document.getElementById('unreadBadge');
  if (badge) {
    badge.textContent = totalUnread > 0 ? totalUnread : '';
    badge.style.display = totalUnread > 0 ? 'flex' : 'none';
  }
}

function updateOnlineStatus(userId, isOnline) {
  // Update all chat items with this user
  document.querySelectorAll('.chat-item').forEach(item => {
    const chatId = item.dataset.chatId;
    if (chatId) {
      // Check if this chat is with the user
      // This would require checking chat members
    }
  });
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Open chat function (global)
window.openChat = function(chatId) {
  Router.navigate('chat-view', { id: chatId });
};

// New chat modal
function showNewChatModal() {
  // Implement modal for new chat
  Toast.info('New chat feature coming soon');
}

// Export for router
export default {
  render: DashboardPage,
  init: initDashboard
};

// Styles
const dashboardStyles = `
.dashboard {
  display: flex;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: var(--bg-primary);
}

.sidebar {
  width: 260px;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-glass);
  flex-shrink: 0;
  transition: width var(--transition-base), transform var(--transition-base);
  background: var(--bg-secondary);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  z-index: 10;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) var(--space-lg);
  border-bottom: 1px solid var(--border-glass);
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-weight: 700;
  font-size: 18px;
}

.sidebar-logo span {
  background: linear-gradient(135deg, #5865F2, #00D4FF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.sidebar-nav {
  flex: 1;
  padding: var(--space-md);
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: 10px 14px;
  border-radius: var(--radius-md);
  width: 100%;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
  position: relative;
}

.nav-item:hover {
  background: var(--bg-glass);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--bg-glass);
  color: var(--text-primary);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  background: var(--primary);
  border-radius: 0 var(--radius-full) var(--radius-full) 0;
}

.nav-icon {
  font-size: 20px;
  width: 28px;
  text-align: center;
  flex-shrink: 0;
}

.nav-label {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
}

.nav-badge {
  background: var(--primary);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: var(--radius-full);
  min-width: 20px;
  text-align: center;
  display: none;
}

.nav-badge:not(:empty) {
  display: flex;
}

.sidebar-footer {
  padding: var(--space-md);
  border-top: 1px solid var(--border-glass);
}

.sidebar-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, #5865F2, #00D4FF);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
  flex-shrink: 0;
}

.sidebar-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dashboard-main {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dashboard-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-lg);
}

.chats-container {
  max-width: 800px;
  margin: 0 auto;
}

.chats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
}

.chats-header h2 {
  font-size: 24px;
  font-weight: 700;
}

.chats-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.chat-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-glass);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}

.chat-item:hover {
  background: var(--bg-glass-hover);
  border-color: var(--border-glass-hover);
  transform: translateX(4px);
}

.chat-item.pinned {
  border-left: 3px solid var(--primary);
}

.chat-avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, #5865F2, #00D4FF);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 18px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.chat-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.online-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  background: #22C55E;
  border-radius: var(--radius-full);
  border: 2px solid var(--bg-secondary);
}

.chat-info {
  flex: 1;
  min-width: 0;
}

.chat-name {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.pinned-icon {
  font-size: 14px;
}

.chat-last-message {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-xs);
  flex-shrink: 0;
}

.chat-time {
  font-size: 12px;
  color: var(--text-muted);
}

.unread-badge {
  background: var(--primary);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: var(--radius-full);
  min-width: 20px;
  text-align: center;
}

@media (max-width: 768px) {
  .sidebar {
    width: 72px;
  }
  
  .sidebar .nav-label,
  .sidebar .nav-badge,
  .sidebar .sidebar-logo span,
  .sidebar #sidebarToggle {
    display: none;
  }
  
  .sidebar .nav-item {
    justify-content: center;
    padding: 12px;
  }
  
  .sidebar .nav-icon {
    font-size: 24px;
  }
  
  .sidebar .sidebar-avatar {
    width: 40px;
    height: 40px;
  }
  
  .sidebar-footer .nav-item {
    padding: 8px;
  }
  
  .sidebar-header {
    justify-content: center;
    padding: var(--space-sm);
  }
  
  .sidebar-collapsed {
    width: 0;
    transform: translateX(-100%);
  }
  
  .dashboard-content {
    padding: var(--space-md);
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = dashboardStyles;
document.head.appendChild(styleTag);
