/**
 * Notifications Page
 * In-app notifications center
 */
import API from '../utils/api.js';
import { Toast } from '../utils/toast.js';
import { Router } from '../router.js';
import { Socket } from '../utils/socket.js';
import { Store } from '../store.js';

let notifications = [];
let unreadCount = 0;

export function NotificationsPage() {
  return `
    <div class="notifications-page">
      <div class="notifications-header">
        <button class="btn btn-icon" onclick="window.history.back()">
          ←
        </button>
        <h2>Notifications</h2>
        <div class="notifications-actions">
          <button class="btn btn-sm btn-secondary" id="markAllReadBtn">Mark All Read</button>
          <button class="btn btn-icon btn-sm" id="settingsBtn">⚙️</button>
        </div>
      </div>

      <div class="notifications-tabs">
        <button class="tab-btn active" data-tab="all">All</button>
        <button class="tab-btn" data-tab="unread">Unread</button>
        <button class="tab-btn" data-tab="message">💬 Messages</button>
        <button class="tab-btn" data-tab="call">📞 Calls</button>
        <button class="tab-btn" data-tab="group">👥 Groups</button>
        <button class="tab-btn" data-tab="system">⚙️ System</button>
      </div>

      <div class="notifications-list" id="notificationsList">
        <div class="loading-spinner"></div>
      </div>
    </div>
  `;
}

export function initNotifications() {
  loadNotifications();

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const tab = this.dataset.tab;
      filterNotifications(tab);
    });
  });

  // Mark all read
  document.getElementById('markAllReadBtn').addEventListener('click', markAllRead);

  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    Router.navigate('settings');
  });

  // Socket listener for new notifications
  Socket.on('new_notification', (data) => {
    notifications.unshift(data);
    unreadCount++;
    renderNotifications();
    updateBadge();
    Toast.info('New notification');
  });
}

async function loadNotifications() {
  const container = document.getElementById('notificationsList');
  
  try {
    const response = await API.get('/notifications');
    notifications = response.notifications || [];
    unreadCount = response.unreadCount || 0;

    renderNotifications();
    updateBadge();

  } catch (error) {
    console.error('Load notifications error:', error);
    container.innerHTML = `
      <div class="error-container">
        <p>Failed to load notifications</p>
        <button class="btn btn-primary" onclick="loadNotifications()">Retry</button>
      </div>
    `;
  }
}

function renderNotifications(filter = 'all') {
  const container = document.getElementById('notificationsList');
  
  let filtered = notifications;
  
  if (filter === 'unread') {
    filtered = notifications.filter(n => !n.is_read);
  } else if (filter !== 'all') {
    filtered = notifications.filter(n => n.type === filter);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔔</div>
        <h3>No notifications</h3>
        <p>${filter === 'all' ? 'You\'re all caught up!' : 'No notifications in this category'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(notification => `
    <div class="notification-item ${notification.is_read ? '' : 'unread'}" data-id="${notification.id}">
      <div class="notification-icon">${getNotificationIcon(notification.type)}</div>
      <div class="notification-content">
        <div class="notification-title">${notification.title}</div>
        <div class="notification-body">${notification.body || ''}</div>
        <div class="notification-time">${formatTime(notification.created_at)}</div>
      </div>
      <div class="notification-actions">
        ${!notification.is_read ? `
          <button class="btn btn-sm btn-secondary" onclick="markAsRead('${notification.id}')">Mark Read</button>
        ` : ''}
        <button class="btn btn-icon btn-sm" onclick="deleteNotification('${notification.id}')">✕</button>
      </div>
    </div>
  `).join('');

  // Mark visible notifications as read
  const visibleUnread = filtered.filter(n => !n.is_read);
  if (visibleUnread.length > 0) {
    setTimeout(() => {
      visibleUnread.forEach(n => markAsRead(n.id, false));
    }, 3000);
  }
}

function filterNotifications(tab) {
  renderNotifications(tab);
}

function getNotificationIcon(type) {
  const icons = {
    message: '💬',
    call: '📞',
    group: '👥',
    channel: '📢',
    system: '⚙️',
    verification: '✅'
  };
  return icons[type] || '🔔';
}

async function markAsRead(notificationId, showToast = true) {
  try {
    await API.put(`/notifications/${notificationId}/read`);
    
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.is_read = true;
      unreadCount = Math.max(0, unreadCount - 1);
      renderNotifications();
      updateBadge();
      if (showToast) Toast.success('Marked as read');
    }
  } catch (error) {
    console.error('Mark as read error:', error);
  }
}

async function markAllRead() {
  try {
    await API.put('/notifications/read-all');
    
    notifications.forEach(n => n.is_read = true);
    unreadCount = 0;
    renderNotifications();
    updateBadge();
    Toast.success('All notifications marked as read');
  } catch (error) {
    Toast.error('Failed to mark all as read');
  }
}

async function deleteNotification(notificationId) {
  try {
    await API.delete(`/notifications/${notificationId}`);
    
    notifications = notifications.filter(n => n.id !== notificationId);
    renderNotifications();
    Toast.success('Notification deleted');
  } catch (error) {
    Toast.error('Failed to delete notification');
  }
}

function updateBadge() {
  // Update the unread badge in the sidebar
  const badge = document.querySelector('.nav-item[data-page="notifications"] .nav-badge');
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // Update document title
  if (unreadCount > 0) {
    document.title = `(${unreadCount}) NEXORA CHQT`;
  } else {
    document.title = 'NEXORA CHQT';
  }

  // Store unread count
  Store.set('unreadCount', unreadCount);
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

// Styles
const notificationsStyles = `
.notifications-page {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-lg);
}

.notifications-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-md);
}

.notifications-header h2 {
  font-size: 24px;
  font-weight: 700;
  flex: 1;
  margin-left: var(--space-md);
}

.notifications-actions {
  display: flex;
  gap: var(--space-xs);
}

.notifications-tabs {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
  overflow-x: auto;
  padding-bottom: var(--space-xs);
}

.notifications-tabs .tab-btn {
  padding: var(--space-sm) var(--space-lg);
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.notifications-tabs .tab-btn:hover {
  color: var(--text-primary);
}

.notifications-tabs .tab-btn.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-glass);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-glass);
  transition: all var(--transition-fast);
}

.notification-item.unread {
  border-left: 3px solid var(--primary);
  background: var(--bg-glass-hover);
}

.notification-item:hover {
  border-color: var(--border-glass-hover);
}

.notification-icon {
  font-size: 24px;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-glass);
  border-radius: var(--radius-full);
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 2px;
}

.notification-body {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.notification-time {
  font-size: 12px;
  color: var(--text-muted);
}

.notification-actions {
  display: flex;
  gap: var(--space-xs);
  flex-shrink: 0;
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
}

@media (max-width: 480px) {
  .notifications-page {
    padding: var(--space-md);
  }
  
  .notification-item {
    padding: var(--space-sm);
    flex-wrap: wrap;
  }
  
  .notification-actions {
    width: 100%;
    justify-content: flex-end;
    margin-top: var(--space-xs);
  }
  
  .notifications-tabs .tab-btn {
    padding: var(--space-sm) var(--space-md);
    font-size: 13px;
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = notificationsStyles;
document.head.appendChild(styleTag);

// Export for global use
window.markAsRead = markAsRead;
window.deleteNotification = deleteNotification;
