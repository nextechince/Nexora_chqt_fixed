/**
 * Saved Messages Page
 * View and manage saved messages
 */
import API from '../utils/api.js';
import { Toast } from '../utils/toast.js';
import { Router } from '../router.js';

let savedMessages = [];
let currentFilter = 'all';

export function SavedMessagesPage() {
  return `
    <div class="saved-messages-page">
      <div class="saved-header">
        <button class="btn btn-icon" onclick="window.history.back()">
          ←
        </button>
        <h2>⭐ Saved Messages</h2>
        <button class="btn btn-sm btn-secondary" id="clearSavedBtn">Clear All</button>
      </div>

      <div class="saved-filters">
        <button class="filter-btn active" data-filter="all">All</button>
        <button class="filter-btn" data-filter="text">Text</button>
        <button class="filter-btn" data-filter="image">Images</button>
        <button class="filter-btn" data-filter="video">Videos</button>
        <button class="filter-btn" data-filter="file">Files</button>
        <button class="filter-btn" data-filter="link">Links</button>
      </div>

      <div class="saved-grid" id="savedGrid">
        <div class="loading-spinner"></div>
      </div>
    </div>
  `;
}

export function initSavedMessages() {
  loadSavedMessages();

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      renderSavedMessages(currentFilter);
    });
  });

  // Clear all
  document.getElementById('clearSavedBtn').addEventListener('click', clearAllSaved);
}

async function loadSavedMessages() {
  const container = document.getElementById('savedGrid');
  
  try {
    const response = await API.get('/messages/saved');
    savedMessages = response.messages || [];

    renderSavedMessages(currentFilter);

  } catch (error) {
    console.error('Load saved messages error:', error);
    container.innerHTML = `
      <div class="error-container">
        <p>Failed to load saved messages</p>
        <button class="btn btn-primary" onclick="loadSavedMessages()">Retry</button>
      </div>
    `;
  }
}

function renderSavedMessages(filter = 'all') {
  const container = document.getElementById('savedGrid');
  
  let filtered = savedMessages;
  
  if (filter !== 'all') {
    filtered = savedMessages.filter(msg => {
      if (filter === 'image') return msg.message_type === 'image' || msg.media_type?.startsWith('image/');
      if (filter === 'video') return msg.message_type === 'video' || msg.media_type?.startsWith('video/');
      if (filter === 'file') return msg.message_type === 'file';
      if (filter === 'link') return msg.content && msg.content.match(/https?:\/\/[^\s]+/);
      return msg.message_type === filter;
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⭐</div>
        <h3>No Saved Messages</h3>
        <p>Messages you save will appear here</p>
        <button class="btn btn-primary" onclick="window.history.back()">Go to Chats</button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(msg => `
    <div class="saved-item glass" onclick="openChatFromSaved('${msg.chat_id}', '${msg.id}')">
      <div class="saved-item-header">
        <div class="saved-item-sender">
          ${msg.sender?.avatar_url ? 
            `<img src="${msg.sender.avatar_url}" alt="${msg.sender.display_name}" class="saved-avatar" />` :
            `<span class="saved-avatar-placeholder">${(msg.sender?.display_name || 'U')[0].toUpperCase()}</span>`
          }
          <span class="saved-sender-name">${msg.sender?.display_name || 'Unknown'}</span>
        </div>
        <span class="saved-item-time">${formatTime(msg.created_at)}</span>
      </div>
      <div class="saved-item-content">
        ${msg.message_type === 'text' ? msg.content :
          msg.message_type === 'image' ? `<img src="${msg.media_url}" alt="Image" />` :
          msg.message_type === 'video' ? `<video src="${msg.media_url}" controls></video>` :
          msg.message_type === 'audio' ? `<audio src="${msg.media_url}" controls></audio>` :
          msg.message_type === 'file' ? `<a href="${msg.media_url}" download>📎 ${msg.file_name || 'File'}</a>` :
          msg.content}
      </div>
      <div class="saved-item-footer">
        <span class="saved-item-chat">💬 ${msg.chat_name || 'Chat'}</span>
        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); unsaveMessage('${msg.id}')">
          Remove
        </button>
      </div>
    </div>
  `).join('');
}

function unsaveMessage(messageId) {
  if (!confirm('Remove this message from saved?')) return;

  API.delete(`/messages/${messageId}/save`)
    .then(() => {
      savedMessages = savedMessages.filter(m => m.id !== messageId);
      renderSavedMessages(currentFilter);
      Toast.success('Message removed from saved');
    })
    .catch(error => {
      Toast.error(error.message || 'Failed to remove message');
    });
}

function clearAllSaved() {
  if (!confirm('Remove all saved messages?')) return;

  API.delete('/messages/saved/all')
    .then(() => {
      savedMessages = [];
      renderSavedMessages(currentFilter);
      Toast.success('All saved messages cleared');
    })
    .catch(error => {
      Toast.error(error.message || 'Failed to clear saved messages');
    });
}

function openChatFromSaved(chatId, messageId) {
  Router.navigate('chat-view', { id: chatId });
  // Scroll to message after load
  setTimeout(() => {
    const msg = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (msg) {
      msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
      msg.style.background = 'var(--primary)';
      msg.style.opacity = '0.6';
      setTimeout(() => {
        msg.style.background = '';
        msg.style.opacity = '';
      }, 2000);
    }
  }, 500);
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

// Styles
const savedStyles = `
.saved-messages-page {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--space-lg);
}

.saved-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-md);
}

.saved-header h2 {
  font-size: 24px;
  font-weight: 700;
  flex: 1;
  margin-left: var(--space-md);
}

.saved-filters {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
  flex-wrap: wrap;
}

.saved-filters .filter-btn {
  padding: var(--space-sm) var(--space-lg);
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-full);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.saved-filters .filter-btn:hover {
  background: var(--bg-glass-hover);
  color: var(--text-primary);
}

.saved-filters .filter-btn.active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

.saved-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-md);
}

.saved-item {
  padding: var(--space-md);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.saved-item:hover {
  border-color: var(--border-glass-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-card);
}

.saved-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.saved-item-sender {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.saved-avatar {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  object-fit: cover;
}

.saved-avatar-placeholder {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, #5865F2, #00D4FF);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 12px;
  flex-shrink: 0;
}

.saved-sender-name {
  font-weight: 600;
  font-size: 14px;
}

.saved-item-time {
  font-size: 12px;
  color: var(--text-muted);
}

.saved-item-content {
  font-size: 14px;
  line-height: 1.6;
  max-height: 200px;
  overflow: hidden;
}

.saved-item-content img {
  max-width: 100%;
  max-height: 200px;
  border-radius: var(--radius-sm);
  object-fit: cover;
}

.saved-item-content video {
  max-width: 100%;
  max-height: 200px;
  border-radius: var(--radius-sm);
}

.saved-item-content audio {
  width: 100%;
}

.saved-item-content a {
  color: var(--primary);
  text-decoration: underline;
}

.saved-item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--space-sm);
  border-top: 1px solid var(--border-glass);
}

.saved-item-chat {
  font-size: 13px;
  color: var(--text-secondary);
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: var(--space-2xl) var(--space-lg);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: var(--space-md);
}

.empty-state h3 {
  font-size: 20px;
  margin-bottom: var(--space-sm);
}

.empty-state p {
  color: var(--text-secondary);
  margin-bottom: var(--space-lg);
}

@media (max-width: 768px) {
  .saved-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .saved-messages-page {
    padding: var(--space-md);
  }
  
  .saved-filters .filter-btn {
    padding: var(--space-xs) var(--space-sm);
    font-size: 12px;
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = savedStyles;
document.head.appendChild(styleTag);
