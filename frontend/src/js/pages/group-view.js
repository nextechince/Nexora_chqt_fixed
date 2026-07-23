/**
 * Group View Page
 * Group details, members, roles, announcements
 */
import API from '../utils/api.js';
import { Toast } from '../utils/toast.js';
import { Router } from '../router.js';
import { Auth } from '../utils/auth.js';
import { Socket } from '../utils/socket.js';

let groupId = null;
let groupData = null;
let groupMembers = [];
let currentUserRole = 'member';

export function GroupView(params) {
  groupId = params.id;
  
  return `
    <div class="group-view-page" data-group-id="${groupId}">
      <div class="group-header glass">
        <button class="btn btn-icon" onclick="window.history.back()">
          ←
        </button>
        <div class="group-header-info">
          <div class="group-header-avatar" id="groupAvatar">
            <span>G</span>
          </div>
          <div class="group-header-details">
            <span class="group-header-name" id="groupName">Loading...</span>
            <span class="group-header-meta" id="groupMeta">Loading...</span>
          </div>
        </div>
        <div class="group-header-actions">
          <button class="btn btn-icon" id="groupMenuBtn">⋮</button>
        </div>
      </div>

      <div class="group-tabs">
        <button class="tab-btn active" data-tab="chat">💬 Chat</button>
        <button class="tab-btn" data-tab="members">👥 Members</button>
        <button class="tab-btn" data-tab="about">ℹ️ About</button>
        <button class="tab-btn" data-tab="media">📷 Media</button>
      </div>

      <div class="group-content">
        <div id="groupChat" class="group-chat">
          <div class="messages-list" id="groupMessages">
            <div class="loading-spinner"></div>
          </div>
          <div class="group-input-container glass">
            <div class="group-input-tools">
              <button class="btn btn-icon btn-sm" id="groupEmojiBtn">😊</button>
              <button class="btn btn-icon btn-sm" id="groupAttachBtn">📎</button>
            </div>
            <div class="group-input-wrapper">
              <textarea 
                id="groupMessageInput" 
                rows="1" 
                placeholder="Type a message..."
                aria-label="Type a message"
              ></textarea>
              <button class="btn btn-primary btn-icon" id="groupSendBtn">➤</button>
            </div>
          </div>
        </div>
        
        <div id="groupMembers" class="group-members" style="display: none;">
          <div class="members-list" id="membersList"></div>
        </div>
        
        <div id="groupAbout" class="group-about" style="display: none;">
          <div class="about-content" id="aboutContent"></div>
        </div>
        
        <div id="groupMedia" class="group-media" style="display: none;">
          <div class="media-grid" id="mediaGrid"></div>
        </div>
      </div>
    </div>
  `;
}

export function initGroupView() {
  const container = document.querySelector('.group-view-page');
  groupId = container?.dataset.groupId;

  if (!groupId) {
    Toast.error('Invalid group');
    Router.navigate('groups');
    return;
  }

  loadGroupData();
  setupSocketListeners();

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const tab = this.dataset.tab;
      switchTab(tab);
    });
  });

  // Message input
  const input = document.getElementById('groupMessageInput');
  const sendBtn = document.getElementById('groupSendBtn');

  input.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });

  sendBtn.addEventListener('click', () => sendGroupMessage());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendGroupMessage();
    }
  });

  // Menu button
  document.getElementById('groupMenuBtn').addEventListener('click', showGroupMenu);
}

async function loadGroupData() {
  try {
    const response = await API.get(`/groups/${groupId}`);
    groupData = response.group;
    
    if (!groupData) {
      Toast.error('Group not found');
      Router.navigate('groups');
      return;
    }

    currentUserRole = groupData.userRole || 'member';

    // Update header
    const avatar = document.getElementById('groupAvatar');
    if (groupData.avatar_url) {
      avatar.innerHTML = `<img src="${groupData.avatar_url}" alt="${groupData.name}" />`;
    } else {
      avatar.innerHTML = `<span>${(groupData.name || 'G')[0].toUpperCase()}</span>`;
    }

    document.getElementById('groupName').textContent = groupData.name || 'Unnamed Group';
    document.getElementById('groupMeta').textContent = 
      `${groupData.memberCount || 0} members`;

    // Load members
    await loadMembers();
    
    // Load about
    loadAbout();
    
    // Load messages
    await loadMessages();

  } catch (error) {
    console.error('Load group error:', error);
    Toast.error('Failed to load group');
  }
}

async function loadMembers() {
  try {
    const response = await API.get(`/groups/${groupId}/members`);
    groupMembers = response.members || [];
    renderMembers(groupMembers);
  } catch (error) {
    console.error('Load members error:', error);
  }
}

function renderMembers(members) {
  const container = document.getElementById('membersList');
  
  // Sort by role: owner > admin > moderator > member
  const roleOrder = { owner: 0, admin: 1, moderator: 2, member: 3 };
  const sorted = [...members].sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);

  container.innerHTML = sorted.map(member => `
    <div class="member-item">
      <div class="member-avatar">
        ${member.user?.avatar_url ? 
          `<img src="${member.user.avatar_url}" alt="${member.user.display_name}" />` :
          `<span>${(member.user?.display_name || 'U')[0].toUpperCase()}</span>`
        }
        <span class="member-online ${member.user?.online_status ? 'online' : 'offline'}"></span>
      </div>
      <div class="member-info">
        <span class="member-name">${member.user?.display_name || 'Unknown'}</span>
        <span class="member-role">${getRoleLabel(member.role)}</span>
      </div>
      ${currentUserRole === 'owner' && member.role !== 'owner' ? `
        <div class="member-actions">
          <button class="btn btn-sm btn-secondary" onclick="manageMember('${member.user_id}')">
            Manage
          </button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

function getRoleLabel(role) {
  const labels = {
    owner: '👑 Owner',
    admin: '🛡️ Admin',
    moderator: '⚔️ Moderator',
    member: '👤 Member'
  };
  return labels[role] || role;
}

function loadAbout() {
  const container = document.getElementById('aboutContent');
  container.innerHTML = `
    <div class="about-section">
      <h3>About This Group</h3>
      <p>${groupData.description || 'No description provided'}</p>
    </div>
    <div class="about-section">
      <h3>Group Info</h3>
      <div class="about-item">
        <span class="about-label">Created</span>
        <span>${new Date(groupData.created_at).toLocaleDateString()}</span>
      </div>
      <div class="about-item">
        <span class="about-label">Members</span>
        <span>${groupData.memberCount || 0}</span>
      </div>
      <div class="about-item">
        <span class="about-label">Created By</span>
        <span>${groupData.created_by_name || 'Unknown'}</span>
      </div>
      <div class="about-item">
        <span class="about-label">Join Type</span>
        <span>${groupData.join_type || 'Invite Only'}</span>
      </div>
    </div>
    ${currentUserRole === 'owner' ? `
      <div class="about-section">
        <h3>Management</h3>
        <button class="btn btn-primary" onclick="editGroup()">✎ Edit Group</button>
        <button class="btn btn-danger" onclick="deleteGroup()">🗑️ Delete Group</button>
      </div>
    ` : ''}
    ${currentUserRole !== 'owner' ? `
      <div class="about-section">
        <button class="btn btn-danger" onclick="leaveGroup()">🚪 Leave Group</button>
      </div>
    ` : ''}
  `;
}

async function loadMessages() {
  const container = document.getElementById('groupMessages');
  
  try {
    const response = await API.get(`/groups/${groupId}/messages`);
    const messages = response.messages || [];

    if (messages.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💬</div>
          <h3>No Messages Yet</h3>
          <p>Start the conversation in this group</p>
        </div>
      `;
      return;
    }

    container.innerHTML = messages.map(msg => `
      <div class="message ${msg.sender_id === Auth.getCurrentUser()?.id ? 'sent' : 'received'}">
        <div class="message-content">${msg.content}</div>
        <div class="message-footer">
          <span class="message-sender">${msg.sender?.display_name || 'Unknown'}</span>
          <span class="message-time">${formatTime(msg.created_at)}</span>
        </div>
      </div>
    `).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;

  } catch (error) {
    console.error('Load messages error:', error);
    container.innerHTML = `
      <div class="error-container">
        <p>Failed to load messages</p>
        <button class="btn btn-primary" onclick="loadMessages()">Retry</button>
      </div>
    `;
  }
}

function sendGroupMessage() {
  const input = document.getElementById('groupMessageInput');
  const content = input.value.trim();

  if (!content) {
    Toast.warning('Please enter a message');
    return;
  }

  input.disabled = true;
  document.getElementById('groupSendBtn').disabled = true;

  API.post(`/groups/${groupId}/messages`, { content })
    .then(response => {
      const message = response.message;
      const container = document.getElementById('groupMessages');
      
      // Append message
      const msgDiv = document.createElement('div');
      msgDiv.className = 'message sent';
      msgDiv.innerHTML = `
        <div class="message-content">${message.content}</div>
        <div class="message-footer">
          <span class="message-sender">${Auth.getCurrentUser()?.display_name || 'You'}</span>
          <span class="message-time">Just now</span>
        </div>
      `;
      container.appendChild(msgDiv);
      
      // Remove empty state
      const emptyState = container.querySelector('.empty-state');
      if (emptyState) emptyState.remove();
      
      container.scrollTop = container.scrollHeight;
      input.value = '';
      input.style.height = 'auto';
      
      Toast.success('Message sent');
    })
    .catch(error => {
      Toast.error(error.message || 'Failed to send message');
    })
    .finally(() => {
      input.disabled = false;
      document.getElementById('groupSendBtn').disabled = false;
      input.focus();
    });
}

function switchTab(tab) {
  const sections = ['chat', 'members', 'about', 'media'];
  sections.forEach(s => {
    const el = document.getElementById(`group${s.charAt(0).toUpperCase() + s.slice(1)}`);
    if (el) {
      el.style.display = s === tab ? '' : 'none';
    }
  });
}

function setupSocketListeners() {
  // New message
  Socket.on('new_message', (data) => {
    if (data.chatId === groupId) {
      const container = document.getElementById('groupMessages');
      
      // Remove empty state
      const emptyState = container.querySelector('.empty-state');
      if (emptyState) emptyState.remove();
      
      const msgDiv = document.createElement('div');
      msgDiv.className = `message ${data.message.sender_id === Auth.getCurrentUser()?.id ? 'sent' : 'received'}`;
      msgDiv.innerHTML = `
        <div class="message-content">${data.message.content}</div>
        <div class="message-footer">
          <span class="message-sender">${data.message.sender?.display_name || 'Unknown'}</span>
          <span class="message-time">Just now</span>
        </div>
      `;
      container.appendChild(msgDiv);
      container.scrollTop = container.scrollHeight;
    }
  });

  // Member joined
  Socket.on('member_joined', (data) => {
    if (data.groupId === groupId) {
      Toast.info(`${data.member?.display_name || 'Someone'} joined the group`);
      loadMembers();
    }
  });

  // Member left
  Socket.on('member_left', (data) => {
    if (data.groupId === groupId) {
      Toast.info('A member left the group');
      loadMembers();
    }
  });
}

function showGroupMenu() {
  const menu = document.createElement('div');
  menu.className = 'dropdown-menu glass';
  menu.innerHTML = `
    <button onclick="copyGroupLink()">🔗 Copy Link</button>
    <button onclick="muteGroup()">🔇 Mute Notifications</button>
    ${currentUserRole === 'owner' ? `
      <button onclick="inviteMembers()">📨 Invite Members</button>
    ` : ''}
    <button onclick="reportGroup()">🚨 Report Group</button>
  `;

  const btn = document.getElementById('groupMenuBtn');
  const existing = btn.parentElement.querySelector('.dropdown-menu');
  if (existing) {
    existing.remove();
    return;
  }

  btn.parentElement.appendChild(menu);
  
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (!menu.contains(e.target) && e.target !== btn) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 100);
}

window.copyGroupLink = function() {
  const url = `${window.location.origin}/join/${groupId}`;
  navigator.clipboard.writeText(url).then(() => {
    Toast.success('Group link copied');
  }).catch(() => {
    Toast.info(url);
  });
};

window.muteGroup = function() {
  Toast.info('Group muted');
};

window.inviteMembers = function() {
  Toast.info('Invite feature coming soon');
};

window.reportGroup = function() {
  const reason = prompt('Reason for reporting this group:');
  if (!reason) return;

  API.post(`/reports`, { groupId, reason })
    .then(() => {
      Toast.success('Report submitted');
    })
    .catch(error => {
      Toast.error(error.message || 'Failed to submit report');
    });
};

window.manageMember = function(memberId) {
  // Show manage member options
  const options = ['Make Admin', 'Make Moderator', 'Remove Member'];
  const choice = prompt(`Manage member:\n${options.map((o, i) => `${i+1}. ${o}`).join('\n')}`);
  
  if (!choice) return;

  const actions = {
    '1': 'admin',
    '2': 'moderator',
    '3': 'remove'
  };

  const action = actions[choice];
  if (!action) return;

  if (action === 'remove') {
    if (!confirm('Remove this member from the group?')) return;
    
    API.delete(`/groups/${groupId}/members/${memberId}`)
      .then(() => {
        Toast.success('Member removed');
        loadMembers();
      })
      .catch(error => {
        Toast.error(error.message || 'Failed to remove member');
      });
  } else {
    API.put(`/groups/${groupId}/members/${memberId}`, { role: action })
      .then(() => {
        Toast.success(`Member role updated to ${action}`);
        loadMembers();
      })
      .catch(error => {
        Toast.error(error.message || 'Failed to update role');
      });
  }
};

window.editGroup = function() {
  // Simple edit modal
  const name = prompt('Edit group name:', groupData.name);
  if (name === null) return;
  
  const description = prompt('Edit group description:', groupData.description || '');
  if (description === null) return;

  API.put(`/groups/${groupId}`, { name, description })
    .then(() => {
      Toast.success('Group updated');
      loadGroupData();
    })
    .catch(error => {
      Toast.error(error.message || 'Failed to update group');
    });
};

window.deleteGroup = function() {
  if (!confirm('Delete this group? This cannot be undone!')) return;
  if (!confirm('Are you absolutely sure?')) return;

  API.delete(`/groups/${groupId}`)
    .then(() => {
      Toast.success('Group deleted');
      Router.navigate('groups');
    })
    .catch(error => {
      Toast.error(error.message || 'Failed to delete group');
    });
};

window.leaveGroup = function() {
  if (!confirm('Leave this group?')) return;

  API.post(`/groups/${groupId}/leave`)
    .then(() => {
      Toast.success('Left group');
      Router.navigate('groups');
    })
    .catch(error => {
      Toast.error(error.message || 'Failed to leave group');
    });
};

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Styles
const groupViewStyles = `
.group-view-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-lg);
}

.group-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-md);
  flex-shrink: 0;
  border: 1px solid var(--border-glass);
}

.group-header-info {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex: 1;
}

.group-header-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #8B5CF6, #6D28D9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
  overflow: hidden;
  flex-shrink: 0;
}

.group-header-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.group-header-details {
  display: flex;
  flex-direction: column;
}

.group-header-name {
  font-weight: 600;
  font-size: 16px;
}

.group-header-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

.group-header-actions {
  display: flex;
  gap: var(--space-xs);
}

.group-tabs {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
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

.group-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.group-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.messages-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
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

.message-content {
  font-size: 15px;
  line-height: 1.5;
  word-wrap: break-word;
}

.message-footer {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
  font-size: 11px;
  color: var(--text-muted);
}

.message.sent .message-footer {
  justify-content: flex-end;
}

.message-sender {
  font-weight: 600;
}

.group-input-container {
  display: flex;
  align-items: flex-end;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-lg);
  border-top: 1px solid var(--border-glass);
  flex-shrink: 0;
  margin-top: auto;
}

.group-input-tools {
  display: flex;
  gap: var(--space-xs);
  align-items: center;
}

.group-input-wrapper {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: var(--space-sm);
  background: var(--bg-glass);
  border-radius: var(--radius-md);
  padding: var(--space-xs);
}

.group-input-wrapper textarea {
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

.group-input-wrapper textarea::placeholder {
  color: var(--text-muted);
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  overflow-y: auto;
}

.member-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm);
  background: var(--bg-glass);
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}

.member-item:hover {
  background: var(--bg-glass-hover);
}

.member-avatar {
  position: relative;
  width: 36px;
  height: 36px;
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

.member-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-online {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  border: 2px solid var(--bg-primary);
}

.member-online.online {
  background: #22C55E;
}

.member-online.offline {
  background: var(--text-muted);
}

.member-info {
  flex: 1;
}

.member-name {
  font-weight: 500;
  font-size: 14px;
}

.member-role {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: var(--space-xs);
}

.about-content {
  padding: var(--space-md);
  overflow-y: auto;
}

.about-section {
  margin-bottom: var(--space-xl);
}

.about-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: var(--space-md);
  color: var(--text-secondary);
}

.about-item {
  display: flex;
  justify-content: space-between;
  padding: var(--space-xs) 0;
  border-bottom: 1px solid var(--border-glass);
}

.about-label {
  color: var(--text-secondary);
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
  padding: var(--space-md);
}

.media-grid img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

@media (max-width: 768px) {
  .group-view-page {
    padding: var(--space-md);
  }
  
  .message {
    max-width: 85%;
  }
}

@media (max-width: 480px) {
  .group-header {
    padding: var(--space-sm);
  }
  
  .group-tabs {
    overflow-x: auto;
  }
  
  .tab-btn {
    padding: var(--space-sm) var(--space-md);
    font-size: 13px;
    white-space: nowrap;
  }
  
  .media-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = groupViewStyles;
document.head.appendChild(styleTag);
