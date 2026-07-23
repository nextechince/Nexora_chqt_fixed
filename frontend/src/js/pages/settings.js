/**
 * Settings Page
 * 20+ settings with categories
 */
import { Auth } from '../utils/auth.js';
import { Toast } from '../utils/toast.js';
import { Router } from '../router.js';
import API from '../utils/api.js';
import { Store } from '../store.js';

export function SettingsPage() {
  const user = Auth.getCurrentUser() || {};
  const settings = Store.get('settings') || {};
  
  return `
    <div class="settings-page">
      <div class="settings-header">
        <button class="btn btn-icon" onclick="window.history.back()">
          ←
        </button>
        <h2>Settings</h2>
      </div>

      <div class="settings-content">
        <!-- Account -->
        <div class="settings-section">
          <h3>Account</h3>
          <div class="settings-list">
            <button class="settings-item" onclick="navigateTo('profile')">
              <span class="settings-icon">👤</span>
              <span class="settings-label">Edit Profile</span>
              <span class="settings-arrow">→</span>
            </button>
            <button class="settings-item" onclick="navigateTo('change-phone')">
              <span class="settings-icon">📱</span>
              <span class="settings-label">Change Phone Number</span>
              <span class="settings-arrow">→</span>
            </button>
            <button class="settings-item" onclick="navigateTo('change-email')">
              <span class="settings-icon">✉️</span>
              <span class="settings-label">Change Email</span>
              <span class="settings-arrow">→</span>
            </button>
            <button class="settings-item" onclick="navigateTo('change-password')">
              <span class="settings-icon">🔒</span>
              <span class="settings-label">Change Password</span>
              <span class="settings-arrow">→</span>
            </button>
            <button class="settings-item" onclick="navigateTo('2fa')">
              <span class="settings-icon">🔐</span>
              <span class="settings-label">Two-Factor Authentication</span>
              <span class="settings-arrow">→</span>
            </button>
            <button class="settings-item" onclick="navigateTo('sessions')">
              <span class="settings-icon">🖥️</span>
              <span class="settings-label">Active Sessions</span>
              <span class="settings-arrow">→</span>
            </button>
            <button class="settings-item" onclick="navigateTo('devices')">
              <span class="settings-icon">📱</span>
              <span class="settings-label">Linked Devices</span>
              <span class="settings-arrow">→</span>
            </button>
            <button class="settings-item" onclick="confirmDeleteAccount()" style="color: #EF4444;">
              <span class="settings-icon">🗑️</span>
              <span class="settings-label">Delete Account</span>
              <span class="settings-arrow">→</span>
            </button>
          </div>
        </div>

        <!-- Notifications -->
        <div class="settings-section">
          <h3>Notifications</h3>
          <div class="settings-list">
            <button class="settings-item" onclick="navigateTo('notifications')">
              <span class="settings-icon">💬</span>
              <span class="settings-label">Message Notifications</span>
              <span class="settings-arrow">→</span>
            </button>
            <button class="settings-item" onclick="navigateTo('notifications')">
              <span class="settings-icon">👥</span>
              <span class="settings-label">Group Notifications</span>
              <span class="settings-arrow">→</span>
            </button>
            <button class="settings-item" onclick="navigateTo('notifications')">
              <span class="settings-icon">📢</span>
              <span class="settings-label">Channel Notifications</span>
              <span class="settings-arrow">→</span>
            </button>
            <button class="settings-item" onclick="navigateTo('notifications')">
              <span class="settings-icon">📞</span>
              <span class="settings-label">Call Notifications</span>
              <span class="settings-arrow">→</span>
            </button>
            <button class="settings-item" onclick="toggleSetting('sound')">
              <span class="settings-icon">🔊</span>
              <span class="settings-label">Sound Settings</span>
              <span class="settings-toggle">${settings.sound ? 'On' : 'Off'}</span>
            </button>
            <button class="settings-item" onclick="toggleSetting('preview')">
              <span class="settings-icon">👁️</span>
              <span class="settings-label">Notification Preview</span>
              <span class="settings-toggle">${settings.preview ? 'On' : 'Off'}</span>
            </button>
            <button class="settings-item" onclick="navigateTo('dnd')">
              <span class="settings-icon">🌙</span>
              <span class="settings-label">Do Not Disturb</span>
              <span class="settings-arrow">→</span>
            </button>
          </div>
        </div>

        <!-- Privacy -->
        <div class="settings-section">
          <h3>Privacy</h3>
          <div class="settings-list">
            <button class="settings-item" onclick="navigateTo('privacy')">
              <span class="settings-icon">🕒</span>
              <span class="settings-label">Last Seen Visibility</span>
              <span class="settings-arrow">→</span>
            </button>
            <button class="settings-item" onclick="navigateTo('privacy')">
              <span class="settings-icon">🖼️</span>
              <span class="settings-label">Profile Photo Visibility</span>
              <span class="settings-arrow">→</span>
            </button>
            <button class="settings-item" onclick="navigateTo('privacy')">
              <span class="settings-icon">📝</span>
              <span class="settings-label">Status Visibility</span>
              <span class="settings-arrow">→</span>
            </button>
            <button class="settings-item" onclick="toggleSetting('readReceipts')">
              <span class="settings-icon">✓</span>
              <span class="settings-label">Read Receipts</span>
              <span class="settings-toggle">${settings.readReceipts ? 'On' : 'Off'}</span>
            </button>
            <button class="settings-item" onclick="toggleSetting('onlineStatus')">
              <span class="settings-icon">🟢</span>
              <span class="settings-label">Online Status</span>
              <span class="settings-toggle">${settings.onlineStatus ? 'On' : 'Off'}</span>
            </button>
          </div>
        </div>

        <!-- Appearance -->
        <div class="settings-section">
          <h3>Appearance</h3>
          <div class="settings-list">
            <button class="settings-item" onclick="toggleTheme()">
              <span class="settings-icon">🌓</span>
              <span class="settings-label">Dark/Light Theme</span>
              <span class="settings-toggle">${settings.theme === 'dark' ? '🌙' : '☀️'}</span>
            </button>
            <button class="settings-item" onclick="navigateTo('accent')">
              <span class="settings-icon">🎨</span>
              <span class="settings-label">Accent Color</span>
              <span class="settings-arrow">→</span>
            </button>
            <button class="settings-item" onclick="navigateTo('wallpaper')">
              <span class="settings-icon">🖼️</span>
              <span class="settings-label">Chat Wallpaper</span>
              <span class="settings-arrow">→</span>
            </button>
            <button class="settings-item" onclick="navigateTo('font')">
              <span class="settings-icon">🔤</span>
              <span class="settings-label">Font Size</span>
              <span class="settings-arrow">→</span>
            </button>
            <button class="settings-item" onclick="navigateTo('bubbles')">
              <span class="settings-icon">💬</span>
              <span class="settings-label">Bubble Style</span>
              <span class="settings-arrow">→</span>
            </button>
          </div>
        </div>

        <!-- Storage -->
        <div class="settings-section">
          <h3>Storage</h3>
          <div class="settings-list">
            <button class="settings-item" onclick="navigateTo('storage')">
              <span class="settings-icon">📥</span>
              <span class="settings-label">Media Auto-Download</span>
              <span class="settings-arrow">→</span>
            </button>
            <button class="settings-item" onclick="showStorageUsage()">
              <span class="settings-icon">💾</span>
              <span class="settings-label">Storage Usage</span>
              <span class="settings-arrow">→</span>
            </button>
            <button class="settings-item" onclick="clearCache()">
              <span class="settings-icon">🧹</span>
              <span class="settings-label">Clear Cache</span>
              <span class="settings-arrow">→</span>
            </button>
            <button class="settings-item" onclick="exportData()">
              <span class="settings-icon">📤</span>
              <span class="settings-label">Export Data</span>
              <span class="settings-arrow">→</span>
            </button>
          </div>
        </div>

        <!-- Blocked Users -->
        <div class="settings-section">
          <h3>Blocked Users</h3>
          <div class="settings-list">
            <button class="settings-item" onclick="navigateTo('blocked')">
              <span class="settings-icon">🚫</span>
              <span class="settings-label">Blocked List</span>
              <span class="settings-arrow">→</span>
            </button>
            <button class="settings-item" onclick="navigateTo('blocked')">
              <span class="settings-icon">➕</span>
              <span class="settings-label">Add to Block List</span>
              <span class="settings-arrow">→</span>
            </button>
          </div>
        </div>

        <!-- Info -->
        <div class="settings-section">
          <h3>Information</h3>
          <div class="settings-list">
            <button class="settings-item" onclick="navigateTo('terms')">
              <span class="settings-icon">📄</span>
              <span class="settings-label">Terms of Service</span>
              <span class="settings-arrow">→</span>
            </button>
            <button class="settings-item" onclick="navigateTo('privacy-policy')">
              <span class="settings-icon">🔏</span>
              <span class="settings-label">Privacy Policy</span>
              <span class="settings-arrow">→</span>
            </button>
            <button class="settings-item" onclick="navigateTo('about')">
              <span class="settings-icon">ℹ️</span>
              <span class="settings-label">About</span>
              <span class="settings-arrow">→</span>
            </button>
            <button class="settings-item" onclick="navigateTo('contact')">
              <span class="settings-icon">📧</span>
              <span class="settings-label">Contact</span>
              <span class="settings-arrow">→</span>
            </button>
            <button class="settings-item" onclick="navigateTo('help')">
              <span class="settings-icon">❓</span>
              <span class="settings-label">Help Center</span>
              <span class="settings-arrow">→</span>
            </button>
          </div>
        </div>

        <div class="settings-version">
          <span>Version 1.0.0</span>
          <span>NEXORA CHQT</span>
        </div>
      </div>
    </div>
  `;
}

export function initSettings() {
  // Load settings
  loadSettings();
}

async function loadSettings() {
  try {
    const settings = await API.get('/users/settings');
    Store.set('settings', settings);
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Navigation helper
window.navigateTo = function(page) {
  Router.navigate(page);
};

// Toggle setting
window.toggleSetting = async function(key) {
  const settings = Store.get('settings') || {};
  settings[key] = !settings[key];
  
  try {
    await API.put('/users/settings', { [key]: settings[key] });
    Store.set('settings', settings);
    Toast.success(`${key} updated`);
    // Refresh settings page
    Router.navigate('settings');
  } catch (error) {
    Toast.error('Failed to update setting');
  }
};

// Toggle theme
window.toggleTheme = function() {
  const settings = Store.get('settings') || {};
  const currentTheme = settings.theme || 'dark';
  settings.theme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', settings.theme);
  localStorage.setItem('theme', settings.theme);
  
  Store.set('settings', settings);
  Toast.success(`Theme changed to ${settings.theme}`);
};

// Delete account confirmation
window.confirmDeleteAccount = function() {
  if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
    if (confirm('All your data will be permanently deleted. Are you absolutely sure?')) {
      deleteAccount();
    }
  }
};

async function deleteAccount() {
  try {
    await API.delete('/users/account');
    Toast.success('Account deleted');
    await Auth.logout();
  } catch (error) {
    Toast.error('Failed to delete account');
  }
}

// Storage usage
window.showStorageUsage = async function() {
  try {
    const data = await API.get('/users/storage');
    Toast.info(`Storage used: ${data.used}MB of ${data.total}MB`);
  } catch (error) {
    Toast.error('Failed to get storage info');
  }
};

// Clear cache
window.clearCache = function() {
  if (confirm('Clear all cached data?')) {
    localStorage.removeItem('store_chats');
    localStorage.removeItem('store_messages');
    Store.set('chats', []);
    Store.set('messages', {});
    Toast.success('Cache cleared');
  }
};

// Export data
window.exportData = async function() {
  try {
    const data = await API.get('/users/export');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexora_data_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.success('Data exported');
  } catch (error) {
    Toast.error('Failed to export data');
  }
};

// Styles
const settingsStyles = `
.settings-page {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-lg);
}

.settings-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.settings-header h2 {
  font-size: 24px;
  font-weight: 700;
}

.settings-section {
  margin-bottom: var(--space-xl);
}

.settings-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: var(--space-md);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  background: var(--bg-glass);
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border-glass);
}

.settings-item {
  display: flex;
  align-items: center;
  padding: var(--space-md) var(--space-lg);
  gap: var(--space-md);
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border-glass);
  color: var(--text-primary);
  transition: all var(--transition-fast);
  width: 100%;
  text-align: left;
  cursor: pointer;
}

.settings-item:last-child {
  border-bottom: none;
}

.settings-item:hover {
  background: var(--bg-glass-hover);
}

.settings-icon {
  font-size: 20px;
  width: 32px;
  flex-shrink: 0;
}

.settings-label {
  flex: 1;
  font-size: 15px;
}

.settings-arrow,
.settings-toggle {
  color: var(--text-secondary);
  font-size: 14px;
}

.settings-version {
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
  padding: var(--space-xl) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

@media (max-width: 480px) {
  .settings-page {
    padding: var(--space-md);
  }
  
  .settings-item {
    padding: var(--space-sm) var(--space-md);
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = settingsStyles;
document.head.appendChild(styleTag);
