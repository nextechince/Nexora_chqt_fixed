/**
 * Groups Page
 * List, creation, management
 */
import API from '../utils/api.js';
import { Toast } from '../utils/toast.js';
import { Router } from '../router.js';
import { Auth } from '../utils/auth.js';

export function GroupsPage() {
  return `
    <div class="groups-page">
      <div class="groups-header">
        <button class="btn btn-icon" onclick="window.history.back()">
          ←
        </button>
        <h2>Groups</h2>
        <button class="btn btn-primary btn-sm" id="createGroupBtn">
          + New Group
        </button>
      </div>

      <div class="groups-content">
        <div class="groups-list" id="groupsList">
          <div class="loading-spinner"></div>
        </div>
      </div>
    </div>
  `;
}

export function initGroups() {
  loadGroups();

  document.getElementById('createGroupBtn')?.addEventListener('click', () => {
    showCreateGroupModal();
  });
}

async function loadGroups() {
  const container = document.getElementById('groupsList');
  
  try {
    const response = await API.get('/groups');
    const groups = response.groups || [];

    if (groups.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">👥</div>
          <h3>No Groups Yet</h3>
          <p>Create a group to start collaborating with others</p>
          <button class="btn btn-primary" onclick="document.getElementById('createGroupBtn').click()">
            Create Group
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = groups.map(group => `
      <div class="group-item" onclick="openGroup('${group.id}')">
        <div class="group-avatar">
          ${group.avatar_url ? 
            `<img src="${group.avatar_url}" alt="${group.name}" />` :
            `<span>${(group.name || 'G')[0].toUpperCase()}</span>`
          }
          ${group.memberCount > 0 ? `<span class="group-member-count">${group.memberCount}</span>` : ''}
        </div>
        <div class="group-info">
          <div class="group-name">
            ${group.name || 'Unnamed Group'}
            ${group.role === 'owner' ? '👑' : ''}
          </div>
          <div class="group-meta">
            ${group.memberCount || 0} members
            ${group.lastMessage ? `• ${formatTime(group.lastMessage.created_at)}` : ''}
          </div>
          ${group.lastMessage ? `
            <div class="group-last-message">
              ${group.lastMessage.sender?.display_name || 'User'}: ${group.lastMessage.content || ''}
            </div>
          ` : ''}
        </div>
        <div class="group-actions">
          <button class="btn btn-icon btn-sm" onclick="event.stopPropagation(); openGroup('${group.id}')">
            💬
          </button>
          ${group.role === 'owner' ? `
            <button class="btn btn-icon btn-sm" onclick="event.stopPropagation(); manageGroup('${group.id}')">
              ⚙️
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Failed to load groups:', error);
    container.innerHTML = `
      <div class="error-container">
        <p>Failed to load groups</p>
        <button class="btn btn-primary" onclick="loadGroups()">Retry</button>
      </div>
    `;
  }
}

function showCreateGroupModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content glass">
      <div class="modal-header">
        <h3>Create New Group</h3>
        <button class="modal-close">&times;</button>
      </div>
      <form id="createGroupForm">
        <div class="form-group">
          <label>Group Name *</label>
          <input type="text" id="groupName" placeholder="Enter group name" required maxlength="50" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="groupDescription" placeholder="Describe your group" maxlength="500"></textarea>
        </div>
        <div class="form-group">
          <label>Join Type</label>
          <select id="groupJoinType">
            <option value="public">Public - Anyone can join</option>
            <option value="invite_only" selected>Invite Only - Need invite link</option>
            <option value="private">Private - Admin approval required</option>
          </select>
        </div>
        <div class="form-group">
          <label>Add Members</label>
          <input type="text" id="memberSearch" placeholder="Search for members..." />
          <div id="selectedMembers" class="selected-members"></div>
        </div>
        <button type="submit" class="btn btn-primary btn-full">Create Group</button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  modal.classList.add('show');

  // Close modal
  modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  // Member search
  let selectedMembers = [];
  const searchInput = document.getElementById('memberSearch');
  const selectedContainer = document.getElementById('selectedMembers');

  searchInput.addEventListener('input', async function() {
    const query = this.value.trim();
    if (query.length < 2) return;

    try {
      const response = await API.get('/users/search', { q: query });
      const users = response.users || [];

      // Show suggestions
      const suggestions = users.filter(u => 
        !selectedMembers.find(m => m.id === u.id)
      );

      // Simple suggestion display
      const suggestionList = document.createElement('div');
      suggestionList.className = 'suggestion-list';
      suggestions.slice(0, 5).forEach(user => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = `${user.display_name} (@${user.username})`;
        item.addEventListener('click', () => {
          selectedMembers.push(user);
          updateSelectedMembers();
          searchInput.value = '';
          suggestionList.remove();
        });
        suggestionList.appendChild(item);
      });

      // Remove old suggestions
      const oldList = document.querySelector('.suggestion-list');
      if (oldList) oldList.remove();
      
      if (suggestions.length > 0) {
        searchInput.parentNode.appendChild(suggestionList);
      }

    } catch (error) {
      console.error('Search error:', error);
    }
  });

  function updateSelectedMembers() {
    selectedContainer.innerHTML = selectedMembers.map(m => `
      <span class="member-tag">
        ${m.display_name || m.username}
        <button type="button" onclick="removeMember('${m.id}')">&times;</button>
      </span>
    `).join('');
  }

  // Remove member function
  window.removeMember = function(id) {
    selectedMembers = selectedMembers.filter(m => m.id !== id);
    updateSelectedMembers();
  };

  // Form submission
  document.getElementById('createGroupForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('groupName').value.trim();
    const description = document.getElementById('groupDescription').value.trim();
    const joinType = document.getElementById('groupJoinType').value;

    if (!name) {
      Toast.error('Group name is required');
      return;
    }

    try {
      const response = await API.post('/groups', {
        name,
        description,
        joinType,
        participants: selectedMembers.map(m => m.id)
      });

      Toast.success('Group created successfully!');
      modal.remove();
      loadGroups();
    } catch (error) {
      Toast.error(error.message || 'Failed to create group');
    }
  });
}

// Open group
window.openGroup = function(groupId) {
  Router.navigate('group-view', { id: groupId });
};

// Manage group
window.manageGroup = function(groupId) {
  Router.navigate('group-settings', { id: groupId });
};

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

// Styles
const groupsStyles = `
.groups-page {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-lg);
}

.groups-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-xl);
}

.groups-header h2 {
  font-size: 24px;
  font-weight: 700;
}

.groups-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.group-item {
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

.group-item:hover {
  background: var(--bg-glass-hover);
  border-color: var(--border-glass-hover);
  transform: translateX(4px);
}

.group-avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #8B5CF6, #6D28D9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 18px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.group-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.group-member-count {
  position: absolute;
  bottom: -4px;
  right: -4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  border: 2px solid var(--bg-primary);
}

.group-info {
  flex: 1;
  min-width: 0;
}

.group-name {
  font-weight: 600;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.group-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

.group-last-message {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-actions {
  display: flex;
  gap: var(--space-xs);
}

.selected-members {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-top: var(--space-xs);
}

.member-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 4px 10px;
  background: var(--bg-glass);
  border-radius: var(--radius-full);
  font-size: 13px;
}

.member-tag button {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0 4px;
  font-size: 14px;
}

.member-tag button:hover {
  color: #EF4444;
}

.suggestion-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--bg-secondary);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-md);
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
}

.suggestion-item {
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.suggestion-item:hover {
  background: var(--bg-glass);
}

.empty-state {
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

@media (max-width: 480px) {
  .groups-page {
    padding: var(--space-md);
  }
  
  .group-item {
    padding: var(--space-sm);
  }
  
  .group-name {
    font-size: 14px;
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = groupsStyles;
document.head.appendChild(styleTag);
