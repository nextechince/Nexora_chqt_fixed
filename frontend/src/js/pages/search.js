/**
 * Search Page
 * Global search with filters
 */
import API from '../utils/api.js';
import { Toast } from '../utils/toast.js';
import { Router } from '../router.js';
import { Auth } from '../utils/auth.js';
import { Store } from '../store.js';

let searchQuery = '';
let searchResults = {
  users: [],
  messages: [],
  groups: [],
  channels: []
};
let currentFilter = 'all';

export function SearchPage() {
  return `
    <div class="search-page">
      <div class="search-header">
        <button class="btn btn-icon" onclick="window.history.back()">
          ←
        </button>
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input 
            type="text" 
            id="searchInput" 
            placeholder="Search for people, messages, groups, channels..." 
            autofocus
          />
          <button class="btn btn-icon btn-sm" id="clearSearchBtn" style="display:none;">✕</button>
        </div>
      </div>

      <div class="search-filters">
        <button class="filter-btn active" data-filter="all">All</button>
        <button class="filter-btn" data-filter="users">People</button>
        <button class="filter-btn" data-filter="messages">Messages</button>
        <button class="filter-btn" data-filter="groups">Groups</button>
        <button class="filter-btn" data-filter="channels">Channels</button>
      </div>

      <div class="search-results" id="searchResults">
        <div class="search-placeholder">
          <div class="search-icon-large">🔍</div>
          <h3>Search for anything</h3>
          <p>Find people, messages, groups, and channels</p>
        </div>
      </div>
    </div>
  `;
}

export function initSearch() {
  const input = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearSearchBtn');
  const resultsContainer = document.getElementById('searchResults');

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      if (searchQuery) {
        performSearch(searchQuery, currentFilter);
      }
    });
  });

  // Search on input
  let searchTimeout;
  input.addEventListener('input', function() {
    const query = this.value.trim();
    
    if (query.length === 0) {
      clearBtn.style.display = 'none';
      showPlaceholder();
      return;
    }

    clearBtn.style.display = 'flex';
    searchQuery = query;

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      performSearch(query, currentFilter);
    }, 500);
  });

  // Clear search
  clearBtn.addEventListener('click', function() {
    input.value = '';
    this.style.display = 'none';
    searchQuery = '';
    showPlaceholder();
    input.focus();
  });

  // Keyboard shortcuts
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.blur();
    }
    if (e.key === 'Enter') {
      performSearch(input.value.trim(), currentFilter);
    }
  });
}

async function performSearch(query, filter = 'all') {
  const container = document.getElementById('searchResults');
  
  if (!query || query.length < 2) {
    Toast.warning('Please enter at least 2 characters');
    return;
  }

  container.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const response = await API.get('/search', {
      q: query,
      type: filter
    });

    searchResults = response.results || { users: [], messages: [], groups: [], channels: [] };
    renderResults(searchResults, filter);

  } catch (error) {
    console.error('Search error:', error);
    container.innerHTML = `
      <div class="error-container">
        <p>Failed to search</p>
        <button class="btn btn-primary" onclick="performSearch('${query}', '${filter}')">Retry</button>
      </div>
    `;
  }
}

function renderResults(results, filter) {
  const container = document.getElementById('searchResults');
  const hasResults = Object.values(results).some(arr => arr && arr.length > 0);

  if (!hasResults) {
    container.innerHTML = `
      <div class="search-empty">
        <div class="empty-icon">🔍</div>
        <h3>No results found</h3>
        <p>Try different keywords or check your spelling</p>
      </div>
    `;
    return;
  }

  let html = '';

  // Users
  if ((filter === 'all' || filter === 'users') && results.users && results.users.length > 0) {
    html += `
      <div class="result-section">
        <h3>People</h3>
        ${results.users.map(user => `
          <div class="result-item" onclick="openProfile('${user.id}')">
            <div class="result-avatar">
              ${user.avatar_url ? 
                `<img src="${user.avatar_url}" alt="${user.display_name}" />` :
                `<span>${(user.display_name || 'U')[0].toUpperCase()}</span>`
              }
              <span class="result-online ${user.online_status ? 'online' : 'offline'}"></span>
            </div>
            <div class="result-info">
              <div class="result-name">
                ${user.display_name || user.username}
                ${user.is_verified ? '<span class="badge badge-verified">✓</span>' : ''}
              </div>
              <div class="result-username">@${user.username}</div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); startChat('${user.id}')">
              💬
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Messages
  if ((filter === 'all' || filter === 'messages') && results.messages && results.messages.length > 0) {
    html += `
      <div class="result-section">
        <h3>Messages</h3>
        ${results.messages.map(msg => `
          <div class="result-item" onclick="openMessage('${msg.chat_id}', '${msg.id}')">
            <div class="result-avatar">
              ${msg.sender?.avatar_url ? 
                `<img src="${msg.sender.avatar_url}" alt="${msg.sender.display_name}" />` :
                `<span>${(msg.sender?.display_name || 'U')[0].toUpperCase()}</span>`
              }
            </div>
            <div class="result-info">
              <div class="result-name">
                ${msg.sender?.display_name || 'Unknown'}
                <span class="result-time">${formatTime(msg.created_at)}</span>
              </div>
              <div class="result-preview">${highlightText(msg.content, searchQuery)}</div>
              <div class="result-context">in ${msg.chat_name || 'Chat'}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Groups
  if ((filter === 'all' || filter === 'groups') && results.groups && results.groups.length > 0) {
    html += `
      <div class="result-section">
        <h3>Groups</h3>
        ${results.groups.map(group => `
          <div class="result-item" onclick="openGroup('${group.id}')">
            <div class="result-avatar">
              ${group.avatar_url ? 
                `<img src="${group.avatar_url}" alt="${group.name}" />` :
                `<span>${(group.name || 'G')[0].toUpperCase()}</span>`
              }
            </div>
            <div class="result-info">
              <div class="result-name">${group.name || 'Unnamed Group'}</div>
              <div class="result-meta">${group.member_count || 0} members</div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); openGroup('${group.id}')">
              View
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Channels
  if ((filter === 'all' || filter === 'channels') && results.channels && results.channels.length > 0) {
    html += `
      <div class="result-section">
        <h3>Channels</h3>
        ${results.channels.map(channel => `
          <div class="result-item" onclick="openChannel('${channel.id}')">
            <div class="result-avatar">
              ${channel.avatar_url ? 
                `<img src="${channel.avatar_url}" alt="${channel.name}" />` :
                `<span>${(channel.name || 'C')[0].toUpperCase()}</span>`
              }
              ${channel.is_verified ? '<span class="verified-badge">✓</span>' : ''}
            </div>
            <div class="result-info">
              <div class="result-name">
                ${channel.name || 'Unnamed Channel'}
                ${channel.is_verified ? '<span class="badge badge-verified">Verified</span>' : ''}
              </div>
              <div class="result-meta">${channel.subscriber_count || 0} subscribers</div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); openChannel('${channel.id}')">
              View
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }

  container.innerHTML = html;
}

function showPlaceholder() {
  const container = document.getElementById('searchResults');
  container.innerHTML = `
    <div class="search-placeholder">
      <div class="search-icon-large">🔍</div>
      <h3>Search for anything</h3>
      <p>Find people, messages, groups, and channels</p>
    </div>
  `;
}

function highlightText(text, query) {
  if (!text || !query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<span class="highlight">$1</span>');
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Navigation helpers
window.openProfile = function(userId) {
  Router.navigate('profile', { id: userId });
};

window.startChat = function(userId) {
  Toast.info('Starting chat...');
  // Create private chat
  API.post('/chats', { type: 'private', participants: [userId] })
    .then(response => {
      Router.navigate('chat-view', { id: response.chat.id });
    })
    .catch(error => {
      Toast.error(error.message || 'Failed to start chat');
    });
};

window.openMessage = function(chatId, messageId) {
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
};

window.openGroup = function(groupId) {
  Router.navigate('group-view', { id: groupId });
};

window.openChannel = function(channelId) {
  Router.navigate('channel-view', { id: channelId });
};

// Styles
const searchStyles = `
.search-page {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-lg);
}

.search-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-md);
  padding: 0 var(--space-md);
  transition: all var(--transition-fast);
}

.search-input-wrapper:focus-within {
  border-color: var(--primary);
  box-shadow: var(--shadow-glow);
}

.search-icon {
  font-size: 18px;
  color: var(--text-secondary);
  margin-right: var(--space-sm);
}

.search-input-wrapper input {
  flex: 1;
  padding: var(--space-md) 0;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 16px;
}

.search-input-wrapper input::placeholder {
  color: var(--text-muted);
}

#clearSearchBtn {
  color: var(--text-secondary);
  font-size: 16px;
  padding: 4px;
  border-radius: var(--radius-full);
  transition: all var(--transition-fast);
}

#clearSearchBtn:hover {
  background: var(--bg-glass);
  color: var(--text-primary);
}

.search-filters {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
  flex-wrap: wrap;
}

.filter-btn {
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

.filter-btn:hover {
  background: var(--bg-glass-hover);
  color: var(--text-primary);
}

.filter-btn.active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

.search-results {
  min-height: 300px;
}

.search-placeholder {
  text-align: center;
  padding: var(--space-2xl) var(--space-lg);
}

.search-icon-large {
  font-size: 64px;
  margin-bottom: var(--space-md);
  opacity: 0.5;
}

.search-placeholder h3 {
  font-size: 20px;
  margin-bottom: var(--space-sm);
}

.search-placeholder p {
  color: var(--text-secondary);
}

.search-empty {
  text-align: center;
  padding: var(--space-2xl) var(--space-lg);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: var(--space-md);
}

.result-section {
  margin-bottom: var(--space-xl);
}

.result-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: var(--space-md);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-glass);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}

.result-item:hover {
  background: var(--bg-glass-hover);
  border-color: var(--border-glass-hover);
  transform: translateX(4px);
}

.result-avatar {
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

.result-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.result-online {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  border: 2px solid var(--bg-primary);
}

.result-online.online {
  background: #22C55E;
}

.result-online.offline {
  background: var(--text-muted);
}

.result-info {
  flex: 1;
  min-width: 0;
}

.result-name {
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-wrap: wrap;
}

.result-username {
  font-size: 13px;
  color: var(--text-secondary);
}

.result-time {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 400;
  margin-left: auto;
}

.result-preview {
  font-size: 14px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-context {
  font-size: 12px;
  color: var(--text-muted);
}

.result-meta {
  font-size: 13px;
  color: var(--text-secondary);
}

.highlight {
  background: rgba(88, 101, 242, 0.3);
  padding: 0 2px;
  border-radius: 2px;
  color: var(--text-primary);
}

.verified-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  background: #3B82F6;
  color: #fff;
  font-size: 10px;
  border-radius: var(--radius-full);
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--bg-primary);
}

@media (max-width: 480px) {
  .search-page {
    padding: var(--space-md);
  }
  
  .search-filters {
    gap: var(--space-xs);
  }
  
  .filter-btn {
    padding: var(--space-xs) var(--space-sm);
    font-size: 12px;
  }
  
  .result-item {
    padding: var(--space-sm);
    flex-wrap: wrap;
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = searchStyles;
document.head.appendChild(styleTag);
