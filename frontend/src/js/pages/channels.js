/**
 * Channels Page
 * List, creation, subscription management
 */
import API from '../utils/api.js';
import { Toast } from '../utils/toast.js';
import { Router } from '../router.js';
import { Auth } from '../utils/auth.js';

export function ChannelsPage() {
  return `
    <div class="channels-page">
      <div class="channels-header">
        <button class="btn btn-icon" onclick="window.history.back()">
          ←
        </button>
        <h2>Channels</h2>
        <button class="btn btn-primary btn-sm" id="createChannelBtn">
          + New Channel
        </button>
      </div>

      <div class="channels-tabs">
        <button class="tab-btn active" data-tab="subscribed">Subscribed</button>
        <button class="tab-btn" data-tab="discover">Discover</button>
      </div>

      <div class="channels-content">
        <div class="channels-list" id="channelsList">
          <div class="loading-spinner"></div>
        </div>
      </div>
    </div>
  `;
}

export function initChannels() {
  let currentTab = 'subscribed';
  
  loadChannels(currentTab);

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentTab = this.dataset.tab;
      loadChannels(currentTab);
    });
  });

  document.getElementById('createChannelBtn')?.addEventListener('click', () => {
    showCreateChannelModal();
  });
}

async function loadChannels(tab) {
  const container = document.getElementById('channelsList');
  
  try {
    let response;
    if (tab === 'subscribed') {
      response = await API.get('/channels');
    } else {
      response = await API.get('/channels/discover');
    }
    
    const channels = response.channels || [];

    if (channels.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📢</div>
          <h3>${tab === 'subscribed' ? 'No Channels Subscribed' : 'No Channels Discovered'}</h3>
          <p>${tab === 'subscribed' ? 'Subscribe to channels to see them here' : 'Explore and subscribe to channels'}</p>
          ${tab === 'subscribed' ? `
            <button class="btn btn-primary" onclick="document.querySelector('.tab-btn[data-tab="discover"]').click()">
              Discover Channels
            </button>
          ` : `
            <button class="btn btn-primary" onclick="document.getElementById('createChannelBtn').click()">
              Create Channel
            </button>
          `}
        </div>
      `;
      return;
    }

    container.innerHTML = channels.map(channel => `
      <div class="channel-item" onclick="openChannel('${channel.id}')">
        <div class="channel-avatar">
          ${channel.avatar_url ? 
            `<img src="${channel.avatar_url}" alt="${channel.name}" />` :
            `<span>${(channel.name || 'C')[0].toUpperCase()}</span>`
          }
          ${channel.is_verified ? '<span class="verified-badge">✓</span>' : ''}
        </div>
        <div class="channel-info">
          <div class="channel-name">
            ${channel.name || 'Unnamed Channel'}
            ${channel.is_verified ? '<span class="badge badge-verified">Verified</span>' : ''}
          </div>
          <div class="channel-meta">
            ${channel.subscriber_count || 0} subscribers
            ${channel.category ? `• ${channel.category}` : ''}
          </div>
          ${channel.description ? `
            <div class="channel-description">${channel.description}</div>
          ` : ''}
          ${channel.lastPost ? `
            <div class="channel-last-post">
              ${channel.lastPost.sender?.display_name || 'User'}: ${channel.lastPost.content || ''}
            </div>
          ` : ''}
        </div>
        <div class="channel-actions">
          ${tab === 'discovered' ? `
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); subscribeChannel('${channel.id}')">
              Subscribe
            </button>
          ` : `
            <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); unsubscribeChannel('${channel.id}')">
              Unsubscribe
            </button>
          `}
          <button class="btn btn-icon btn-sm" onclick="event.stopPropagation(); openChannel('${channel.id}')">
            📖
          </button>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Failed to load channels:', error);
    container.innerHTML = `
      <div class="error-container">
        <p>Failed to load channels</p>
        <button class="btn btn-primary" onclick="loadChannels('${tab}')">Retry</button>
      </div>
    `;
  }
}

function showCreateChannelModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content glass">
      <div class="modal-header">
        <h3>Create New Channel</h3>
        <button class="modal-close">&times;</button>
      </div>
      <form id="createChannelForm">
        <div class="form-group">
          <label>Channel Name *</label>
          <input type="text" id="channelName" placeholder="Enter channel name" required maxlength="50" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="channelDescription" placeholder="Describe your channel" maxlength="500"></textarea>
        </div>
        <div class="form-group">
          <label>Category</label>
          <select id="channelCategory">
            <option value="general">General</option>
            <option value="technology">Technology</option>
            <option value="gaming">Gaming</option>
            <option value="entertainment">Entertainment</option>
            <option value="education">Education</option>
            <option value="news">News</option>
            <option value="sports">Sports</option>
            <option value="music">Music</option>
            <option value="art">Art</option>
            <option value="business">Business</option>
            <option value="science">Science</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="form-group">
          <label>Privacy</label>
          <select id="channelPrivacy">
            <option value="false">Public - Anyone can subscribe</option>
            <option value="true">Private - Invite only</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary btn-full">Create Channel</button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  modal.classList.add('show');

  modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  document.getElementById('createChannelForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('channelName').value.trim();
    const description = document.getElementById('channelDescription').value.trim();
    const category = document.getElementById('channelCategory').value;
    const isPrivate = document.getElementById('channelPrivacy').value === 'true';

    if (!name) {
      Toast.error('Channel name is required');
      return;
    }

    try {
      await API.post('/channels', {
        name,
        description,
        category,
        isPrivate
      });

      Toast.success('Channel created successfully!');
      modal.remove();
      loadChannels('subscribed');
    } catch (error) {
      Toast.error(error.message || 'Failed to create channel');
    }
  });
}

// Subscribe to channel
window.subscribeChannel = async function(channelId) {
  try {
    await API.post(`/channels/${channelId}/subscribe`);
    Toast.success('Subscribed to channel');
    loadChannels('discover');
  } catch (error) {
    Toast.error(error.message || 'Failed to subscribe');
  }
};

// Unsubscribe from channel
window.unsubscribeChannel = async function(channelId) {
  if (!confirm('Unsubscribe from this channel?')) return;
  
  try {
    await API.post(`/channels/${channelId}/unsubscribe`);
    Toast.success('Unsubscribed from channel');
    loadChannels('subscribed');
  } catch (error) {
    Toast.error(error.message || 'Failed to unsubscribe');
  }
};

// Open channel
window.openChannel = function(channelId) {
  Router.navigate('channel-view', { id: channelId });
};

// Styles
const channelsStyles = `
.channels-page {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-lg);
}

.channels-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-md);
}

.channels-header h2 {
  font-size: 24px;
  font-weight: 700;
}

.channels-tabs {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
  border-bottom: 1px solid var(--border-glass);
}

.tab-btn {
  padding: var(--space-sm) var(--space-lg);
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all var(--transition-fast);
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.channels-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.channel-item {
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

.channel-item:hover {
  background: var(--bg-glass-hover);
  border-color: var(--border-glass-hover);
  transform: translateX(4px);
}

.channel-avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #00D4FF, #5865F2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 18px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.channel-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.verified-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  background: #3B82F6;
  color: #fff;
  font-size: 12px;
  border-radius: var(--radius-full);
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--bg-primary);
}

.channel-info {
  flex: 1;
  min-width: 0;
}

.channel-name {
  font-weight: 600;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-wrap: wrap;
}

.channel-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

.channel-description {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: var(--space-xs);
}

.channel-last-post {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: var(--space-xs);
}

.channel-actions {
  display: flex;
  gap: var(--space-xs);
}

@media (max-width: 480px) {
  .channels-page {
    padding: var(--space-md);
  }
  
  .channel-item {
    padding: var(--space-sm);
    flex-wrap: wrap;
  }
  
  .channel-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = channelsStyles;
document.head.appendChild(styleTag);
