/**
 * Calls Page
 * Call history and management
 */
import API from '../utils/api.js';
import { Toast } from '../utils/toast.js';
import { Router } from '../router.js';
import { Auth } from '../utils/auth.js';
import WebRTCManager from '../utils/webrtc.js';

export function CallsPage() {
  return `
    <div class="calls-page">
      <div class="calls-header">
        <button class="btn btn-icon" onclick="window.history.back()">
          ←
        </button>
        <h2>Calls</h2>
        <button class="btn btn-primary btn-sm" id="newCallBtn">
          + New Call
        </button>
      </div>

      <div class="calls-content">
        <div class="calls-list" id="callsList">
          <div class="loading-spinner"></div>
        </div>
      </div>
    </div>
  `;
}

export function initCalls() {
  loadCallHistory();

  document.getElementById('newCallBtn')?.addEventListener('click', () => {
    showNewCallModal();
  });
}

async function loadCallHistory() {
  const container = document.getElementById('callsList');
  
  try {
    const response = await API.get('/calls/history');
    const calls = response.calls || [];

    if (calls.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📞</div>
          <h3>No Call History</h3>
          <p>Your call history will appear here</p>
          <button class="btn btn-primary" onclick="document.getElementById('newCallBtn').click()">
            Start Call
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = calls.map(call => `
      <div class="call-item">
        <div class="call-avatar">
          ${call.participant?.avatar_url ? 
            `<img src="${call.participant.avatar_url}" alt="${call.participant.display_name}" />` :
            `<span>${(call.participant?.display_name || 'U')[0].toUpperCase()}</span>`
          }
        </div>
        <div class="call-info">
          <div class="call-name">${call.participant?.display_name || 'Unknown'}</div>
          <div class="call-details">
            <span class="call-direction ${call.direction}">
              ${call.direction === 'outgoing' ? '📤' : '📥'}
            </span>
            <span class="call-type">${call.type === 'video' ? '📹 Video' : '📞 Voice'}</span>
            <span class="call-status ${call.status}">${call.status}</span>
            ${call.duration_seconds ? `• ${formatDuration(call.duration_seconds)}` : ''}
          </div>
        </div>
        <div class="call-time">
          ${formatDate(call.started_at)}
        </div>
        <div class="call-actions">
          <button class="btn btn-primary btn-sm" onclick="startCall('${call.participant?.id}')">
            📞
          </button>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Failed to load calls:', error);
    container.innerHTML = `
      <div class="error-container">
        <p>Failed to load call history</p>
        <button class="btn btn-primary" onclick="loadCallHistory()">Retry</button>
      </div>
    `;
  }
}

function showNewCallModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content glass">
      <div class="modal-header">
        <h3>Start a Call</h3>
        <button class="modal-close">&times;</button>
      </div>
      <form id="newCallForm">
        <div class="form-group">
          <label>Search Contact</label>
          <input type="text" id="callContactSearch" placeholder="Search by name or username..." />
          <div id="contactSuggestions" class="suggestion-list"></div>
        </div>
        <div class="form-group">
          <label>Call Type</label>
          <select id="callType">
            <option value="voice">📞 Voice Call</option>
            <option value="video">📹 Video Call</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary btn-full">Start Call</button>
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

  // Contact search
  const searchInput = document.getElementById('callContactSearch');
  const suggestionsContainer = document.getElementById('contactSuggestions');
  let selectedContact = null;

  searchInput.addEventListener('input', async function() {
    const query = this.value.trim();
    if (query.length < 2) {
      suggestionsContainer.innerHTML = '';
      return;
    }

    try {
      const response = await API.get('/users/search', { q: query });
      const users = response.users || [];

      suggestionsContainer.innerHTML = users.slice(0, 5).map(user => `
        <div class="suggestion-item" data-id="${user.id}" data-name="${user.display_name}">
          ${user.display_name} (@${user.username})
        </div>
      `).join('');

      // Add click handlers
      suggestionsContainer.querySelectorAll('.suggestion-item').forEach(el => {
        el.addEventListener('click', function() {
          selectedContact = {
            id: this.dataset.id,
            name: this.dataset.name
          };
          searchInput.value = this.dataset.name;
          suggestionsContainer.innerHTML = '';
        });
      });

    } catch (error) {
      console.error('Search error:', error);
    }
  });

  // Form submission
  document.getElementById('newCallForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!selectedContact) {
      Toast.error('Please select a contact');
      return;
    }

    const type = document.getElementById('callType').value;

    try {
      // Check WebRTC support
      if (!WebRTCManager.isSupported()) {
        Toast.error('WebRTC is not supported on this device');
        return;
      }

      const response = await API.post('/calls/initiate', {
        calleeId: selectedContact.id,
        type
      });

      Toast.success('Call initiated');
      modal.remove();

      // Navigate to call view
      Router.navigate('call-view', { id: response.callId });
    } catch (error) {
      Toast.error(error.message || 'Failed to start call');
    }
  });
}

// Start call function
window.startCall = function(userId) {
  if (!userId) return;
  
  Router.navigate('call-start', { id: userId });
};

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Styles
const callsStyles = `
.calls-page {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-lg);
}

.calls-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-xl);
}

.calls-header h2 {
  font-size: 24px;
  font-weight: 700;
}

.calls-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.call-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-glass);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}

.call-item:hover {
  background: var(--bg-glass-hover);
  border-color: var(--border-glass-hover);
}

.call-avatar {
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
  overflow: hidden;
}

.call-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.call-info {
  flex: 1;
  min-width: 0;
}

.call-name {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 2px;
}

.call-details {
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.call-direction.outgoing {
  color: #8B5CF6;
}

.call-direction.incoming {
  color: #22C55E;
}

.call-status.missed {
  color: #EF4444;
}

.call-status.ended {
  color: var(--text-secondary);
}

.call-time {
  font-size: 12px;
  color: var(--text-muted);
}

.call-actions {
  display: flex;
  gap: var(--space-xs);
}

@media (max-width: 480px) {
  .calls-page {
    padding: var(--space-md);
  }
  
  .call-item {
    padding: var(--space-sm);
  }
  
  .call-details {
    font-size: 12px;
    flex-wrap: wrap;
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = callsStyles;
document.head.appendChild(styleTag);
